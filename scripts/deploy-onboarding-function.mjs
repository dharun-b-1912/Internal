import fs from 'fs';
import { execSync } from 'child_process';

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'okhntjppzyweeqjrxbdr';

async function deployOnboarding() {
  console.log('Bundling employee-onboarding function with esbuild...');
  execSync('npx esbuild supabase/functions/employee-onboarding/index.ts --bundle --format=esm --platform=neutral --target=esnext --external:npm:* --external:@supabase/supabase-js --external:nodemailer --outfile=supabase/functions/employee-onboarding/bundled.js');
  
  let code = fs.readFileSync('supabase/functions/employee-onboarding/bundled.js', 'utf8');
  code = code.replace(/from\s+["']@supabase\/supabase-js["']/g, 'from "npm:@supabase/supabase-js@2.112.3"');
  code = code.replace(/from\s+["']nodemailer["']/g, 'from "npm:nodemailer@6.9.16"');

  fs.writeFileSync('supabase/functions/employee-onboarding/bundled.js', code);

  console.log('Deploying bundled employee-onboarding function to Supabase...');
  let res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'employee-onboarding',
      slug: 'employee-onboarding',
      body: code,
      verify_jwt: false
    })
  });
  if (res.status === 409 || res.status === 400) {
    res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions/employee-onboarding`, {
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
  }
  console.log('Status:', res.status, res.statusText);
  const json = await res.json();
  console.log('Response:', json);

  console.log('Testing live employee-onboarding endpoint...');
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9raG50anBwenl3ZWVxanJ4YmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NTg1OTgsImV4cCI6MjA2MjQzNDU5OH0.74y7_37iP4W75vJ1-oUqV9R2Q8L_3Z2z4K5tN4X0e-8';
  const testRes = await fetch(`https://${projectRef}.supabase.co/functions/v1/employee-onboarding`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ action: 'read', employeeId: 'nonexistent', token: '0'.repeat(64) })
  });
  console.log('Live test status:', testRes.status);
  const testBody = await testRes.text();
  console.log('Live test body:', testBody);
}

deployOnboarding();
