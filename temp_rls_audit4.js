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

// Strategy: Create a temporary Postgres function that queries pg_catalog,
// then call it via RPC, then drop it.
// The service_role has the necessary privileges to create functions.

// Step 1: Create a function to get RLS table status
const CREATE_TABLE_RLS_FN = `
CREATE OR REPLACE FUNCTION public.audit_rls_table_status()
RETURNS TABLE(tablename text, rowsecurity boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.tablename::text, t.rowsecurity
  FROM pg_catalog.pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;
`;

// Step 2: Create a function to get all policies
const CREATE_POLICIES_FN = `
CREATE OR REPLACE FUNCTION public.audit_rls_policies()
RETURNS TABLE(
  schemaname text,
  tablename text,
  policyname text,
  permissive text,
  roles text[],
  cmd text,
  qual text,
  with_check text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.schemaname::text,
    p.tablename::text,
    p.policyname::text,
    p.permissive::text,
    p.roles::text[],
    p.cmd::text,
    p.qual::text,
    p.with_check::text
  FROM pg_catalog.pg_policies p
  WHERE p.schemaname = 'public'
  ORDER BY p.tablename, p.policyname;
END;
$$;
`;

const DROP_TABLE_RLS_FN = `DROP FUNCTION IF EXISTS public.audit_rls_table_status();`;
const DROP_POLICIES_FN = `DROP FUNCTION IF EXISTS public.audit_rls_policies();`;

// We need to execute DDL - try using a function that might already exist
// OR use the Supabase REST API's ability to call Postgres functions

// Since we can't run DDL directly via PostgREST, let's check if there's
// a way to use the supabase-js admin client to run raw SQL

// Check if supabase-js has a sql() method
async function checkClientCapabilities() {
  console.log('supabase client type:', typeof supabase);
  console.log('supabase.rpc:', typeof supabase.rpc);
  // Check newer versions of supabase-js that have .sql() or .from().sql()
  const keys = Object.getOwnPropertyNames(supabase);
  console.log('client properties:', keys.join(', '));

  // Check if there's a raw SQL method
  if (typeof supabase.sql === 'function') {
    console.log('supabase.sql() is available!');
    return true;
  }
  return false;
}

async function trySQLMethod() {
  if (typeof supabase.sql === 'function') {
    const result = await supabase.sql`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`;
    return result;
  }
  return null;
}

// Try the newer supabase-js v2 approach
async function checkVersion() {
  try {
    const pkg = require('./node_modules/@supabase/supabase-js/package.json');
    console.log('supabase-js version:', pkg.version);
  } catch (e) {
    console.log('Could not read package.json:', e.message);
  }
}

// Alternative: Use Supabase's Edge Functions API if available,
// or use the project's database URL directly

// Actually, let's try a completely different approach:
// Use the Supabase admin API that DOES work with service role key
// The /auth/v1/admin endpoints work, but we need /v1/projects/{ref}/database/...
// which requires a PERSONAL ACCESS TOKEN, not service role key

// Last resort: Try to use the pg functions that Supabase creates by default
// and see what's available in the public schema

async function listPublicFunctions() {
  // We know get_my_permissions exists - query it to understand the data
  const { data, error } = await supabase.rpc('get_my_permissions');
  console.log('get_my_permissions data:', JSON.stringify(data));
  console.log('get_my_permissions error:', JSON.stringify(error));
}

// Try the PostgREST schema introspection API
async function introspect() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'Accept': 'application/openapi+json',
      }
    }, (res) => {
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
    req.end();
  });
}

async function main() {
  await checkVersion();

  console.log('\n--- Checking client capabilities ---');
  await checkClientCapabilities();

  console.log('\n--- Trying sql() method ---');
  const sqlResult = await trySQLMethod();
  if (sqlResult) {
    console.log('sql() result:', JSON.stringify(sqlResult).substring(0, 500));
  } else {
    console.log('sql() method not available');
  }

  console.log('\n--- Listing public functions ---');
  await listPublicFunctions();

  console.log('\n--- PostgREST introspection ---');
  const introResult = await introspect();
  console.log('Status:', introResult.status);
  if (introResult.body && introResult.body.paths) {
    const paths = Object.keys(introResult.body.paths);
    console.log('Available paths (first 50):');
    paths.slice(0, 50).forEach(p => console.log(' ', p));
    console.log(`... total ${paths.length} paths`);

    // Find RPC paths
    const rpcPaths = paths.filter(p => p.startsWith('/rpc/'));
    console.log('\nRPC functions available:', rpcPaths.map(p => p.replace('/rpc/', '')).join(', '));
  } else {
    console.log('Response:', JSON.stringify(introResult.body).substring(0, 1000));
  }
}

main().catch(console.error);
