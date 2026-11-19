// Creates dist/metro-alert-v<version>-web.zip (the www folder, ready for Netlify/GitHub Pages)
const { execSync } = require('child_process'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const v = require('../package.json').version;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', `metro-alert-v${v}-web.zip`);
if (fs.existsSync(out)) fs.unlinkSync(out);
execSync(`cd "${path.join(root, 'www')}" && zip -rq "${out}" .`);
console.log('Created', path.relative(root, out));

// Release notes with a hidden marker telling installed apps which binary version is needed.
// If an update only changes web code (www/), apps update themselves over the air;
// if it changes native code, bump "nativeMin" in package.json and apps ask to reinstall.
const pkg = require('../package.json');
fs.writeFileSync(path.join(root, 'dist', 'release-notes.md'),
  `<!-- native-min: ${pkg.nativeMin || v} -->\n` + fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'));
console.log('Created dist/release-notes.md (native-min ' + (pkg.nativeMin || v) + ')');
