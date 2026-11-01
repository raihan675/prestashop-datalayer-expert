const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

let issues = 0;
function scan(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === '.git' || f.name === 'node_modules' || f.name === 'sanitization_check.js') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      scan(p);
    } else {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('ghp_')) {
        console.error('SENSITIVE TOKEN FOUND IN: ' + p);
        issues++;
      }
      if (c.includes('familys-world')) {
        console.error('CLIENT DOMAIN FOUND IN: ' + p);
        issues++;
      }
    }
  }
}
scan(root);
if (issues === 0) {
  console.log('Sanitization check PASSED: Zero sensitive tokens, zero client domains found.');
} else {
  console.error(`Sanitization check FAILED: ${issues} issue(s) detected.`);
  process.exit(1);
}
