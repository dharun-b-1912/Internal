const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'okhntjppzyweeqjrxbdr';

async function setSecrets() {
  console.log('Pushing Upstash Redis secrets to Supabase Cloud...');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      {
        name: 'UPSTASH_REDIS_REST_URL',
        value: 'https://cunning-kiwi-203450.upstash.io'
      },
      {
        name: 'UPSTASH_REDIS_REST_TOKEN',
        value: 'gQAAAAAAAxq6AAIgcDE0ODdkZjI3ZTliZGI0MzgwODRjYmRlZWNiNDY4OGU5Zg'
      }
    ])
  });

  console.log('Secrets update status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response:', text);
}

setSecrets().catch(console.error);
