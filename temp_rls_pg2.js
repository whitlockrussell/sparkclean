// Try to find the correct Supabase pooler hostname and connect via pg
const { Client } = require('pg');
const https = require('https');

const PROJECT_REF = 'kbpfecncrewqhdkxvnws';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';

// Discover the correct region by looking at the Supabase project info
async function discoverRegion() {
  // The project URL contains the region info
  // kbpfecncrewqhdkxvnws.supabase.co - we need to find the AWS region

  // Try to get info from the Supabase status page or ping endpoint
  return new Promise((resolve) => {
    const req = https.request({
      hostname: `kbpfecncrewqhdkxvnws.supabase.co`,
      path: '/health',
      method: 'GET',
    }, (res) => {
      console.log('Supabase health endpoint:', res.statusCode, res.headers);
      resolve(res.headers);
    });
    req.on('error', (e) => {
      console.log('Health check error:', e.message);
      resolve(null);
    });
    req.end();
  });
}

// Look up the DNS for the db endpoint to find the region
const dns = require('dns').promises;

async function lookupDNS() {
  const hosts = [
    `db.${PROJECT_REF}.supabase.co`,
    `${PROJECT_REF}.supabase.co`,
  ];

  for (const host of hosts) {
    try {
      const addresses = await dns.lookup(host, { all: true });
      console.log(`DNS ${host}:`, addresses.map(a => a.address).join(', '));
    } catch (e) {
      console.log(`DNS ${host}: FAILED - ${e.message}`);
    }
  }

  // Try to look up the pooler hostname from the IP
  // Supabase uses specific regions: us-east-1, us-west-1, eu-west-1, ap-southeast-1, ca-central-1
  try {
    const dbIP = await dns.lookup(`db.${PROJECT_REF}.supabase.co`);
    console.log('\nDatabase IP:', dbIP.address);

    // Try to reverse lookup to find region
    try {
      const reverse = await dns.reverse(dbIP.address);
      console.log('Reverse DNS:', reverse);
    } catch (e) {
      console.log('Reverse DNS failed:', e.message);
    }
  } catch (e) {
    console.log('db lookup failed:', e.message);
  }
}

async function tryConnections() {
  // Based on DNS lookup, try the correct region pooler
  const regions = [
    'ca-central-1',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-central-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
  ];

  // Try direct DB connection first (port 5432)
  console.log('\n--- Trying direct DB connection ---');
  const directClient = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  try {
    await directClient.connect();
    console.log('Direct connection succeeded!');
    await runAudit(directClient);
    await directClient.end();
    return;
  } catch (e) {
    console.log(`Direct connection failed: ${e.message}`);
  }

  // Try each region's pooler
  for (const region of regions) {
    const poolerHost = `aws-0-${region}.pooler.supabase.com`;
    console.log(`\nTrying pooler: ${poolerHost}`);

    const client = new Client({
      host: poolerHost,
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: SERVICE_ROLE_KEY,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      console.log(`Connected via ${poolerHost}!`);
      await runAudit(client);
      await client.end();
      return;
    } catch (e) {
      if (e.message.includes('ENOTFOUND') || e.message.includes('ECONNREFUSED')) {
        console.log(`  Not found`);
      } else {
        console.log(`  Failed: ${e.message}`);
      }
    }
  }
}

async function runAudit(client) {
  const TARGET_TABLES = [
    'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
    'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
  ];

  // Get RLS status for all public tables
  const tableResult = await client.query(`
    SELECT tablename, rowsecurity, forcerowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  console.log('\n=== ALL PUBLIC TABLES - RLS STATUS (from pg_tables) ===');
  for (const row of tableResult.rows) {
    const inTarget = TARGET_TABLES.includes(row.tablename) ? '' : ' [not in target list]';
    console.log(`  ${row.tablename}: rowsecurity=${row.rowsecurity}, forcerowsecurity=${row.forcerowsecurity}${inTarget}`);
  }

  // Get all policies
  const policyResult = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);

  console.log('\n=== ALL RLS POLICIES (pg_policies) ===');
  console.log(`Total policies found: ${policyResult.rows.length}`);
  if (policyResult.rows.length === 0) {
    console.log('  NO POLICIES FOUND - This is a critical security issue!');
  } else {
    let currentTable = '';
    for (const row of policyResult.rows) {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n  ===== Table: ${row.tablename} =====`);
      }
      console.log(`    Policy: "${row.policyname}"`);
      console.log(`      permissive: ${row.permissive}`);
      console.log(`      roles: [${row.roles?.join(', ')}]`);
      console.log(`      cmd: ${row.cmd}`);
      console.log(`      USING (qual): ${row.qual}`);
      console.log(`      WITH CHECK: ${row.with_check}`);
    }
  }
}

async function main() {
  console.log('=== SparkClean RLS Audit via pg - Region Discovery ===\n');
  await lookupDNS();
  await discoverRegion();
  await tryConnections();
}

main().catch(console.error);
