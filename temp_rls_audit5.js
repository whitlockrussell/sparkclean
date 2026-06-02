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

// Use the Supabase REST API with service role to execute SQL
// The key insight: supabase-js v2.106.1 has a `rest` property which is a PostgrestClient
// We can try to access the underlying fetch mechanism

// Strategy: Use the Supabase DB REST API's ability to POST to /rpc/ with
// a function that runs our SQL. We need to CREATE FUNCTION first.
// The service role key SHOULD have CREATE FUNCTION privileges.

// Let's try to create functions via the PostgREST endpoint
// PostgREST doesn't allow DDL directly, but we can try the direct Postgres URL

// Actually, Supabase exposes a special endpoint for running SQL queries
// when authenticated with service role: try the /rest/v1/ with special headers

// Let me try the Supabase's newer SQL execution via the pg REST endpoint
async function trySQLExecution() {
  // Try various Supabase-specific SQL endpoints
  const endpoints = [
    { path: '/pg/query', body: { query: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'" } },
    { path: '/database/query', body: { query: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'" } },
    { path: '/api/v1/query', body: { query: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'" } },
  ];

  for (const endpoint of endpoints) {
    const body = JSON.stringify(endpoint.body);
    const result = await makeRequest({
      hostname: `${PROJECT_REF}.supabase.co`,
      path: endpoint.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    }, body);
    console.log(`  ${endpoint.path}: status ${result.status}, body: ${JSON.stringify(result.body).substring(0, 200)}`);
  }
}

// Try the Supabase DB API directly
async function tryDBAPI() {
  // Supabase exposes a DB API that allows raw SQL queries
  // The endpoint is typically at https://<project-ref>.supabase.co/rest/v1/rpc/<function>
  // But we need to try the direct SQL API

  // Try the newer Supabase SQL endpoint
  const sql = `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'`;
  const body = JSON.stringify({ sql });

  const result = await makeRequest({
    hostname: `${PROJECT_REF}.supabase.co`,
    path: '/pg/sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    }
  }, body);
  console.log('pg/sql result:', result.status, JSON.stringify(result.body).substring(0, 300));
}

// Use the supabase-js client's internal fetch to try calling the pg endpoint
async function tryInternalFetch() {
  const url = `${SUPABASE_URL}/rest/v1/rpc/rls_auto_enable`;
  const body = JSON.stringify({});

  const result = await makeRequest({
    hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
    path: '/rest/v1/rpc/rls_auto_enable',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      'Accept': 'application/json',
    }
  }, body);
  console.log('\nrls_auto_enable result:', result.status, JSON.stringify(result.body).substring(0, 500));
}

// The real approach: we need to create functions using direct database connection
// Since we can't do that, let's use the SUPABASE MANAGEMENT API with personal access token
// But we only have service role key, not personal access token

// Alternative: Use the Supabase's internal RPC endpoint that allows creating functions
// Some Supabase projects have a _pgsodium or other admin schema

// Let's try creating a function via the RPC interface with a special Supabase header
async function tryCreateFunction() {
  // Try using the Supabase admin API endpoint that's separate from PostgREST
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION public.get_rls_audit_tables()
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public
    AS $$
    BEGIN
      RETURN (
        SELECT jsonb_agg(jsonb_build_object(
          'tablename', tablename,
          'rowsecurity', rowsecurity
        ))
        FROM pg_tables
        WHERE schemaname = 'public'
      );
    END;
    $$;
  `;

  // Try using the Supabase realtime or auth admin API
  const body = JSON.stringify({ sql: createFnSQL });

  const paths = [
    '/admin/v1/sql',
    '/rest/v1/sql',
    '/v1/sql',
  ];

  for (const path of paths) {
    const result = await makeRequest({
      hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'x-supabase-admin': SERVICE_ROLE_KEY,
      }
    }, body);
    console.log(`  ${path}: status ${result.status}, body: ${JSON.stringify(result.body).substring(0, 200)}`);
  }
}

// Try the supabase-js SupabaseClient.rest._options.fetch approach
async function trySupabaseRest() {
  // Access the underlying fetch from supabase-js
  const restClient = supabase.rest;
  console.log('rest client type:', typeof restClient);
  console.log('rest client keys:', Object.keys(restClient || {}).join(', '));

  // Try using postgrest-js builder to query a view we might create
  // Actually, let's look at what methods are available
  if (restClient) {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(restClient));
    console.log('rest prototype methods:', methods.join(', '));
  }
}

// Check if there are any existing helpful functions or views
async function checkExistingResources() {
  // From the introspection we saw: rls_auto_enable, get_my_permissions
  // Let's call rls_auto_enable and see what it does/returns
  const { data, error } = await supabase.rpc('rls_auto_enable');
  console.log('\nrls_auto_enable RPC result:');
  console.log('Data:', JSON.stringify(data));
  console.log('Error:', JSON.stringify(error));
}

// Try to check individual tables with RLS by using a special Supabase-provided view
async function checkTableRLSViaSupabase() {
  // Supabase might expose some RLS-related views
  // Let's see what tables/views are accessible via the REST API

  // Try accessing the `_realtime` schema or similar internal schemas
  const schemas = ['extensions', 'auth', 'storage', 'vault', 'realtime'];
  for (const schema of schemas) {
    const { data, error } = await supabase.schema(schema).from('schema_migrations').select('*').limit(1);
    if (!error) {
      console.log(`Schema ${schema} is accessible!`);
    }
  }
}

// FINAL APPROACH: Use the Supabase Management API
// The service role key WON'T work here, but let's verify what we can find
// via the public introspection data

async function getFullOpenAPISpec() {
  const result = await makeRequest({
    hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
    path: '/rest/v1/',
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      'Accept': 'application/openapi+json',
    }
  });

  if (result.status === 200 && result.body) {
    const spec = result.body;
    console.log('\n=== FULL OPENAPI SPEC ANALYSIS ===');
    console.log('All tables/paths:', Object.keys(spec.paths || {}).join(', '));

    // Look at definitions for table structure
    const defs = spec.definitions || spec.components?.schemas || {};
    for (const tableName of TARGET_TABLES) {
      if (defs[tableName]) {
        console.log(`\nTable: ${tableName}`);
        console.log('  Columns:', Object.keys(defs[tableName].properties || {}).join(', '));
      } else {
        console.log(`\nTable: ${tableName} - NOT in API spec (may not exist)`);
      }
    }
  }
}

async function main() {
  console.log('=== SparkClean RLS Security Audit - Attempt 5 ===\n');

  console.log('--- Trying SQL execution endpoints ---');
  await trySQLExecution();

  console.log('\n--- Calling rls_auto_enable ---');
  await checkExistingResources();

  console.log('\n--- Checking internal RPC for rls_auto_enable ---');
  await tryInternalFetch();

  console.log('\n--- Checking REST client ---');
  await trySupabaseRest();

  console.log('\n--- Full OpenAPI Spec Analysis ---');
  await getFullOpenAPISpec();
}

main().catch(console.error);
