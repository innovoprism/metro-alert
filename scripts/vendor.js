// Copies Leaflet + Capacitor core into www/vendor so the app works offline (no CDN).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www', 'vendor');
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(path.join(root, 'node_modules', from), to, { recursive: true });
};
copy('leaflet/dist/leaflet.js', path.join(out, 'leaflet', 'leaflet.js'));
copy('leaflet/dist/leaflet.css', path.join(out, 'leaflet', 'leaflet.css'));
copy('leaflet/dist/images', path.join(out, 'leaflet', 'images'));
copy('leaflet-rotate/dist/leaflet-rotate.js', path.join(out, 'leaflet-rotate.js'));
copy('@capacitor/core/dist/capacitor.js', path.join(out, 'capacitor.js'));
console.log('Vendored libraries into www/vendor');
