// Corrected INSERT policy tests
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
  if (error) { console.log('Sign-in error:', error.message); return null; }

  return {
    client: createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
    }),
    userId: data.user.id,
    token: data.session.access_token,
  };
}

async function main() {
  console.log('=== INSERT Policy & Column Structure Tests ===\n');

  // First, get the actual column structure for each table via OpenAPI
  // We already know from the earlier introspection:
  // clients: user_id
  // appointments: user_id
  // invoices: user_id
  // invoice_items: user_id (invoice_id also)
  // expenses: user_id
  // businesses: user_id
  // team_members: owner_id (not user_id!)
  // time_entries: owner_id (not user_id!)
  // hours_log: owner_id (not user_id!)
  // mileage_logs: user_id
  // estimates: user_id

  // Create test user
  const testEmail = `rls-insert2-${Date.now()}@sparkclean-audit.invalid`;
  const testPass = 'TestPass123!@#';

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
  });

  if (createError) {
    console.log('Failed to create user:', createError.message);
    return;
  }

  const authResult = await createAuthedClient(testEmail, testPass);
  if (!authResult) return;

  const { client: attackerClient, userId: testUserId } = authResult;
  console.log(`Test user: ${testUserId.substring(0, 8)}...\n`);

  // Get a real user_id for spoofing attempts
  const { data: realRow } = await supabase.from('clients').select('user_id').limit(1).maybeSingle();
  const realUserId = realRow?.user_id;
  const { data: realBiz } = await supabase.from('businesses').select('user_id').limit(1).maybeSingle();
  const { data: realTE } = await supabase.from('time_entries').select('owner_id').limit(1).maybeSingle();

  console.log(`Victim user_id: ${realUserId?.substring(0, 8)}...\n`);

  // Table column info from OpenAPI spec
  const tableInsertTests = [
    {
      table: 'clients',
      userIdField: 'user_id',
      normalPayload: { first_name: 'AUDIT', last_name: 'TEST', email: 'audit-test@sparkclean.invalid' },
      spoofPayload: { first_name: 'SPOOF', last_name: 'ATTACK', email: 'spoof@sparkclean.invalid', user_id: realUserId },
    },
    {
      table: 'appointments',
      userIdField: 'user_id',
      normalPayload: { scheduled_date: '2026-06-02', price: 0, status: 'pending' },
      spoofPayload: { scheduled_date: '2026-06-02', price: 0, status: 'pending', user_id: realUserId },
    },
    {
      table: 'expenses',
      userIdField: 'user_id',
      normalPayload: { description: 'AUDIT TEST', amount: 0, category: 'other', expense_date: '2026-06-02' },
      spoofPayload: { description: 'SPOOF TEST', amount: 0, category: 'other', expense_date: '2026-06-02', user_id: realUserId },
    },
    {
      table: 'mileage_logs',
      userIdField: 'user_id',
      normalPayload: { trip_date: '2026-06-02', km: 0 },
      spoofPayload: { trip_date: '2026-06-02', km: 0, user_id: realUserId },
    },
    {
      table: 'estimates',
      userIdField: 'user_id',
      normalPayload: { issue_date: '2026-06-02', subtotal: 0, hst_amount: 0, total: 0, status: 'draft', estimate_number: 'AUDIT-001' },
      spoofPayload: { issue_date: '2026-06-02', subtotal: 0, hst_amount: 0, total: 0, status: 'draft', estimate_number: 'SPOOF-001', user_id: realUserId },
    },
    {
      table: 'businesses',
      userIdField: 'user_id',
      normalPayload: { business_name: 'AUDIT BUSINESS', hst_rate: 13 },
      spoofPayload: { business_name: 'SPOOF BUSINESS', hst_rate: 13, user_id: realUserId },
    },
    {
      table: 'team_members',
      userIdField: 'owner_id',
      normalPayload: { email: 'member@test.invalid', full_name: 'AUDIT MEMBER', role: 'member' },
      spoofPayload: { email: 'spoof-member@test.invalid', full_name: 'SPOOF MEMBER', role: 'member', owner_id: realUserId },
    },
    {
      table: 'time_entries',
      userIdField: 'owner_id',
      normalPayload: { clock_in: new Date().toISOString(), work_date: '2026-06-02' },
      spoofPayload: { clock_in: new Date().toISOString(), work_date: '2026-06-02', owner_id: realTE?.owner_id },
    },
    {
      table: 'hours_log',
      userIdField: 'owner_id',
      normalPayload: { work_date: '2026-06-02', hours: 0 },
      spoofPayload: { work_date: '2026-06-02', hours: 0, owner_id: realTE?.owner_id },
    },
  ];

  console.log('=== TABLE-BY-TABLE INSERT POLICY RESULTS ===\n');

  for (const test of tableInsertTests) {
    console.log(`--- ${test.table} (user field: ${test.userIdField}) ---`);

    // Normal INSERT (no user_id override)
    const { data: normData, error: normError } = await attackerClient
      .from(test.table)
      .insert(test.normalPayload)
      .select(`id, ${test.userIdField}`);

    let normResult;
    if (normError) {
      normResult = `BLOCKED (${normError.code})`;
      if (!normError.code.includes('42501') && !normError.code.includes('23')) {
        normResult += `: ${normError.message.substring(0, 100)}`;
      }
    } else if (normData && normData.length > 0) {
      const uid = normData[0][test.userIdField];
      if (uid === testUserId) {
        normResult = `ALLOWED - ${test.userIdField} correctly set to auth.uid()`;
      } else if (uid === null || uid === undefined) {
        normResult = `ALLOWED - ${test.userIdField} is NULL (no user tracking!)`;
      } else {
        normResult = `ALLOWED - ${test.userIdField} = ${uid.substring(0, 8)} (unexpected!)`;
      }
      // Clean up
      await supabase.from(test.table).delete().eq('id', normData[0].id);
    } else {
      normResult = `Returned empty array (0 rows - possible RLS deny)`;
    }

    // Spoofed INSERT (attempt to set user_id to another user)
    let spoofResult = 'skipped';
    if (test.spoofPayload[test.userIdField]) {
      const { data: spoofData, error: spoofError } = await attackerClient
        .from(test.table)
        .insert(test.spoofPayload)
        .select(`id, ${test.userIdField}`);

      if (spoofError) {
        spoofResult = `BLOCKED (${spoofError.code})`;
      } else if (spoofData && spoofData.length > 0) {
        const uid = spoofData[0][test.userIdField];
        if (uid === test.spoofPayload[test.userIdField]) {
          spoofResult = `⚠️ SECURITY ISSUE: Row inserted with victim's ${test.userIdField}!`;
        } else {
          spoofResult = `ALLOWED but ${test.userIdField} coerced from ${test.spoofPayload[test.userIdField]?.substring(0, 8)} to ${uid?.substring(0, 8)} (policy overrode)`;
        }
        // Clean up
        await supabase.from(test.table).delete().eq('id', spoofData[0].id);
      } else {
        spoofResult = `Empty array returned`;
      }
    }

    console.log(`  Normal INSERT:  ${normResult}`);
    console.log(`  Spoofed INSERT: ${spoofResult}`);
    console.log('');
  }

  // Now test the additional tables (not in original target list)
  console.log('=== ADDITIONAL TABLES (not in original target) ===\n');

  const extraTables = ['profiles', 'reminder_templates', 'notes', 'appointment_assignments', 'estimate_items'];
  for (const table of extraTables) {
    // Check anon access
    const { count: anonCount, error: anonErr } = await createClient(
      `https://${PROJECT_REF}.supabase.co`, ANON_KEY, { auth: { persistSession: false } }
    ).from(table).select('*', { count: 'exact', head: true });

    // Check service_role access
    const { count: srCount, error: srErr } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    console.log(`${table}:`);
    console.log(`  Service role: ${srErr ? 'ERROR: ' + srErr.message.substring(0, 60) : srCount + ' rows'}`);
    console.log(`  Anon: ${anonErr ? 'BLOCKED: ' + anonErr.code : anonCount + ' rows'}`);
  }

  // Clean up
  await supabase.auth.admin.deleteUser(testUserId);
  console.log('\nTest user deleted.');
}

main().catch(console.error);
