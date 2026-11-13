import fs from 'fs';
import { execSync } from 'child_process';

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'okhntjppzyweeqjrxbdr';

async function deploy() {
  console.log('Bundling payroll-api function with esbuild...');
  execSync('npx esbuild supabase/functions/payroll-api/index.ts --bundle --format=esm --platform=neutral --target=esnext --external:@supabase/supabase-js --external:postgres --outfile=supabase/functions/payroll-api/bundled.js');
  
  let code = fs.readFileSync('supabase/functions/payroll-api/bundled.js', 'utf8');
  code = code.replace(/from\s+["']@supabase\/supabase-js["']/g, 'from "npm:@supabase/supabase-js@2.112.3"');
  code = code.replace(/from\s+["']postgres["']/g, 'from "npm:postgres@3.4.7"');
  
  fs.writeFileSync('supabase/functions/payroll-api/bundled.js', code);

  console.log('Deploying bundled payroll-api function to Supabase...');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions/payroll-api`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      body: code,
      verify_jwt: false
    })
  });
  console.log('Status:', res.status, res.statusText);
  const json = await res.json();
  console.log('Response:', json);

  console.log('Testing live endpoint...');
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9raG50anBwenl3ZWVxanJ4YmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NTg1OTgsImV4cCI6MjA2MjQzNDU5OH0.74y7_37iP4W75vJ1-oUqV9R2Q8L_3Z2z4K5tN4X0e-8';
  const testRes = await fetch(`https://${projectRef}.supabase.co/functions/v1/payroll-api`, {
    headers: {
      'apikey': anonKey,
    }
  });
  console.log('Live test status:', testRes.status);
  const testBody = await testRes.text();
  console.log('Live test body:', testBody.slice(0, 200));
}

deploy();
