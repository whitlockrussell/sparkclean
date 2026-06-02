// Use pg directly to connect to Supabase PostgreSQL
// Supabase connection strings use the format:
// postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
// The password = SUPABASE_DB_PASSWORD (separate from service role key)

// However, Supabase ALSO supports connecting with the service_role JWT
// as the password for the service_role user via the connection pooler

const { Client } = require('pg');

const PROJECT_REF = 'kbpfecncrewqhdkxvnws';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

// Supabase PostgreSQL connection options
// Direct connection (port 5432) - for servers/long-lived connections
// Connection pooler (port 6543) - for serverless/short-lived

const connectionConfigs = [
  {
    name: 'Direct connection (postgres user via JWT)',
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  },
  {
    name: 'Pooler connection (service_role via JWT)',
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  },
  {
    name: 'Pooler connection session mode (service_role via JWT)',
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 5432,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  },
];

async function tryConnection(config) {
  const { name, ...pgConfig } = config;
  console.log(`\nTrying: ${name}`);
  console.log(`  Host: ${pgConfig.host}:${pgConfig.port}`);

  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('  Connected successfully!');

    // Query 1: Table RLS status
    const tableRLS = await client.query(`
      SELECT tablename, rowsecurity, forcerowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = ANY($1)
      ORDER BY tablename
    `, [TARGET_TABLES]);

    console.log('\n=== TABLE RLS STATUS ===');
    for (const row of tableRLS.rows) {
      const status = row.rowsecurity ? 'ENABLED' : 'DISABLED';
      const forced = row.forcerowsecurity ? ' (FORCED)' : '';
      console.log(`  ${row.tablename}: RLS ${status}${forced}`);
    }

    // Also check for tables that exist but aren't in our target list
    const allTables = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log('\n=== ALL PUBLIC TABLES RLS STATUS ===');
    for (const row of allTables.rows) {
      const status = row.rowsecurity ? 'ENABLED' : 'DISABLED';
      const isTarget = TARGET_TABLES.includes(row.tablename) ? '' : ' (not in target list)';
      console.log(`  ${row.tablename}: RLS ${status}${isTarget}`);
    }

    // Query 2: All policies
    const policies = await client.query(`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);

    console.log('\n=== ALL RLS POLICIES ===');
    if (policies.rows.length === 0) {
      console.log('  No policies found!');
    } else {
      let currentTable = '';
      for (const row of policies.rows) {
        if (row.tablename !== currentTable) {
          currentTable = row.tablename;
          console.log(`\n  Table: ${row.tablename}`);
        }
        console.log(`    Policy: "${row.policyname}"`);
        console.log(`      Command: ${row.cmd}`);
        console.log(`      Permissive: ${row.permissive}`);
        console.log(`      Roles: ${row.roles?.join(', ') || 'none'}`);
        console.log(`      USING (qual): ${row.qual || 'NULL'}`);
        console.log(`      WITH CHECK: ${row.with_check || 'NULL'}`);
      }
    }

    // Check tables in target list that have no policies at all
    const tablesWithPolicies = new Set(policies.rows.map(r => r.tablename));
    const tablesWithRLS = new Set(tableRLS.rows.filter(r => r.rowsecurity).map(r => r.tablename));

    console.log('\n=== SUMMARY ===');
    for (const table of TARGET_TABLES) {
      const rlsEnabled = tablesWithRLS.has(table);
      const hasPolicies = tablesWithPolicies.has(table);
      const policyCount = policies.rows.filter(r => r.tablename === table).length;

      if (!rlsEnabled) {
        console.log(`  ⚠️  ${table}: RLS DISABLED - anyone with the anon key can read/write ALL rows`);
      } else if (!hasPolicies) {
        console.log(`  🔒 ${table}: RLS ENABLED but NO POLICIES - no one can access (deny-all)`);
      } else {
        console.log(`  ✓  ${table}: RLS ENABLED with ${policyCount} polic${policyCount === 1 ? 'y' : 'ies'}`);
      }
    }

    await client.end();
    return true;
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function main() {
  console.log('=== SparkClean RLS Security Audit (via pg) ===\n');
  console.log('Target tables:', TARGET_TABLES.join(', '));

  for (const config of connectionConfigs) {
    const success = await tryConnection(config);
    if (success) break;
  }
}

main().catch(console.error);
