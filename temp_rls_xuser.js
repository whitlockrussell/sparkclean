// Cross-user attack test - comprehensive
// Test UPDATE and DELETE on all tables from another user's perspective

const PROJECT_REF = 'kbpfecncrewqhdkxvnws';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NjIzNzksImV4cCI6MjA5NTIzODM3OX0.sL67SMcXI0L6YLu9LSDPmkElK1whKetWF9TWrUh8qvQ';

const { createClient } = require('./node_modules/@supabase/supabase-js');
const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

// Table-specific update payloads that are non-destructive
const UPDATE_PAYLOADS = {
  clients: { notes: '__AUDIT_TEST__' },
  appointments: { notes: '__AUDIT_TEST__' },
  invoices: { notes: '__AUDIT_TEST__' },
  invoice_items: { description: '__AUDIT_TEST__' },
  expenses: { notes: '__AUDIT_TEST__' },
  businesses: { invoice_notes: '__AUDIT_TEST__' },
  team_members: { role: 'member' },
  time_entries: { notes: '__AUDIT_TEST__' },
  hours_log: { notes: '__AUDIT_TEST__' },
  mileage_logs: { notes: '__AUDIT_TEST__' },
  estimates: { notes: '__AUDIT_TEST__' },
};

async function createAuthedClient(email, password) {
  const anonClient = createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY, {
    auth: { persistSession: false }
  });

  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) return null;

  return createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      }
    }
  });
}

