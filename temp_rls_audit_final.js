// Final comprehensive RLS audit
// Since we can't get exact SQL policy expressions without direct DB access,
// we'll do a thorough empirical test

const https = require('https');

const PROJECT_REF = 'kbpfecncrewqhdkxvnws';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NjIzNzksImV4cCI6MjA5NTIzODM3OX0.sL67SMcXI0L6YLu9LSDPmkElK1whKetWF9TWrUh8qvQ';

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const supabaseAnon = createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY, {
  auth: { persistSession: false }
});

async function getCount(client, table) {
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true });
  return { count, error };
}

async function getRows(client, table, limit = 3) {
  const { data, error } = await client
    .from(table)
    .select('*')
    .limit(limit);
  return { data, error };
}

async function testInsert(client, table, testRow) {
  const { data, error } = await client
    .from(table)
    .insert(testRow)
    .select();
  return { data, error };
}

async function testUpdate(client, table) {
  // Try to update with a nonsense condition that won't match anything
  // but will tell us if we have UPDATE permission at all
  const { data, error, count } = await client
    .from(table)
    .update({ id: '00000000-0000-0000-0000-000000000000' })
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .select();
  return { data, error, count };
}

async function testDelete(client, table) {
  const { data, error, count } = await client
    .from(table)
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000001');
  return { data, error, count };
}

function formatError(error) {
  if (!error) return 'none';
  return `${error.code}: ${error.message}`;
}

