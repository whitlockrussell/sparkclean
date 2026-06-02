const https = require('https');

const SUPABASE_URL = 'https://kbpfecncrewqhdkxvnws.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Query via PostgREST RPC - call a built-in function or use the SQL endpoint
// Supabase exposes a SQL endpoint at /rest/v1/sql for service role
async function querySQL(sql) {
  const body = JSON.stringify({ query: sql });
  const result = await makeRequest({
    hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
    path: '/rest/v1/sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      'Accept': 'application/json',
    }
  }, body);
  return result;
}

// Try the new Supabase SQL API
async function querySQLNew(sql) {
  const body = sql; // plain text
  const result = await makeRequest({
    hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
    path: '/rest/v1/sql',
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(body),
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    }
  }, body);
  return result;
}

// Try Management API
async function queryManagement(path) {
  const result = await makeRequest({
    hostname: 'api.supabase.com',
    path: path,
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    }
  });
  return result;
}

// Use the Supabase DB REST API - try selecting from information_schema views
async function queryInfoSchema(view, filter) {
  const path = `/rest/v1/${view}${filter ? '?' + filter : ''}`;
  const result = await makeRequest({
    hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
    path: path,
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      'Accept': 'application/json',
    }
  });
  return result;
}

// Try using the Management API v1 for policies
async function queryMgmtPolicies() {
  return queryManagement('/v1/projects/kbpfecncrewqhdkxvnws/database/policies');
}

async function queryMgmtTables() {
  return queryManagement('/v1/projects/kbpfecncrewqhdkxvnws/database/tables');
}

// Try direct PostgreSQL REST endpoint for pg_policies
async function queryPGPolicies() {
  const tableList = TARGET_TABLES.map(t => `"${t}"`).join(',');
  const filter = `schemaname=eq.public&tablename=in.(${TARGET_TABLES.join(',')})`;
  return queryInfoSchema('pg_policies', filter);
}

async function queryPGTables() {
  const filter = `schemaname=eq.public&tablename=in.(${TARGET_TABLES.join(',')})`;
  return queryInfoSchema('pg_tables', filter);
}

async function main() {
  console.log('=== SparkClean RLS Security Audit ===\n');

  // Test 1: Direct REST query on pg_tables
  console.log('--- Test 1: pg_tables via PostgREST ---');
  const t1 = await queryPGTables();
  console.log('Status:', t1.status);
  console.log('Response:', JSON.stringify(t1.body).substring(0, 300));

  // Test 2: Direct REST query on pg_policies
  console.log('\n--- Test 2: pg_policies via PostgREST ---');
  const t2 = await queryPGPolicies();
  console.log('Status:', t2.status);
  console.log('Response:', JSON.stringify(t2.body).substring(0, 300));

  // Test 3: SQL endpoint (JSON body)
  console.log('\n--- Test 3: /rest/v1/sql endpoint ---');
  const t3 = await querySQL('SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\'');
  console.log('Status:', t3.status);
  console.log('Response:', JSON.stringify(t3.body).substring(0, 500));

  // Test 4: Management API tables
  console.log('\n--- Test 4: Management API tables ---');
  const t4 = await queryMgmtTables();
  console.log('Status:', t4.status);
  console.log('Response:', JSON.stringify(t4.body).substring(0, 500));

  // Test 5: Management API policies
  console.log('\n--- Test 5: Management API policies ---');
  const t5 = await queryMgmtPolicies();
  console.log('Status:', t5.status);
  console.log('Response:', JSON.stringify(t5.body).substring(0, 500));

  // Test 6: Try using @supabase/supabase-js
  console.log('\n--- Test 6: @supabase/supabase-js ---');
  try {
    const { createClient } = require('./node_modules/@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Try rpc call
    const { data, error } = await supabase.rpc('version');
    console.log('RPC version result:', { data, error });
  } catch (e) {
    console.log('supabase-js error:', e.message);
  }
}

main().catch(console.error);
