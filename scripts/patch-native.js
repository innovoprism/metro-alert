// Adds the permissions/background modes the alarm needs to the native projects.
// Run after `npx cap add android|ios`. Safe to run more than once.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2];

if (target === 'android') {
  const f = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  let x = fs.readFileSync(f, 'utf8');
  const perms = [
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_LOCATION',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.VIBRATE',
    'android.permission.WAKE_LOCK'
  ];
  for (const p of perms) {
    if (!x.includes(`"${p}"`)) x = x.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
  }
  fs.writeFileSync(f, x);
  console.log('Patched AndroidManifest.xml');

  // Native wake-up alarm (continuous vibration + looping alarm tone), see native/android/
  const appId = require('../capacitor.config.json').appId;
  const javaDir = path.join(root, 'android/app/src/main/java', ...appId.split('.'));
  const plugin = fs.readFileSync(path.join(root, 'native/android/AlarmVibePlugin.java'), 'utf8')
    .replace(/^package [^;]+;/m, `package ${appId};`);
  fs.writeFileSync(path.join(javaDir, 'AlarmVibePlugin.java'), plugin);
  const mainF = path.join(javaDir, 'MainActivity.java');
  fs.writeFileSync(mainF, `package ${appId};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmVibePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);
  console.log('Added AlarmVibePlugin (continuous vibration) and registered it in MainActivity');
} else if (target === 'ios') {
  const f = path.join(root, 'ios/App/App/Info.plist');
  let x = fs.readFileSync(f, 'utf8');
  const add = (key, val) => {
    if (!x.includes(`<key>${key}</key>`)) x = x.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${val}\n</dict>\n</plist>\n`);
  };
  const msg = '<string>Metro Alert uses your location to wake you before your stop.</string>';
  add('NSLocationWhenInUseUsageDescription', msg);
  add('NSLocationAlwaysAndWhenInUseUsageDescription', msg);
  add('NSLocationAlwaysUsageDescription', msg);
  add('UIBackgroundModes', '<array>\n\t\t<string>location</string>\n\t\t<string>audio</string>\n\t</array>');
  fs.writeFileSync(f, x);
  console.log('Patched Info.plist');
} else {
  console.error('Usage: node scripts/patch-native.js android|ios');
  process.exit(1);
}

// keep native version numbers in step with package.json
require('./version.js');
