// Strategy: Use the Supabase PostgREST endpoint to create a helper function
// Service_role runs queries as the "service_role" PostgreSQL role
// But PostgREST DOES support running the actual postgres superuser role
// when the service_role key is used - this depends on Supabase's configuration

// The KEY INSIGHT we've been missing:
// Supabase's PostgREST does NOT run DDL - it's a REST API for DML only
// To create functions, we need the direct DB connection or Management API

// However, there IS a way to inspect RLS through the API:
// 1. Try to SELECT * from a table with different user tokens
//    If RLS is enabled and we get data with service_role but not with anon,
//    that tells us something
// 2. Use the supabase-js client to query existing tables and check behavior

// But actually, the SIMPLEST approach that should work:
// Supabase's OWN RLS policy checker
// The "rls_auto_enable" function we found is an event trigger that auto-enables RLS
// Let's check if there are any policies by trying to do things that policies would block

// ACTUAL WORKING APPROACH:
// Use the Supabase's PostgREST endpoint to run a query against a function
// we create using a Migration-style approach

// But let me try one more thing: the Supabase's pg REST API
// which is different from the PostgREST API

const https = require('https');

const PROJECT_REF = 'kbpfecncrewqhdkxvnws';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

function makeRequest(hostname, path, method, headers, bodyStr) {
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
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const { createClient } = require('./node_modules/@supabase/supabase-js');
const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Approach: Try fetching with the anon key to see which tables are accessible
// vs accessible with service_role
// This tells us about RLS (but not policy expressions)

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NjIzNzksImV4cCI6MjA5NTIzODM3OX0.sL67SMcXI0L6YLu9LSDPmkElK1whKetWF9TWrUh8qvQ';

const supabaseAnon = createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY, {
  auth: { persistSession: false }
});

async function testTableAccess() {
  console.log('=== Testing table access with service_role vs anon ===\n');
  console.log('This tells us which tables have RLS configured correctly\n');

  for (const table of TARGET_TABLES) {
    // Test with service_role (bypasses RLS)
    const { data: srData, error: srError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    // Test with anon key (subject to RLS)
    const { data: anonData, error: anonError, count: anonCount } = await supabaseAnon
      .from(table)
      .select('*', { count: 'exact', head: true });

    const srStatus = srError ? `ERROR: ${srError.message}` : `OK (can access)`;
    const anonStatus = anonError ? `ERROR: ${anonError.code} - ${anonError.message}` : `OK (accessible without auth!)`;

    console.log(`Table: ${table}`);
    console.log(`  Service Role: ${srStatus}`);
    console.log(`  Anon Key: ${anonStatus}`);

    if (!anonError) {
      console.log(`  ⚠️  WARNING: Table accessible without authentication!`);
    }
    console.log('');
  }
}

// Try to create the audit function using PostgREST's ability to call functions
// that perform DDL via SECURITY DEFINER
// We'll use the existing "rls_auto_enable" function as a model
// Actually, let's see if we can USE existing functions to get data

// Try calling various Supabase utility functions
async function tryBuiltinFunctions() {
  console.log('=== Trying built-in Supabase functions ===\n');

  // These are functions that Supabase might create
  const functions = [
    { name: 'get_my_claims', params: {} },
    { name: 'requesting_user_id', params: {} },
    { name: 'auth_user_id', params: {} },
    { name: 'uid', params: {} },
  ];

  for (const fn of functions) {
    const { data, error } = await supabase.rpc(fn.name, fn.params);
    if (!error?.message?.includes('PGRST202')) {
      console.log(`${fn.name}:`, { data, error: error?.message });
    }
  }
}

// The final approach that SHOULD work based on Supabase documentation:
// Use the Supabase Management REST API with service_role for project-level operations
// Check if there's a way to authenticate the management API with service_role

async function checkManagementAPIAuth() {
  // Try different authentication formats for the Management API
  const endpoints = [
    {
      name: 'Management API with Bearer service_role',
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}`,
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      }
    },
    {
      name: 'Management API table policies endpoint',
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/policies`,
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    },
  ];

  for (const ep of endpoints) {
    try {
      const result = await makeRequest(ep.hostname, ep.path, 'GET', ep.headers);
      console.log(`${ep.name}: ${result.status}`);
      if (result.status === 200) {
        console.log('SUCCESS! Response:', JSON.stringify(result.body).substring(0, 500));
      } else {
        console.log('Response:', JSON.stringify(result.body).substring(0, 200));
      }
    } catch (e) {
      console.log(`${ep.name}: ERROR - ${e.message}`);
    }
  }
}

// Query the existing Supabase functions RPC to see what we can introspect
async function getRPCFunctionList() {
  // PostgREST OpenAPI spec was already fetched - we know rls_auto_enable and get_my_permissions exist
  // Let's try to find if there are any functions that expose pg_catalog data

  // Try calling functions that might exist in Supabase projects
  const functionTests = [
    'supabase_functions_listing',
    'get_rls_policies',
    'audit_log',
    'check_rls',
    'rls_check',
    'pg_stat_user_tables',
  ];

  for (const fnName of functionTests) {
    const { data, error } = await supabase.rpc(fnName);
    if (error?.code !== 'PGRST202') {
      console.log(`${fnName}:`, { data: JSON.stringify(data)?.substring(0, 200), error: error?.message });
    }
  }
}

// Use the supabase-js RPC to create and then call a helper function
// This requires DDL which PostgREST doesn't support
// BUT: we can TRY to call a Postgres function via the RPC endpoint
// with a specially crafted function name that includes DDL

// ALTERNATIVE FINAL APPROACH:
// We know the tables exist (from OpenAPI spec)
// We know the service_role can bypass RLS
// Let's empirically test each table with both roles and infer RLS status

async function empiricalRLSTest() {
  console.log('\n=== EMPIRICAL RLS ANALYSIS ===\n');
  console.log('Method: Comparing service_role vs anon access to determine RLS status');
  console.log('Note: Cannot get exact policy SQL without direct DB access\n');

  // Try to insert a test record (that we immediately delete)
  // to check INSERT policies
  // This is safe because we use a unique test value and delete it

  for (const table of TARGET_TABLES) {
    // Get count with service_role
    const { count: srCount, error: srError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    // Get count with anon (no auth)
    const { count: anonCount, error: anonError } = await supabaseAnon
      .from(table)
      .select('*', { count: 'exact', head: true });

    let analysis = '';

    if (srError) {
      analysis = `SERVICE_ROLE_ERROR: ${srError.message}`;
    } else if (anonError) {
      if (anonError.code === '42501') {
        analysis = `RLS: Likely ENABLED - anon denied (permission denied)`;
      } else if (anonError.code === 'PGRST301') {
        analysis = `RLS: Likely ENABLED - JWT required`;
      } else {
        analysis = `ANON_ERROR: ${anonError.code} - ${anonError.message}`;
      }
    } else {
      // Both succeed - either RLS is off or there's a public policy
      if (srCount !== null && anonCount !== null) {
        if (anonCount === 0) {
          analysis = `RLS: Possibly ENABLED (anon sees 0 rows, service_role sees ${srCount} rows)`;
        } else {
          analysis = `⚠️  POSSIBLE RLS ISSUE: Anon can see ${anonCount} rows (service_role: ${srCount})`;
        }
      } else {
        analysis = `Both accessible - anon count: ${anonCount}, sr count: ${srCount}`;
      }
    }

    console.log(`${table}: ${analysis}`);
  }
}

async function main() {
  await testTableAccess();
  await checkManagementAPIAuth();
}

main().catch(console.error);
