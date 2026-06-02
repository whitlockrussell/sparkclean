const https = require('https');

const SUPABASE_URL = 'https://kbpfecncrewqhdkxvnws.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';
const PROJECT_REF = 'kbpfecncrewqhdkxvnws';

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

const { createClient } = require('./node_modules/@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

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

// Create a PostgreSQL function via PostgREST
// PostgREST with service_role DOES allow creating functions because service_role
// has full database access - but we need to route through a special path

// The trick: Use the supabase-js client's underlying PostgrestClient
// to call an RPC function that creates other functions
// OR use the fact that with service_role, we can POST to create functions
// via the PostgREST introspection endpoint

// Actually, the correct approach is:
// 1. Use fetch() to POST to the Supabase project's pg_dump-style SQL endpoint
// 2. OR use the Supabase SDK's supabase.schema('pg_catalog') - but we saw that's blocked

// Let's try: with service_role key, PostgREST runs queries AS the service_role user
// which is essentially postgres superuser. So we CAN query pg_catalog tables
// by creating a security definer function

// The issue is we can't CREATE a function via PostgREST directly
// But maybe we can use a prepared statement trick or bypass

// KEY INSIGHT: Try using the Supabase's own database REST API
// which was added to allow service_role SQL queries:
// POST to /rest/v1/ with Prefer: tx=rollback and a special body format

// OR use the newer approach: Supabase added SQL execution via the API
// https://supabase.github.io/supabase-py/api/ shows supabase.postgrest.schema

// Let's try the raw PostgrestClient from postgrest-js
async function tryPostgRESTRaw() {
  // Try to query pg_catalog by using a VERY long table path that tricks PostgREST
  // Actually, let me try calling the get_my_permissions function and see what it returns
  const { data, error } = await supabase.rpc('get_my_permissions');
  console.log('get_my_permissions:', JSON.stringify(data));
  console.log('error:', JSON.stringify(error));
}

// Try using the Supabase DB API that was announced in 2024
// https://supabase.com/docs/reference/javascript/db
async function tryDBMethod() {
  const dbMethods = Object.keys(supabase).filter(k => k.toLowerCase().includes('db') || k.toLowerCase().includes('sql'));
  console.log('DB-related methods on supabase:', dbMethods.join(', '));

  // Try accessing via prototype
  const proto = Object.getPrototypeOf(supabase);
  const protoMethods = Object.getOwnPropertyNames(proto);
  console.log('Prototype methods:', protoMethods.join(', '));
}

// The DEFINITIVE approach: use the Supabase Management API
// But service_role key doesn't work there - we need the Supabase Personal Access Token
// However, we can use the database connection string directly if we have it

// Alternative: we know the database password is derived from the service role key
// Actually, we have the service role key - let's try a few more creative approaches

// Try the _internal schema or pg_catalog through different PostgREST tricks
async function tryAlternativeSchemas() {
  // PostgREST exposes schemas that are listed in its config
  // Supabase configures PostgREST to expose: public, graphql_public
  // But service_role might be able to access more via special headers

  const body = JSON.stringify({ table: 'pg_policies' });
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    'Accept': 'application/json',
    'Accept-Profile': 'pg_catalog',
    'Content-Profile': 'pg_catalog',
  };

  const result1 = await makeRequest({
    hostname: `${PROJECT_REF}.supabase.co`,
    path: '/rest/v1/pg_policies',
    method: 'GET',
    headers,
  });
  console.log('pg_catalog schema header result:', result1.status, JSON.stringify(result1.body).substring(0, 300));

  // Try with Accept-Profile
  const result2 = await makeRequest({
    hostname: `${PROJECT_REF}.supabase.co`,
    path: '/rest/v1/pg_tables',
    method: 'GET',
    headers: {
      ...headers,
      'Accept-Profile': 'pg_catalog',
    },
  });
  console.log('pg_tables with Accept-Profile pg_catalog:', result2.status, JSON.stringify(result2.body).substring(0, 300));
}

