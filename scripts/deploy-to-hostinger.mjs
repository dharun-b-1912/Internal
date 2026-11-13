import fs from 'fs';

const token = '7DnnHGNPELpar7zZyQicj1YbSyXrhYJqkZAdCLdDbd4ce26c';
const username = 'u917023645';
const domain = 'internalpayroll.joypeoplehr.com';

async function deploy() {
  console.log(`Generating upload URL for ${domain}...`);
  const uploadUrlRes = await fetch(
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/domains/${domain}/files/upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }
  );
  console.log('Upload URL status:', uploadUrlRes.status);
  const uploadData = await uploadUrlRes.json();
  console.log('Upload Data:', uploadData);

  if (!uploadData.url) {
    console.error('Failed to get upload URL:', uploadData);
    return;
  }

  const zipBuffer = fs.readFileSync('joy-payroll-dist.zip');
  const size = zipBuffer.length;
  console.log(`Uploading joy-payroll-dist.zip (${size} bytes) via TUS protocol...`);

  // Step 1: Create upload with POST
  const createRes = await fetch(`${uploadData.url}/joy-payroll-dist.zip?override=true`, {
    method: 'POST',
    headers: {
      'X-Auth': uploadData.auth_key,
      'X-Auth-Rest': uploadData.rest_auth_key,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(size),
      'Upload-Offset': '0',
    },
  });
  console.log('TUS Create status:', createRes.status);

  // Step 2: Upload binary bytes with PATCH
  const patchRes = await fetch(`${uploadData.url}/joy-payroll-dist.zip?override=true`, {
    method: 'PATCH',
    headers: {
      'X-Auth': uploadData.auth_key,
      'X-Auth-Rest': uploadData.rest_auth_key,
      'Tus-Resumable': '1.0.0',
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': '0',
    },
    body: zipBuffer,
  });
  console.log('TUS Upload status:', patchRes.status);

  // Step 3: Trigger static site deployment
  console.log('Triggering static site archive deployment on Hostinger...');
  const deployRes = await fetch(
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/websites/${domain}/deploy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        archive_path: 'joy-payroll-dist.zip',
      }),
    }
  );
  console.log('Deploy status:', deployRes.status);
  const deployData = await deployRes.json();
  console.log('Deploy response:', deployData);
}

deploy();
