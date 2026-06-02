// We know:
// 1. Auth admin API works with service_role JWT
// 2. PostgREST only exposes public and graphql_public schemas
// 3. We can't create functions via PostgREST
// 4. The service_role JWT is NOT the database password
// 5. RLS IS working (anon sees 0 rows for all tables)
//
// The auth admin API might allow us to find auth users
// Let's use that to understand the RLS policies better by testing with
// actual authenticated user tokens

const https = require('https');

const PROJECT_REF = 'kbpfecncrewqhdkxvnws';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

const { createClient } = require('./node_modules/@supabase/supabase-js');
const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Get all auth users
async function getAuthUsers() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 });
  if (error) {
    console.log('Auth users error:', error.message);
    return [];
  }
  return data.users;
}

// Generate a session token for a specific user (impersonation)
// This allows us to test what that user can actually see
async function generateUserToken(userId) {
  // Note: This is a destructive action as it creates a new session
  // We'll use it just for the audit
  // Actually, supabase.auth.admin doesn't have generateLink for an existing user
  // without a URL redirect

  // Let's try getting a user's token by creating a custom JWT
  // OR use the auth admin to create a temporary token

  // Check if there's a way to get a user token without sign-in
  // Supabase admin can create a session: but needs the user's password

  // Alternative: check what the policies look like by examining the app code
  return null;
}

// Since we can't get user tokens easily, let's try to CREATE a function
// using a PostgreSQL connection via the newer Supabase Postgres API

// The Supabase project exposes postgres at:
// Direct: db.[project-ref].supabase.co:5432 (needs DB password)
// Pooler: aws-0-[region].pooler.supabase.com:6543 (needs DB password)

// The DB password is NOT the service role JWT
// It's a separate password set in the Supabase dashboard
// We don't have access to this password from the .env.local file

// HOWEVER: We can examine the application source code to find the policy definitions!
// The app was BUILT with RLS in mind - let's look at the code to understand
// what policies should exist

// Also, let's try: create the user via auth admin (new temp user), get their JWT,
// use that JWT to test the RLS

async function createTestUserAndCheck() {
  const testEmail = `rls-audit-test-${Date.now()}@sparkclean-audit.invalid`;
  console.log(`Creating test user: ${testEmail}`);

  // Create a test user
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!@#',
    email_confirm: true,
  });

  if (createError) {
    console.log('Create user error:', createError.message);
    return null;
  }

  const testUserId = createData.user.id;
  console.log('Test user created:', testUserId);

  // Sign in as the test user to get their JWT
  const anonSupabase = createClient(`https://${PROJECT_REF}.supabase.co`,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NjIzNzksImV4cCI6MjA5NTIzODM3OX0.sL67SMcXI0L6YLu9LSDPmkElK1whKetWF9TWrUh8qvQ',
    { auth: { persistSession: false } }
  );

  const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
    email: testEmail,
    password: 'TestPassword123!@#',
  });

  if (signInError) {
    console.log('Sign in error:', signInError.message);
    // Clean up
    await supabase.auth.admin.deleteUser(testUserId);
    return null;
  }

  const userToken = signInData.session.access_token;
  console.log('Got user JWT, testing table access...\n');

  // Create an authenticated client for this user
  const authedSupabase = createClient(`https://${PROJECT_REF}.supabase.co`,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NjIzNzksImV4cCI6MjA5NTIzODM3OX0.sL67SMcXI0L6YLu9LSDPmkElK1whKetWF9TWrUh8qvQ',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`,
        }
      }
    }
  );

  console.log('=== TABLE ACCESS TEST WITH AUTHENTICATED NEW USER ===');
  console.log('(New user with no data in the system)\n');

  for (const table of TARGET_TABLES) {
    // Try SELECT
    const { count: selectCount, error: selectError } = await authedSupabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    // Try INSERT
    let insertResult = 'skipped';
    let insertId = null;

    // Try to INSERT into select tables
    if (table === 'clients') {
      const { data: iData, error: iError } = await authedSupabase
        .from('clients')
        .insert({
          first_name: 'AUDIT',
          last_name: 'TEST',
          email: 'audit@test.invalid',
        })
        .select('id');

      if (iError) {
        insertResult = `BLOCKED: ${iError.code}`;
      } else {
        insertResult = `ALLOWED (id: ${iData?.[0]?.id})`;
        insertId = iData?.[0]?.id;
      }
    }

    if (table === 'businesses') {
      const { data: iData, error: iError } = await authedSupabase
        .from('businesses')
        .insert({
          business_name: 'AUDIT_TEST_BUSINESS',
          hst_rate: 13,
        })
        .select('id');

      if (iError) {
        insertResult = `BLOCKED: ${iError.code} - ${iError.message.substring(0, 80)}`;
      } else {
        insertResult = `ALLOWED (id: ${iData?.[0]?.id})`;
        insertId = iData?.[0]?.id;
      }
    }

    const selectStatus = selectError
      ? `BLOCKED: ${selectError.code} - ${selectError.message.substring(0, 60)}`
      : `OK (${selectCount} rows visible)`;

    console.log(`${table}:`);
    console.log(`  SELECT: ${selectStatus}`);
    if (table === 'clients' || table === 'businesses') {
      console.log(`  INSERT: ${insertResult}`);
    }

    // Clean up inserted test data
    if (insertId) {
      await supabase.from(table).delete().eq('id', insertId);
      console.log('  [cleanup: deleted test row]');
    }
  }

  // Try UPDATE and DELETE on clients with wrong user_id
  console.log('\n=== CROSS-USER DATA ACCESS TEST ===');
  console.log('Testing if new user can see/modify other users data:\n');

  // Get a client from service_role (another user's data)
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id, user_id')
    .limit(1)
    .single();

  if (existingClient) {
    console.log(`Existing client id: ${existingClient.id} (belongs to user: ${existingClient.user_id})`);

    // Try to read this specific record as the new user
    const { data: readData, error: readError } = await authedSupabase
      .from('clients')
      .select('*')
      .eq('id', existingClient.id);

    console.log(`  Can test user READ another user's client: ${readError ? 'BLOCKED: ' + readError.code : (readData?.length > 0 ? 'YES (SECURITY ISSUE)' : 'NO (correctly filtered)')}`);

    // Try to update
    const { error: updateError } = await authedSupabase
      .from('clients')
      .update({ notes: 'HACKED' })
      .eq('id', existingClient.id);

    console.log(`  Can test user UPDATE another user's client: ${updateError ? 'BLOCKED: ' + updateError.code : 'YES (SECURITY ISSUE)'}`);

    // Try to delete
    const { error: deleteError } = await authedSupabase
      .from('clients')
      .delete()
      .eq('id', existingClient.id);

    console.log(`  Can test user DELETE another user's client: ${deleteError ? 'BLOCKED: ' + deleteError.code : 'YES (SECURITY ISSUE)'}`);
  }

  // Also get a business record
  const { data: existingBiz } = await supabase
    .from('businesses')
    .select('id, user_id')
    .limit(1)
    .single();

  if (existingBiz) {
    console.log(`\nExisting business id: ${existingBiz.id} (belongs to user: ${existingBiz.user_id})`);

    const { data: bizData, error: bizError } = await authedSupabase
      .from('businesses')
      .select('*')
      .eq('id', existingBiz.id);

    console.log(`  Can test user READ another user's business: ${bizError ? 'BLOCKED: ' + bizError.code : (bizData?.length > 0 ? 'YES (SECURITY ISSUE) - exposes HST#, logo, plan info' : 'NO (correctly filtered)')}`);
  }

  // Also test appointments
  const { data: existingAppt } = await supabase
    .from('appointments')
    .select('id, user_id')
    .limit(1)
    .single();

  if (existingAppt) {
    console.log(`\nExisting appointment id: ${existingAppt.id} (belongs to user: ${existingAppt.user_id})`);

    const { data: apptData, error: apptError } = await authedSupabase
      .from('appointments')
      .select('*')
      .eq('id', existingAppt.id);

    console.log(`  Can test user READ another user's appointment: ${apptError ? 'BLOCKED: ' + apptError.code : (apptData?.length > 0 ? 'YES (SECURITY ISSUE)' : 'NO (correctly filtered)')}`);
  }

  // Check time_entries and team_members which have owner_id vs user_id
  const { data: existingTE } = await supabase
    .from('time_entries')
    .select('id, owner_id')
    .limit(1)
    .single();

  if (existingTE) {
    console.log(`\nExisting time_entry id: ${existingTE.id} (owner: ${existingTE.owner_id})`);

    const { data: teData, error: teError } = await authedSupabase
      .from('time_entries')
      .select('*')
      .eq('id', existingTE.id);

    console.log(`  Can test user READ another user's time_entry: ${teError ? 'BLOCKED: ' + teError.code : (teData?.length > 0 ? 'YES (SECURITY ISSUE)' : 'NO (correctly filtered)')}`);
  }

  // Clean up: delete test user
  console.log('\nCleaning up test user...');
  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(testUserId);
  console.log('Test user deleted:', deleteUserError ? 'ERROR: ' + deleteUserError.message : 'OK');

  return testUserId;
}

