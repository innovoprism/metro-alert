// Creates dist/metro-alert-v<version>-web.zip (the www folder, ready for Netlify/GitHub Pages)
const { execSync } = require('child_process'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const v = require('../package.json').version;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', `metro-alert-v${v}-web.zip`);
if (fs.existsSync(out)) fs.unlinkSync(out);
execSync(`cd "${path.join(root, 'www')}" && zip -rq "${out}" .`);
console.log('Created', path.relative(root, out));