async function main() {
  console.log('=== SparkClean Comprehensive RLS Security Audit ===');
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  // First get actual data counts to understand the real state
  console.log('=== SECTION 1: ROW COUNTS (service_role vs anon) ===\n');
  console.log('If anon sees 0 rows but service_role sees >0, RLS is working (filtering by user)');
  console.log('If anon sees rows, those rows are publicly readable!\n');

  const results = {};

  for (const table of TARGET_TABLES) {
    const { count: srCount, error: srErr } = await getCount(supabase, table);
    const { count: anonCount, error: anonErr } = await getCount(supabaseAnon, table);

    results[table] = {
      serviceRoleCount: srCount,
      serviceRoleError: srErr,
      anonCount: anonCount,
      anonError: anonErr,
    };

    const srStatus = srErr ? `ERROR: ${formatError(srErr)}` : `${srCount} rows`;
    const anonStatus = anonErr ? `BLOCKED (${formatError(anonErr)})` : `${anonCount} rows`;
    console.log(`${table}:`);
    console.log(`  Service Role: ${srStatus}`);
    console.log(`  Anon: ${anonStatus}`);
  }

  // Section 2: Sample data check with anon key
  console.log('\n=== SECTION 2: SAMPLE DATA ACCESSIBLE TO ANON ===\n');
  console.log('Showing what an unauthenticated user can actually read:\n');

  for (const table of TARGET_TABLES) {
    const { data, error } = await getRows(supabaseAnon, table, 1);
    if (!error && data && data.length > 0) {
      const firstRow = data[0];
      const keys = Object.keys(firstRow);
      // Show column names but redact actual values for safety
      console.log(`${table}: READABLE! Columns: ${keys.join(', ')}`);
      // Show a summary of what sensitive fields exist
      const sensitiveFields = keys.filter(k =>
        /email|phone|password|name|address|hst|invoice|amount|price|paid|token|key|secret/.test(k.toLowerCase())
      );
      if (sensitiveFields.length > 0) {
        console.log(`  ⚠️  SENSITIVE FIELDS EXPOSED: ${sensitiveFields.join(', ')}`);
      }
    } else if (!error && data && data.length === 0) {
      console.log(`${table}: Table accessible but 0 rows (empty table or RLS filtering)`);
    } else if (error) {
      console.log(`${table}: Blocked - ${formatError(error)}`);
    }
  }

  // Section 3: Write access test with anon key
  console.log('\n=== SECTION 3: WRITE ACCESS TEST (anon key) ===\n');
  console.log('Testing if unauthenticated users can INSERT/UPDATE/DELETE:\n');

  // Test INSERT on clients table (least dangerous test)
  const { data: insertData, error: insertError } = await testInsert(supabaseAnon, 'clients', {
    first_name: 'RLS_AUDIT_TEST',
    last_name: 'AUDIT_TEST_DELETE_ME',
    email: 'rls-audit-test@deleteme.invalid',
  });
  console.log(`clients INSERT (anon): ${insertError ? 'BLOCKED - ' + formatError(insertError) : '⚠️ SUCCEEDED! Row inserted without auth!'}`);
  if (!insertError && insertData) {
    // Clean up the test record using service_role
    const { error: deleteError } = await supabase.from('clients').delete().eq('email', 'rls-audit-test@deleteme.invalid');
    console.log(`  Cleanup: ${deleteError ? 'FAILED - ' + formatError(deleteError) : 'Deleted test row'}`);
  }

  // Test UPDATE
  const { error: updateError } = await testUpdate(supabaseAnon, 'clients');
  console.log(`clients UPDATE (anon): ${updateError ? 'BLOCKED - ' + formatError(updateError) : '✓ No error (but may have matched 0 rows)'}`);

  // Test DELETE
  const { error: deleteError } = await testDelete(supabaseAnon, 'clients');
  console.log(`clients DELETE (anon): ${deleteError ? 'BLOCKED - ' + formatError(deleteError) : '✓ No error (but may have matched 0 rows)'}`);

  // Test businesses INSERT (very sensitive)
  const { data: bizData, error: bizError } = await testInsert(supabaseAnon, 'businesses', {
    business_name: 'RLS_AUDIT_TEST_BUSINESS',
    hst_rate: 13,
  });
  console.log(`businesses INSERT (anon): ${bizError ? 'BLOCKED - ' + formatError(bizError) : '⚠️ SUCCEEDED without auth!'}`);
  if (!bizError && bizData) {
    await supabase.from('businesses').delete().eq('business_name', 'RLS_AUDIT_TEST_BUSINESS');
    console.log('  Cleanup: Deleted test row');
  }

  // Section 4: RLS Policy Summary
  console.log('\n=== SECTION 4: RLS POLICY INFERRED STATUS ===\n');

  console.log('Based on empirical testing:');
  console.log('');

  for (const table of TARGET_TABLES) {
    const r = results[table];
    let status = '';
    let risk = '';

    if (r.anonError) {
      // Anon is blocked - RLS is working
      status = 'RLS LIKELY ACTIVE (anon blocked)';
      risk = 'LOW';
    } else if (r.anonCount !== null && r.anonCount > 0) {
      // Anon can read actual rows
      status = 'RLS NOT PROTECTING (anon can read rows)';
      risk = 'CRITICAL';
    } else if (r.anonCount === 0 && r.serviceRoleCount !== null && r.serviceRoleCount > 0) {
      // Anon sees 0 rows but service_role sees data - RLS is filtering
      status = 'RLS ACTIVE (filtering by user - anon sees 0 of ' + r.serviceRoleCount + ' rows)';
      risk = 'LOW';
    } else if (r.anonCount === 0 && (r.serviceRoleCount === 0 || r.serviceRoleCount === null)) {
      // Both see 0 - table might be empty or RLS deny-all
      status = 'UNKNOWN (both see 0 rows - table empty or deny-all policy)';
      risk = 'UNKNOWN';
    } else {
      status = 'UNKNOWN';
      risk = 'UNKNOWN';
    }

    console.log(`[${risk}] ${table}: ${status}`);
  }

  // Section 5: Try to get policies via creating a helper function
  // using service_role's CREATE FUNCTION privilege through RPC
  console.log('\n=== SECTION 5: ATTEMPTING TO CREATE AUDIT FUNCTION ===\n');

  // PostgREST with service_role should be able to execute as the DB owner
  // Let's try to create a helper function using a technique where we
  // use the existing create_user-like patterns

  // Check if supabase-js has any way to execute arbitrary SQL
  // through a built-in PostgREST feature

  // Try using the PostgREST function with jsonb parameter (unnamed)
  // This is a special PostgREST v12 feature

  // Actually, let's try using Supabase's new SQL executor endpoint
  // that was added in late 2023 / early 2024
  const sqlPayload = JSON.stringify({
    query: `
      SELECT
        t.tablename,
        t.rowsecurity,
        t.forcerowsecurity,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'policyname', p.policyname,
            'permissive', p.permissive,
            'roles', p.roles,
            'cmd', p.cmd,
            'qual', p.qual,
            'with_check', p.with_check
          ))
          FROM pg_catalog.pg_policies p
          WHERE p.schemaname = 'public'
            AND p.tablename = t.tablename),
          '[]'::json
        ) AS policies
      FROM pg_catalog.pg_tables t
      WHERE t.schemaname = 'public'
        AND t.tablename = ANY(ARRAY['clients','appointments','invoices','invoice_items','expenses','businesses','team_members','time_entries','hours_log','mileage_logs','estimates'])
      ORDER BY t.tablename
    `
  });

  // Try v2 SQL endpoint
  const sqlPaths = [
    { hostname: `${PROJECT_REF}.supabase.co`, path: '/rest/v1/sql' },
    { hostname: `${PROJECT_REF}.supabase.co`, path: '/api/pg/sql' },
  ];

  for (const ep of sqlPaths) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: ep.hostname,
          path: ep.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(sqlPayload),
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Accept': 'application/json',
            'Prefer': 'return=representation',
          }
        }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
            catch (e) { resolve({ status: res.statusCode, body: data }); }
          });
        });
        req.on('error', reject);
        req.write(sqlPayload);
        req.end();
      });
      console.log(`${ep.hostname}${ep.path}: ${result.status} - ${JSON.stringify(result.body).substring(0, 300)}`);
    } catch (e) {
      console.log(`${ep.hostname}${ep.path}: ERROR - ${e.message}`);
    }
  }
}

main().catch(console.error);
