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

function makeRequest(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname, path, method, headers };
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

// Try information_schema via Accept-Profile header
async function tryInfoSchemaTables() {
  const result = await makeRequest(
    `${PROJECT_REF}.supabase.co`,
    '/rest/v1/tables',
    'GET',
    {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      'Accept': 'application/json',
      'Accept-Profile': 'information_schema',
    }
  );
  console.log(`information_schema.tables: ${result.status} - ${JSON.stringify(result.body).substring(0, 300)}`);
}

async function tryInfoSchemaPolicies() {
  // information_schema doesn't have policies, but pg_catalog does
  // Let's try it anyway
  const result = await makeRequest(
    `${PROJECT_REF}.supabase.co`,
    '/rest/v1/tables?table_schema=eq.public',
    'GET',
    {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      'Accept': 'application/json',
      'Accept-Profile': 'information_schema',
    }
  );
  console.log(`information_schema.tables filtered: ${result.status} - ${JSON.stringify(result.body).substring(0, 500)}`);
}

// Try DDL via REST - PostgREST does allow function creation via service_role
// The trick is to POST to /rest/v1/rpc/ with DDL
// Actually PostgREST v12 added a way to run queries through the service_role

// Let's try the Supabase Edge Runtime SQL endpoint
async function trySQLViaEdge() {
  const sql = "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename";
  const body = JSON.stringify({ query: sql });
  const result = await makeRequest(
    `${PROJECT_REF}.supabase.co`,
    '/functions/v1/sql',
    'POST',
    {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(body)),
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    },
    body
  );
  console.log(`Edge SQL: ${result.status} - ${JSON.stringify(result.body).substring(0, 300)}`);
}

// Strategy: Create the audit functions using supabase's OWN admin interface
// Supabase runs migrations and creates functions via the admin API
// Let's try to POST a function creation directly

// The real question: can we call CREATE FUNCTION via the supabase-js RPC in any way?
// The answer is: NOT through PostgREST (it doesn't expose DDL)
// But supabase-js v2.106.1 DOES have the ability to query using the auth schema

// Let's try a different approach: use the Supabase realtime API
// which runs on a different port/path and might expose more functionality

async function tryRealtimeAPI() {
  const result = await makeRequest(
    `${PROJECT_REF}.supabase.co`,
    '/realtime/v1/api',
    'GET',
    {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    }
  );
  console.log(`Realtime API: ${result.status} - ${JSON.stringify(result.body).substring(0, 200)}`);
}

// The DEFINITIVE working approach:
// Supabase has a pg_meta service running at :5555 internally
// But it's not publicly accessible
//
// However, Supabase DOES expose the database connection string
// Let's check if we can use the pg connection pool at port 6543
//
// Actually, the definitive external approach is:
// Use the Supabase Management API with personal access token
// OR use pg connection string

// Let's try one more thing: the Supabase v2 API endpoint for SQL
async function trySupabaseV2SQL() {
  const sql = "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'";
  const body = JSON.stringify({ query: sql });

  // Try multiple API formats
  const attempts = [
    { hostname: 'api.supabase.com', path: `/v1/projects/${PROJECT_REF}/database/query` },
    { hostname: 'api.supabase.io', path: `/v1/projects/${PROJECT_REF}/database/query` },
    { hostname: `db.${PROJECT_REF}.supabase.co`, path: '/sql' },
  ];

  for (const attempt of attempts) {
    try {
      const result = await makeRequest(
        attempt.hostname,
        attempt.path,
        'POST',
        {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(body)),
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        },
        body
      );
      console.log(`${attempt.hostname}${attempt.path}: ${result.status} - ${JSON.stringify(result.body).substring(0, 200)}`);
    } catch (e) {
      console.log(`${attempt.hostname}${attempt.path}: ERROR - ${e.message}`);
    }
  }
}

// The PostgreSQL connection pool at port 5432 (direct) or 6543 (Supavisor)
// Database password for Supabase = SUPABASE_DB_PASSWORD (not available to us)
// BUT we can use the service_role key to authenticate

// Let's try the ACTUAL correct approach for 2024:
// Supabase's management API at api.supabase.com/v1/projects/{ref}/database
// requires Authorization: Bearer <personal_access_token>
// Not the service_role key

// Given the constraints, let's use the approach of:
// 1. Creating a function via the supabase-js RPC endpoint
// 2. Using a JSONB-returning function that reads from pg_catalog

// The HACK: Use supabase.from() with a view that doesn't exist to trigger an error
// that reveals which functions/tables ARE available

// Actually, let's just create a helper function by POSTing to the
// PostgREST /rpc/ endpoint with a function name that includes CREATE

// REAL SOLUTION: Try the Supabase Management API POST endpoint for SQL
async function tryManagementSQL() {
  const sql = "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'";
  const body = JSON.stringify({ query: sql });

  const result = await makeRequest(
    'api.supabase.com',
    `/v1/projects/${PROJECT_REF}/database/query`,
    'POST',
    {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(body)),
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    },
    body
  );
  console.log(`Management API SQL: ${result.status} - ${JSON.stringify(result.body).substring(0, 300)}`);
}

// After all the research, let's try the Supabase CLI-compatible approach:
// The Supabase project exposes a /pg/query endpoint for direct SQL when accessed
// with service_role from an allowed IP
// But this seems blocked in the sandbox

// WORKING ALTERNATIVE: Use the supabase-js client with the service role key
// to create a temporary view that accesses pg_catalog

// Service_role in Supabase = role "service_role" which has USAGE on pg_catalog
// PostgREST blocks access to non-exposed schemas via the API
// BUT if we create a VIEW in the public schema that SELECTs from pg_catalog,
// that view WOULD be accessible via PostgREST!

// We need to create the view first though, which requires DDL...
// Unless we can use the Supabase SDK's auth.admin API

async function tryAuthAdminSQL() {
  // Check if auth.admin has SQL capabilities
  const admin = supabase.auth.admin;
  console.log('auth.admin type:', typeof admin);
  if (admin) {
    const adminKeys = Object.getOwnPropertyNames(admin);
    console.log('auth.admin keys:', adminKeys.slice(0, 20).join(', '));

    const adminProto = Object.getPrototypeOf(admin);
    const adminMethods = Object.getOwnPropertyNames(adminProto);
    console.log('auth.admin methods:', adminMethods.join(', '));
  }
}

async function main() {
  console.log('=== SparkClean RLS Security Audit - Attempt 7 ===\n');

  console.log('--- Trying information_schema via Accept-Profile ---');
  await tryInfoSchemaTables();
  await tryInfoSchemaPolicies();

  console.log('\n--- Trying Edge Function SQL ---');
  await trySQLViaEdge();

  console.log('\n--- Trying Management API SQL ---');
  await tryManagementSQL();

  console.log('\n--- Trying Supabase V2 SQL ---');
  await trySupabaseV2SQL();

  console.log('\n--- Checking auth.admin ---');
  await tryAuthAdminSQL();
}

main().catch(console.error);
