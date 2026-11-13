import fs from 'fs';
import path from 'path';
import { zipSync } from 'fflate';

const files = {};
function addDir(dir, prefix = '') {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    const relPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      addDir(fullPath, relPath);
    } else {
      files[relPath] = fs.readFileSync(fullPath);
    }
  }
}

addDir('dist-supabase');
const zipped = zipSync(files);
fs.writeFileSync('joy-payroll-dist.zip', zipped);
console.log(`Created joy-payroll-dist.zip successfully (${(zipped.length / 1024).toFixed(1)} KB)`);
