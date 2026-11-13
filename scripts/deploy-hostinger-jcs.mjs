import { execSync } from 'child_process';

console.log('--- Deploying to internalpayroll.joycorporatesolutions.com ---');
console.log('Target domain: internalpayroll.joycorporatesolutions.com');
console.log('Directory: dist-supabase');

// Run verified prepare and build
execSync('npm run build:supabase', { stdio: 'inherit' });
console.log('Build complete. Ready for hosting deploy.');