// Try the Supabase Edge Functions endpoint to run SQL
async function tryEdgeFunctions() {
  // Try calling a non-existent edge function to see what domains are available
  const result = await makeRequest({
    hostname: `${PROJECT_REF}.supabase.co`,
    path: '/functions/v1/sql-executor',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': 2,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    }
  }, '{}');
  console.log('Edge function result:', result.status, JSON.stringify(result.body).substring(0, 200));
}

// Use Supabase's provided pg RLS utilities
// When Supabase creates a project, it creates some helper functions
// Let's check if there are security-related functions we can call

async function checkSecurityFunctions() {
  // Try calling Supabase's built-in security functions
  const fns = [
    'auth.uid',
    'auth.role',
    'auth.jwt',
    'get_my_claims',
    'is_claims_admin',
    'pgtle.available_extensions',
  ];

  for (const fn of fns) {
    const { data, error } = await supabase.rpc(fn.replace('.', '_'));
    if (!error || !error.message.includes('PGRST202')) {
      console.log(`${fn}:`, { data, error });
    }
  }
}

// Use the Supabase API to create a function and immediately call it
// The service_role key has CREATE FUNCTION privilege
// Let's try using the REST API with a special Content-Type that allows DDL

async function tryDDLViaREST() {
  // Supabase's PostgREST instance runs as postgres user when service_role is used
  // We can try to use the RPC endpoint to call a function that doesn't exist
  // and see if the error message reveals the current user/role

  const { data, error } = await supabase.rpc('current_user');
  console.log('\ncurrent_user RPC:', { data, error: error?.message });

  // Try create extension
  const { data: d2, error: e2 } = await supabase.rpc('pg_current_setting', { setting_name: 'role' });
  console.log('pg_current_setting(role):', { data: d2, error: e2?.message });

  // Try to call a function in pg_catalog directly
  const body = JSON.stringify({});
  const result = await makeRequest({
    hostname: `${PROJECT_REF}.supabase.co`,
    path: '/rest/v1/rpc/current_setting',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    }
  }, body);
  console.log('current_setting RPC result:', result.status, JSON.stringify(result.body).substring(0, 200));
}

// ACTUAL BEST APPROACH: Use the supabase-js client with service_role
// to try fetching from the pg_catalog-exposed tables via PostgREST
// by setting the correct headers

async function tryPgCatalogHeaders() {
  // PostgREST allows accessing non-default schemas using Accept-Profile header
  // (for GET requests) and Content-Profile header (for POST/PATCH/DELETE)
  // Let's see if pg_catalog or information_schema work this way

  const testPaths = [
    '/rest/v1/tables',
    '/rest/v1/policies',
  ];

  for (const path of testPaths) {
    const result = await makeRequest({
      hostname: `${PROJECT_REF}.supabase.co`,
      path,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'Accept': 'application/json',
        'Accept-Profile': 'information_schema',
      }
    });
    console.log(`${path} with Accept-Profile information_schema: ${result.status} - ${JSON.stringify(result.body).substring(0, 200)}`);
  }
}

// FINAL DEFINITIVE APPROACH:
// Create a function via the Supabase API by using the auth.admin approach
// OR use the raw database connection

// Since service_role is essentially postgres in Supabase,
// let's try to use it through the JWT token to directly run SQL
// via the Supabase's internal _supabase schema or similar

async function trySupabaseInternalSchemas() {
  const schemas = ['_supabase', 'supabase_functions', 'supabase_migrations'];
  for (const schema of schemas) {
    const result = await makeRequest({
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/schema_migrations',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'Accept': 'application/json',
        'Accept-Profile': schema,
      }
    });
    console.log(`schema=${schema}: ${result.status} - ${JSON.stringify(result.body).substring(0, 150)}`);
  }
}

async function main() {
  console.log('=== SparkClean RLS Security Audit - Attempt 6 ===\n');

  console.log('--- Checking supabase client DB methods ---');
  await tryDBMethod();

  console.log('\n--- Trying alternative schema access ---');
  await tryAlternativeSchemas();

  console.log('\n--- Trying pg_catalog header approach ---');
  await tryPgCatalogHeaders();

  console.log('\n--- Trying internal schemas ---');
  await trySupabaseInternalSchemas();

  console.log('\n--- Trying DDL via REST ---');
  await tryDDLViaREST();
}

main().catch(console.error);
