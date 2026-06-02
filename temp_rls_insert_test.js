// Test INSERT policies and check hours_log
const PROJECT_REF = 'kbpfecncrewqhdkxvnws';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NjIzNzksImV4cCI6MjA5NTIzODM3OX0.sL67SMcXI0L6YLu9LSDPmkElK1whKetWF9TWrUh8qvQ';

const { createClient } = require('./node_modules/@supabase/supabase-js');
const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function createAuthedClient(email, password) {
  const anonClient = createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY, {
    auth: { persistSession: false }
  });
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) return null;

  return createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` }
    }
  });
}

async function main() {
  console.log('=== INSERT Policy Tests & hours_log Check ===\n');

  // Check hours_log table structure
  console.log('--- hours_log table check ---');
  const { data: hlCols, error: hlErr } = await supabase
    .from('hours_log')
    .select('*')
    .limit(0);

  if (hlErr) {
    console.log('hours_log error:', hlErr.message);
  } else {
    console.log('hours_log is accessible to service_role (exists, 0 rows)');
  }

  // Count via service_role
  const { count: hlCount } = await supabase
    .from('hours_log')
    .select('*', { count: 'exact', head: true });
  console.log(`hours_log row count (service_role): ${hlCount}`);

  // Create test user
  const testEmail = `rls-insert-${Date.now()}@sparkclean-audit.invalid`;
  const testPass = 'TestPass123!@#';

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
  });

  if (createError) {
    console.log('Failed:', createError.message);
    return;
  }

  const testUserId = createData.user.id;
  const attackerClient = await createAuthedClient(testEmail, testPass);
  console.log(`\nTest user (attacker): ${testUserId.substring(0, 8)}...\n`);

  // Get a real user_id for spoofing
  const { data: realClientRow } = await supabase
    .from('clients')
    .select('user_id')
    .limit(1)
    .maybeSingle();
  const realUserId = realClientRow?.user_id;
  console.log(`Target/victim user_id: ${realUserId?.substring(0, 8)}...\n`);

  // Test INSERT for each table
  console.log('=== INSERT TESTS ===\n');

  const insertTests = [
    {
      table: 'clients',
      normalPayload: { first_name: 'AUDIT', last_name: 'TEST', email: 'audit@test.invalid' },
      spoofPayload: { first_name: 'AUDIT', last_name: 'SPOOF', email: 'spoof@test.invalid', user_id: realUserId },
    },
    {
      table: 'appointments',
      normalPayload: { scheduled_date: '2026-06-02', price: 100, status: 'pending' },
      spoofPayload: { scheduled_date: '2026-06-02', price: 100, status: 'pending', user_id: realUserId },
    },
    {
      table: 'expenses',
      normalPayload: { description: 'AUDIT TEST', amount: 10, category: 'other', expense_date: '2026-06-02' },
      spoofPayload: { description: 'AUDIT SPOOF', amount: 10, category: 'other', expense_date: '2026-06-02', user_id: realUserId },
    },
    {
      table: 'mileage_logs',
      normalPayload: { trip_date: '2026-06-02', km: 1 },
      spoofPayload: { trip_date: '2026-06-02', km: 1, user_id: realUserId },
    },
    {
      table: 'hours_log',
      normalPayload: { work_date: '2026-06-02', hours: 1 },
      spoofPayload: { work_date: '2026-06-02', hours: 1, owner_id: realUserId },
    },
  ];

  for (const test of insertTests) {
    const { table } = test;

    // Test 1: Normal INSERT (should work if user has INSERT policy)
    const { data: normData, error: normError } = await attackerClient
      .from(table)
      .insert(test.normalPayload)
      .select('id, user_id, owner_id');

    let normResult;
    if (normError) {
      normResult = `BLOCKED (${normError.code}: ${normError.message.substring(0, 70)})`;
    } else if (normData && normData.length > 0) {
      const uid = normData[0].user_id || normData[0].owner_id;
      normResult = `ALLOWED - user_id/owner_id set to: ${uid ? uid.substring(0, 8) + '...' : 'NULL'}`;
      if (uid === testUserId) {
        normResult += ' (correctly bound to auth.uid())';
      } else if (uid === null || uid === undefined) {
        normResult += ' ⚠️ WARNING: user_id is NULL!';
      } else {
        normResult += ' ⚠️ UNEXPECTED user_id';
      }
      // Clean up
      await supabase.from(table).delete().eq('id', normData[0].id);
    } else {
      normResult = `No rows returned (unexpected)`;
    }

    // Test 2: Spoofed INSERT (should be blocked by WITH CHECK policy)
    const { data: spoofData, error: spoofError } = await attackerClient
      .from(table)
      .insert(test.spoofPayload)
      .select('id, user_id, owner_id');

    let spoofResult;
    if (spoofError) {
      spoofResult = `BLOCKED (${spoofError.code}: ${spoofError.message.substring(0, 70)})`;
    } else if (spoofData && spoofData.length > 0) {
      const uid = spoofData[0].user_id || spoofData[0].owner_id;
      if (uid === realUserId) {
        spoofResult = `⚠️ SECURITY ISSUE: Row inserted with victim's user_id!`;
        // Clean up
        await supabase.from(table).delete().eq('id', spoofData[0].id);
      } else {
        spoofResult = `INSERT allowed but user_id coerced to ${uid?.substring(0, 8)} (not victim's)`;
        // Clean up
        await supabase.from(table).delete().eq('id', spoofData[0].id);
      }
    } else {
      spoofResult = `No rows returned`;
    }

    console.log(`${table}:`);
    console.log(`  Normal INSERT: ${normResult}`);
    console.log(`  Spoofed INSERT: ${spoofResult}`);
    console.log('');
  }

  // Also check the anon key INSERT (no auth at all)
  console.log('=== UNAUTHENTICATED INSERT TESTS ===\n');

  const anonClient = createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY, {
    auth: { persistSession: false }
  });

  for (const table of ['clients', 'expenses', 'mileage_logs', 'appointments']) {
    const payload = table === 'clients' ? { first_name: 'ANON', last_name: 'TEST' }
                  : table === 'expenses' ? { description: 'ANON', amount: 1, category: 'other', expense_date: '2026-06-02' }
                  : table === 'mileage_logs' ? { trip_date: '2026-06-02', km: 1 }
                  : { scheduled_date: '2026-06-02', price: 1, status: 'pending' };

    const { data, error } = await anonClient
      .from(table)
      .insert(payload)
      .select('id');

    if (error) {
      console.log(`${table} anon INSERT: BLOCKED (${error.code})`);
    } else {
      console.log(`${table} anon INSERT: ⚠️ ALLOWED without auth! id: ${data?.[0]?.id}`);
      if (data?.[0]?.id) {
        await supabase.from(table).delete().eq('id', data[0].id);
      }
    }
  }

  // Clean up test user
  await supabase.auth.admin.deleteUser(testUserId);
  console.log('\nTest user deleted.');

  console.log('\n=== COMPLETE AUDIT SUMMARY ===');
  console.log('\nProject: kbpfecncrewqhdkxvnws (SparkClean)');
  console.log('Date: 2026-06-02\n');
  console.log('Method: Empirical testing via service_role + anon + test-user JWT\n');

  console.log('Tables confirmed in API (from OpenAPI spec):');
  console.log('  clients, appointments, invoices, invoice_items, expenses,');
  console.log('  businesses, team_members, time_entries, hours_log, mileage_logs, estimates\n');

  console.log('Additional tables found in API (not in original target list):');
  console.log('  profiles, reminder_templates, notes, appointment_assignments, estimate_items\n');
}

main().catch(console.error);