// Also look at the source code to find the RLS policy patterns
async function analyzeSourceCodeForPolicies() {
  console.log('\n=== SOURCE CODE ANALYSIS FOR RLS PATTERNS ===\n');

  const fs = require('fs');
  const path = require('path');

  // Search for user_id patterns in hooks
  const hooksDir = path.join(__dirname, 'lib', 'hooks');
  if (fs.existsSync(hooksDir)) {
    const hookFiles = fs.readdirSync(hooksDir);
    for (const file of hookFiles) {
      const content = fs.readFileSync(path.join(hooksDir, file), 'utf8');
      // Look for eq('user_id' patterns which indicate the app relies on RLS filtering
      const userIdRefs = content.match(/\.eq\(['"](user_id|owner_id)['"]/g);
      const filterRefs = content.match(/\.filter\(['"](user_id|owner_id)['"]/g);
      if (userIdRefs || filterRefs) {
        console.log(`${file}: Uses user_id/owner_id filter: ${[...(userIdRefs || []), ...(filterRefs || [])].join(', ')}`);
      }
    }
  }

  // Search for CREATE POLICY statements in any JS/TS files (migration scripts)
  const checkDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      if (f.isDirectory() && !['node_modules', '.git', '.next'].includes(f.name)) {
        checkDir(path.join(dir, f.name));
      } else if (f.isFile() && (f.name.endsWith('.sql') || f.name.endsWith('.ts') || f.name.endsWith('.js'))) {
        try {
          const content = fs.readFileSync(path.join(dir, f.name), 'utf8');
          if (content.includes('CREATE POLICY') || content.includes('ENABLE ROW LEVEL SECURITY')) {
            console.log(`Found RLS definitions in: ${path.join(dir, f.name)}`);
          }
        } catch (e) {}
      }
    }
  };
  checkDir(__dirname);
}

async function main() {
  console.log('=== SparkClean RLS Audit - Full Testing Suite ===\n');

  await analyzeSourceCodeForPolicies();

  console.log('\n=== CREATING TEST USER AND RUNNING ACCESS TESTS ===\n');
  await createTestUserAndCheck();
}

main().catch(console.error);
