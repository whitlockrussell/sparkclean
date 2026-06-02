const https = require('https');

const SUPABASE_URL = 'https://kbpfecncrewqhdkxvnws.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

const { createClient } = require('./node_modules/@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function callRPC(fnName, params = {}) {
  const { data, error } = await supabase.rpc(fnName, params);
  return { data, error };
}

// Create helper functions using Supabase's ability to run DDL through the admin client
// We'll use the REST API to POST to /rest/v1/rpc with a raw SQL function we create first

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

// Try the Supabase Edge Functions or direct DB connection isn't possible
// Let's try creating a function via RPC that queries pg_tables
// First, let's see what RPC functions exist
async function listFunctions() {
  // Query pg_proc via information_schema
  const { data, error } = await supabase
    .from('information_schema.routines')
    .select('routine_name, routine_type')
    .eq('routine_schema', 'public');
  return { data, error };
}

// Supabase service role can bypass RLS and query special views exposed in the API
// Let's check what schemas/tables are actually exposed
async function queryDBViaFetch(sql) {
  // Try the Supabase-specific SQL endpoint that was added in newer versions
  // This endpoint exists at /rest/v1/sql in newer Supabase versions when accessed with service_role
  const body = JSON.stringify({ query: sql });

  // Try different content types and paths
  const paths = [
    '/rest/v1/sql',
    '/api/sql',
    '/db/sql',
  ];

  for (const path of paths) {
    const result = await makeRequest({
      hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      }
    }, body);
    console.log(`  Path ${path}: status ${result.status}`);
    if (result.status !== 404) {
      return result;
    }
  }
  return null;
}

// Try calling the get_my_permissions function that was hinted
async function tryGetPermissions() {
  return callRPC('get_my_permissions');
}

// Check if there's a way to query pg_catalog via a view
async function checkSchemas() {
  // Try querying via supabase-js with different schemas
  const { data, error } = await supabase
    .schema('information_schema')
    .from('tables')
    .select('table_name, table_schema')
    .eq('table_schema', 'public');
  return { data, error };
}

// Use the supabase-js with raw PostgreSQL function calls
// The service role key bypasses RLS, so we can access pg_catalog if we create a function
// Let's try calling existing utility functions

async function tryRawQuery() {
  // Try using the PostgREST's support for stored procedures to execute arbitrary SQL
  // We need to use the service_role which has superuser-like access

  // First, let's try to create a temporary function
  // Actually, let's see if there's already a function that can help us

  // Try get_my_permissions (hinted by PostgREST)
  const perm = await callRPC('get_my_permissions');
  console.log('get_my_permissions:', JSON.stringify(perm).substring(0, 200));

  // Try to use supabase's built-in execute_sql if it exists
  const execSql = await callRPC('execute_sql', { sql_query: 'SELECT 1' });
  console.log('execute_sql:', JSON.stringify(execSql).substring(0, 200));

  // Try version()
  const ver = await callRPC('pg_version');
  console.log('pg_version:', JSON.stringify(ver).substring(0, 200));
}

// The real approach: use the Supabase management API with a personal access token
// OR use the fact that service_role can access any table - let's try to query
// the pg_catalog schema tables directly via supabase-js schema() method

async function queryPGCatalog() {
  // Try pg_policies in pg_catalog schema
  const { data: policies, error: polError } = await supabase
    .schema('pg_catalog')
    .from('pg_policies')
    .select('*');

  console.log('\npg_catalog.pg_policies via schema():');
  console.log('Error:', polError);
  console.log('Data count:', policies?.length);
  if (policies?.length > 0) {
    console.log('Sample:', JSON.stringify(policies[0]));
  }

  // Try pg_tables
  const { data: tables, error: tblError } = await supabase
    .schema('pg_catalog')
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public');

  console.log('\npg_catalog.pg_tables via schema():');
  console.log('Error:', tblError);
  console.log('Data:', JSON.stringify(tables));
}

// Try the information_schema
async function queryInfoSchema() {
  const { data, error } = await supabase
    .schema('information_schema')
    .from('tables')
    .select('table_name')
    .eq('table_schema', 'public');

  console.log('\ninformation_schema.tables:');
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data)?.substring(0, 500));
}

async function main() {
  console.log('=== SparkClean RLS Security Audit - Attempt 3 ===\n');

  // Check what hint function exists
  console.log('--- Checking existing RPC functions ---');
  await tryRawQuery();

  console.log('\n--- Querying pg_catalog schema ---');
  await queryPGCatalog();

  console.log('\n--- Querying information_schema ---');
  await queryInfoSchema();

  console.log('\n--- Trying SQL endpoint ---');
  const sqlResult = await queryDBViaFetch('SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\'');
  if (sqlResult) {
    console.log('SQL endpoint response:', JSON.stringify(sqlResult?.body).substring(0, 500));
  }
}

main().catch(console.error);
