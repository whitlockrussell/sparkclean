const https = require('https');

const SUPABASE_URL = 'https://kbpfecncrewqhdkxvnws.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGZlY25jcmV3cWhka3h2bndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY2MjM3OSwiZXhwIjoyMDk1MjM4Mzc5fQ.nMNhzA5EW7bK90S9ohvJTYLxzrR519Y_8p2Gb0z5Yew';

const TARGET_TABLES = [
  'clients', 'appointments', 'invoices', 'invoice_items', 'expenses',
  'businesses', 'team_members', 'time_entries', 'hours_log', 'mileage_logs', 'estimates'
];

function fetchJSON(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runQuery(sql) {
  // Use the /rest/v1/rpc endpoint won't work for raw SQL
  // Instead use the pg meta API or the SQL executor
  const result = await fetchJSON('/rest/v1/rpc/exec_sql', { query: sql });
  return result;
}

// Try using Supabase's SQL API via REST
async function querySQLViaRest(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Use pg_meta API which Supabase exposes
async function queryPGMeta(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: '/pg' + path,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Try Supabase Management API for policies
async function queryManagementAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      path: path,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Use PostgREST to query system tables directly
async function queryPostgREST(table, params) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const queryStr = params ? '?' + params : '';
    const options = {
      hostname: url.hostname,
      path: '/rest/v1/' + table + queryStr,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'Accept': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Use the Supabase SQL endpoint
async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: '/rest/v1/rpc/pg_execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Try pg_meta tables endpoint
async function getPGMetaTables() {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: '/pg/tables',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Try fetching via the Supabase project's direct SQL REST API
async function executeSQLDirect(sql) {
  const projectRef = 'kbpfecncrewqhdkxvnws';
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const options = {
      hostname: 'kbpfecncrewqhdkxvnws.supabase.co',
      path: '/rest/v1/rpc/sql_execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== SparkClean RLS Security Audit ===\n');
  console.log('Target tables:', TARGET_TABLES.join(', '), '\n');

  // Try pg_meta tables endpoint
  console.log('--- Trying pg_meta /pg/tables ---');
  const tablesResult = await getPGMetaTables();
  console.log('Status:', tablesResult.status);
  if (tablesResult.status === 200 && Array.isArray(tablesResult.data)) {
    const targetTables = tablesResult.data.filter(t =>
      TARGET_TABLES.includes(t.name) && t.schema === 'public'
    );
    console.log('\n=== TABLE RLS STATUS ===');
    for (const table of TARGET_TABLES) {
      const found = targetTables.find(t => t.name === table);
      if (found) {
        console.log(`  ${table}: RLS ${found.rls_enabled ? 'ENABLED' : 'DISABLED'} (rls_forced: ${found.rls_forced})`);
      } else {
        console.log(`  ${table}: NOT FOUND in pg_meta`);
      }
    }
  } else {
    console.log('Response:', JSON.stringify(tablesResult.data).substring(0, 500));
  }

  // Try pg_meta policies endpoint
  console.log('\n--- Trying pg_meta /pg/policies ---');
  const policiesResult = await new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: '/pg/policies',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      }
    };
    const req = https.https ? https.https.request(options) : require('https').request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    if (req.on) {
      req.on('error', reject);
      req.end();
    }
  });

  console.log('Policies status:', policiesResult.status);
  if (policiesResult.status === 200 && Array.isArray(policiesResult.data)) {
    const targetPolicies = policiesResult.data.filter(p => TARGET_TABLES.includes(p.table));
    console.log('\n=== ALL POLICIES ===');
    for (const policy of targetPolicies) {
      console.log(`\nTable: ${policy.table}`);
      console.log(`  Policy: ${policy.name}`);
      console.log(`  Command: ${policy.command}`);
      console.log(`  Roles: ${policy.roles?.join(', ')}`);
      console.log(`  Using (QUAL): ${policy.definition}`);
      console.log(`  With Check: ${policy.check}`);
    }
  } else {
    console.log('Response:', JSON.stringify(policiesResult.data).substring(0, 500));
  }
}

main().catch(console.error);
