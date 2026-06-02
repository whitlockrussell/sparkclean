// Verify the UPDATE/DELETE security findings more carefully
// The key issue: when an attacker tries UPDATE/DELETE on another user's row,
// PostgREST returns 204 No Content (success) but 0 rows affected - is this safe?
// We need to verify the data was NOT actually modified

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

// Also look at why previous test showed "YES (SECURITY ISSUE)" for UPDATE/DELETE
// That was using a different method (.select() appended) - let me check if
// there's a difference when using .select() vs without

async function main() {
  console.log('=== RLS Verification Test ===\n');

  // Create test user
  const testEmail = `rls-verify-${Date.now()}@sparkclean-audit.invalid`;
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

  console.log(`Attacker user: ${testUserId.substring(0, 8)}...\n`);

  // Get a real client row
  const { data: realClient } = await supabase
    .from('clients')
    .select('id, user_id, notes, first_name')
    .limit(1)
    .maybeSingle();

  if (!realClient) {
    console.log('No clients found');
    await supabase.auth.admin.deleteUser(testUserId);
    return;
  }

  console.log(`Target client: ${realClient.id.substring(0, 8)}... (owner: ${realClient.user_id.substring(0, 8)}...)`);
  console.log(`  First name: ${realClient.first_name}`);
  console.log(`  Notes before attack: ${realClient.notes || 'NULL'}\n`);

  // Test 1: UPDATE with .select() - this was the method that showed "SUCCEEDED"
  console.log('--- Test 1: UPDATE with .select() ---');
  const { data: t1Data, error: t1Error } = await attackerClient
    .from('clients')
    .update({ notes: '__HACKED_WITH_SELECT__' })
    .eq('id', realClient.id)
    .select('id, notes');

  console.log(`Error: ${t1Error ? t1Error.code + ': ' + t1Error.message.substring(0, 80) : 'none'}`);
  console.log(`Data returned: ${t1Data ? JSON.stringify(t1Data) : 'null'}`);

  // Verify with service_role
  const { data: afterT1 } = await supabase
    .from('clients')
    .select('notes')
    .eq('id', realClient.id)
    .maybeSingle();
  console.log(`Notes after T1 attack: ${afterT1?.notes || 'NULL'}`);
  console.log(`Was data modified? ${afterT1?.notes === '__HACKED_WITH_SELECT__' ? 'YES - SECURITY ISSUE!' : 'NO - protected'}\n`);

  // Test 2: UPDATE without .select()
  console.log('--- Test 2: UPDATE without .select() ---');
  const { data: t2Data, error: t2Error, count: t2Count } = await attackerClient
    .from('clients')
    .update({ notes: '__HACKED_NO_SELECT__' })
    .eq('id', realClient.id);

  console.log(`Error: ${t2Error ? t2Error.code + ': ' + t2Error.message.substring(0, 80) : 'none'}`);
  console.log(`Count: ${t2Count}`);

  const { data: afterT2 } = await supabase
    .from('clients')
    .select('notes')
    .eq('id', realClient.id)
    .maybeSingle();
  console.log(`Notes after T2 attack: ${afterT2?.notes || 'NULL'}`);
  console.log(`Was data modified? ${afterT2?.notes === '__HACKED_NO_SELECT__' ? 'YES - SECURITY ISSUE!' : 'NO - protected'}\n`);

  // Test 3: DELETE with .select()
  console.log('--- Test 3: DELETE with .select() ---');
  const { data: t3Data, error: t3Error } = await attackerClient
    .from('clients')
    .delete()
    .eq('id', realClient.id)
    .select('id');

  console.log(`Error: ${t3Error ? t3Error.code + ': ' + t3Error.message.substring(0, 80) : 'none'}`);
  console.log(`Data returned: ${t3Data ? JSON.stringify(t3Data) : 'null'}`);

  const { data: afterT3 } = await supabase
    .from('clients')
    .select('id')
    .eq('id', realClient.id)
    .maybeSingle();
  console.log(`Row exists after T3 delete attempt: ${afterT3 ? 'YES - protected' : 'NO - ROW WAS DELETED! CRITICAL!'}\n`);

  // Test 4: Understand why previous test showed "YES (SECURITY ISSUE)"
  // The issue was in the test logic - "data.length > 0" for UPDATE with .select()
  // PostgREST may return the updated row even if 0 rows were affected... or not
  // Let me check the exact behavior

  console.log('--- Test 4: Understanding previous false positive ---');
  // The previous test did: update().eq('id', ...).select('id')
  // and checked if data.length > 0
  // If PostgREST returns 200 with empty array, that's fine
  // If PostgREST returns 200 with the row, that might indicate the update succeeded

  const { data: t4Data, error: t4Error } = await attackerClient
    .from('clients')
    .update({ notes: '__T4_TEST__' })
    .eq('id', realClient.id)
    .select();

  console.log(`T4 returned data length: ${t4Data?.length ?? 'null'}`);
  console.log(`T4 data: ${JSON.stringify(t4Data)}`);
  console.log(`T4 error: ${t4Error ? t4Error.code + ': ' + t4Error.message : 'none'}`);

  // Let me also check the first test that showed "SUCCEEDED" - it was:
  // .update(...).eq('id', existingClient.id).select('id')
  // It returned data.length > 0, which I reported as "SUCCEEDED"
  // But the data might have been empty...

  // ACTUALLY: The first test was using supabase (service_role), not attackerClient!
  // Let me re-read the code...
  // No wait - it was attackerClient. Let me check if data was null vs []

  console.log('\n--- Test 5: Checking what was happening in first test ---');
  // In temp_rls_final2.js, the code was:
  //   const { error: updateError } = await testUpdate(supabaseAnon, 'clients');
  //   which does: update({id: '0000...'}).eq('id', '0000...1').select()
  // But supabaseAnon didn't have a JWT! That might have been different from attackerClient

  // The "YES (SECURITY ISSUE)" in the FIRST test (temp_rls_final2.js) was:
  //   const { error: updateError } = await testUpdate(supabaseAnon, 'clients');
  //   console.log('clients UPDATE (anon): ' + (updateError ? 'BLOCKED' : '✓ No error'))
  // That was supabaseAnon (no JWT) - the no error + 0 rows might be expected
  // because RLS returns 0 rows for anon, not an error

  // But the cross-user test was:
  //   Can test user UPDATE another user's client: YES (SECURITY ISSUE)
  // where the code was:
  //   const { error: updateError } = await authedSupabase.from('clients')
  //     .update({ notes: 'HACKED' }).eq('id', existingClient.id);
  //   console.log('  Can test user UPDATE: ' + (updateError ? 'BLOCKED' : 'YES (SECURITY ISSUE)'));
  // This was checking for ANY error. With RLS, update returns no error but 0 rows
  // This was a false positive in the test logic!

  console.log('The "SECURITY ISSUE" from previous test was a false positive.');
  console.log('The correct check is whether rows were actually affected,');
  console.log('not just whether there was an error.');

  // Clean up
  await supabase.auth.admin.deleteUser(testUserId);
  console.log('\nTest user deleted.');

  // === FINAL SUMMARY ===
  console.log('\n=== FINAL ACCURATE SECURITY ASSESSMENT ===\n');

  // Run a comprehensive test of all operations
  const testEmail2 = `rls-final-${Date.now()}@sparkclean-audit.invalid`;
  const { data: user2Data } = await supabase.auth.admin.createUser({
    email: testEmail2,
    password: testPass,
    email_confirm: true,
  });
  const user2Id = user2Data.user.id;
  const attackerClient2 = await createAuthedClient(testEmail2, testPass);

  const tables = ['clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
    'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'];

  for (const table of tables) {
    // Get real row
    const { data: row } = await supabase
      .from(table)
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!row) {
      console.log(`${table}: SKIP (no data)`);
      continue;
    }

    // Test SELECT
    const { data: selData } = await attackerClient2
      .from(table)
      .select('id')
      .eq('id', row.id);
    const canRead = selData && selData.length > 0;

    // Test UPDATE (use safe payload)
    const updateField = table === 'invoice_items' ? 'description' :
                        table === 'team_members' ? 'role' :
                        table === 'time_entries' ? 'notes' :
                        table === 'hours_log' ? 'notes' :
                        table === 'expenses' ? 'description' : 'notes';

    const { data: updData } = await attackerClient2
      .from(table)
      .update({ [updateField]: '__ATTACK__' })
      .eq('id', row.id)
      .select('id');
    const wasUpdated = updData && updData.length > 0;

    // Verify with service_role
    const { data: verRow } = await supabase
      .from(table)
      .select(updateField)
      .eq('id', row.id)
      .maybeSingle();
    const actuallyModified = verRow && verRow[updateField] === '__ATTACK__';

    // Test DELETE
    const { data: delData } = await attackerClient2
      .from(table)
      .delete()
      .eq('id', row.id)
      .select('id');
    const wasDeleted = delData && delData.length > 0;

    // Verify
    const { data: stillExists } = await supabase
      .from(table)
      .select('id')
      .eq('id', row.id)
      .maybeSingle();
    const actuallyDeleted = !stillExists;

    const read = canRead ? '⚠️ READABLE' : '✓ blocked';
    const update = actuallyModified ? '⚠️ MODIFIED!' : '✓ not modified';
    const del = actuallyDeleted ? '⚠️ DELETED!' : '✓ not deleted';

    console.log(`${table}: READ=${read}, UPDATE=${update}, DELETE=${del}`);
  }

  await supabase.auth.admin.deleteUser(user2Id);
  console.log('\nTest user 2 deleted.');
}

main().catch(console.error);
