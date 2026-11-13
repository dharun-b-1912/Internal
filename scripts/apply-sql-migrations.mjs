import fs from 'fs';

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'okhntjppzyweeqjrxbdr';

async function executeSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  console.log('Query status:', res.status);
  const json = await res.json();
  console.log('Result:', json);
  return json;
}

async function run() {
  const migrations = [
    'supabase/migrations/20260912105051_new_employee_invitations.sql',
    'supabase/migrations/20260912170909_onboarding_documents_references.sql',
    'supabase/migrations/20260913035033_revenue_month_plans.sql',
    'supabase/migrations/20260929103000_application_documents_approval_workflow.sql',
  ];
  for (const m of migrations) {
    if (fs.existsSync(m)) {
      console.log(`Executing ${m}...`);
      const sql = fs.readFileSync(m, 'utf8');
      const res = await executeSql(sql);
      console.log(`Result for ${m}:`, res);
    }
  }
}

run();
