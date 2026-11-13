import postgres from 'postgres';

const databaseUrl = 'postgresql://postgres.okhntjppzyweeqjrxbdr:Dharun%401912@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function main() {
  const sql = postgres(databaseUrl, { ssl: 'require' });
  const users = await sql`SELECT id, email, role, status, can_approve_payroll FROM app_users`;
  console.log('Current app_users in DB:', users);
  await sql.end();
}

main().catch(console.error);