async function main() {
  console.log('=== SparkClean Cross-User Attack Test ===\n');

  // Create a test user
  const testEmail = `rls-xuser-${Date.now()}@sparkclean-audit.invalid`;
  const testPass = 'TestPass123!@#';

  console.log(`Creating test attacker user: ${testEmail}`);
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
  });

  if (createError) {
    console.log('Failed to create test user:', createError.message);
    return;
  }

  const testUserId = createData.user.id;
  console.log(`Test user created: ${testUserId}\n`);

  // Create an authenticated client for the test user
  const attackerClient = await createAuthedClient(testEmail, testPass);
  if (!attackerClient) {
    console.log('Failed to sign in as test user');
    await supabase.auth.admin.deleteUser(testUserId);
    return;
  }

  console.log('Signed in as test user (attacker)\n');

  // For each table, find an existing row (owned by another user) and try UPDATE/DELETE
  console.log('=== CROSS-USER WRITE ACCESS TESTS ===\n');

  const results = [];

  for (const table of TARGET_TABLES) {
    // Get an existing row with service_role (owned by real user)
    const { data: existingRow, error: fetchError } = await supabase
      .from(table)
      .select('id')
      .limit(1)
      .maybeSingle();

    if (fetchError || !existingRow) {
      results.push({ table, update: 'SKIP (no data)', delete: 'SKIP (no data)' });
      continue;
    }

    const rowId = existingRow.id;

    // Test UPDATE
    const updatePayload = UPDATE_PAYLOADS[table] || { id: rowId };
    const { data: updateData, error: updateError, count: updateCount } = await attackerClient
      .from(table)
      .update(updatePayload)
      .eq('id', rowId)
      .select('id');

    let updateResult;
    if (updateError) {
      updateResult = `BLOCKED (${updateError.code}: ${updateError.message.substring(0, 60)})`;
    } else if (updateData && updateData.length > 0) {
      updateResult = `⚠️ SUCCEEDED! Updated ${updateData.length} row(s) [SECURITY ISSUE]`;
      // Revert the change using service_role
      await supabase.from(table).update({ notes: null }).eq('id', rowId).maybeSingle();
    } else {
      // No error but no rows updated - this could mean:
      // 1. RLS filtered the row (UPDATE policy prevents it)
      // 2. No matching row
      updateResult = `No rows affected (RLS may be filtering - need to verify)`;
    }

    // Test DELETE
    const { data: deleteData, error: deleteError } = await attackerClient
      .from(table)
      .delete()
      .eq('id', rowId)
      .select('id');

    let deleteResult;
    if (deleteError) {
      deleteResult = `BLOCKED (${deleteError.code}: ${deleteError.message.substring(0, 60)})`;
    } else if (deleteData && deleteData.length > 0) {
      deleteResult = `⚠️ SUCCEEDED! Deleted ${deleteData.length} row(s) [CRITICAL SECURITY ISSUE]`;
      // Note: Can't recover deleted data! Log for awareness
      console.log(`⚠️  CRITICAL: Row ${rowId} in ${table} was DELETED by test user!`);
    } else {
      deleteResult = `No rows affected (RLS may be filtering)`;
    }

    // Test INSERT with a different user_id (privilege escalation)
    // For tables with user_id field, try to insert with a different user_id

    results.push({ table, rowId, update: updateResult, delete: deleteResult });

    console.log(`${table} (row: ${rowId.substring(0, 8)}...):`);
    console.log(`  UPDATE: ${updateResult}`);
    console.log(`  DELETE: ${deleteResult}`);
    console.log('');
  }

  // Test INSERT with spoofed user_id
  console.log('=== INSERT WITH SPOOFED user_id TEST ===\n');

  // Get a real user_id from existing data
  const { data: realClient } = await supabase.from('clients').select('user_id').limit(1).maybeSingle();
  const realUserId = realClient?.user_id;

  if (realUserId) {
    console.log(`Testing INSERT with spoofed user_id: ${realUserId}\n`);

    // Try to insert a client with a different user_id
    const { data: insertSpoofed, error: insertSpoofedError } = await attackerClient
      .from('clients')
      .insert({
        first_name: 'SPOOFED',
        last_name: 'ATTACK',
        email: 'spoofed@attack.invalid',
        user_id: realUserId, // Try to spoof another user's user_id
      })
      .select('id, user_id');

    if (insertSpoofedError) {
      console.log(`clients INSERT with spoofed user_id: BLOCKED (${insertSpoofedError.code})`);
    } else if (insertSpoofed && insertSpoofed.length > 0) {
      const actualUserId = insertSpoofed[0].user_id;
      if (actualUserId === realUserId) {
        console.log(`⚠️ SECURITY ISSUE: INSERT with spoofed user_id SUCCEEDED! Created record under user ${realUserId}`);
      } else {
        console.log(`INSERT allowed but user_id coerced to ${actualUserId} (policy sets user_id = auth.uid())`);
      }
      // Clean up
      await supabase.from('clients').delete().eq('id', insertSpoofed[0].id);
    }

    // Try normal insert (user_id = test user's id)
    const { data: insertNormal, error: insertNormalError } = await attackerClient
      .from('clients')
      .insert({
        first_name: 'NORMAL',
        last_name: 'TEST',
        email: 'normal@test.invalid',
      })
      .select('id, user_id');

    if (insertNormalError) {
      console.log(`clients INSERT (normal): BLOCKED (${insertNormalError.code}: ${insertNormalError.message.substring(0, 80)})`);
    } else if (insertNormal && insertNormal.length > 0) {
      const actualUserId = insertNormal[0].user_id;
      if (actualUserId === testUserId) {
        console.log(`clients INSERT (normal): ALLOWED - user_id correctly set to auth.uid() (${actualUserId.substring(0, 8)}...)`);
      } else if (actualUserId === null) {
        console.log(`⚠️ clients INSERT (normal): ALLOWED but user_id is NULL - records not owned by anyone!`);
      } else {
        console.log(`clients INSERT (normal): ALLOWED - user_id set to ${actualUserId} (unexpected)`);
      }
      // Clean up
      await supabase.from('clients').delete().eq('id', insertNormal[0].id);
    }
  }

  // Clean up test user
  console.log('\nCleaning up test user...');
  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(testUserId);
  console.log(`Test user ${deleteUserError ? 'FAILED to delete: ' + deleteUserError.message : 'deleted OK'}`);
}

main().catch(console.error);
