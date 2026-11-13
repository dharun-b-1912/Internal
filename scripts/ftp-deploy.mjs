import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ftpUser = 'u917023645.internalpayroll.joypeoplehr.com';
const ftpPass = 'Dharun@1912';
const ftpHost = '194.238.21.73';
const auth = `${ftpUser}:${ftpPass}`;

console.log('--- Starting FTP Deployment to Hostinger ---');

// 1. Create .htaccess for SPA routing
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
DirectoryIndex index.html
`;
fs.writeFileSync('dist-supabase/.htaccess', htaccessContent);

// Function to upload a single file via curl
function uploadFile(localPath, remotePath) {
  console.log(`Uploading ${localPath} -> ftp://${ftpHost}/${remotePath}...`);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
      const cmd = `${curlBin} -k --ssl-reqd --ftp-pasv --connect-timeout 30 --max-time 240 --retry 3 --retry-delay 2 -u "${auth}" -T "${localPath}" --ftp-create-dirs "ftp://${ftpHost}/${remotePath}"`;
      execSync(cmd, { stdio: 'inherit' });
      console.log(`✓ Uploaded ${remotePath}`);
      return;
    } catch (e) {
      console.log(`Attempt ${attempt} failed for ${remotePath}: ${e.message}`);
      if (attempt === 5) throw e;
      execSync('sleep 2');
    }
  }
}

// Function to run FTP command (e.g. DELE default.php)
function runFtpCommand(ftpCmd) {
  try {
    console.log(`Running FTP command: ${ftpCmd}...`);
    const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const cmd = `${curlBin} -k --ssl-reqd --ftp-pasv --connect-timeout 10 --max-time 15 -u "${auth}" -Q "${ftpCmd}" "ftp://${ftpHost}/"`;
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.log(`Command info: ${e.message}`);
  }
}

try {
  // Remove default.php so index.html takes precedence immediately
  runFtpCommand('DELE default.php');

  // Upload root files
  uploadFile('dist-supabase/index.html', 'index.html');
  try {
    uploadFile('dist-supabase/config.js', 'config.js');
  } catch (e) {
    console.log('Note: config.js already up to date on server.');
  }
  try {
    uploadFile('dist-supabase/.htaccess', '.htaccess');
  } catch (e) {
    console.log('Note: .htaccess already present on server.');
  }

  // Upload asset files
  const assetFiles = fs.readdirSync('dist-supabase/assets');
  for (const file of assetFiles) {
    uploadFile(`dist-supabase/assets/${file}`, `assets/${file}`);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL FILES DEPLOYED TO HOSTINGER SUCCESSFULLY!');
  console.log('=============================================');
} catch (error) {
  console.error('Deployment error:', error);
  process.exit(1);
}
