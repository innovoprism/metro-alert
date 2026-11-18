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
  const rawDir = path.join(root, 'android/app/src/main/res/raw');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.copyFileSync(path.join(root, 'www/alarm.wav'), path.join(rawDir, 'alarm.wav'));
  console.log('Added res/raw/alarm.wav (notification sound)');
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

  // Native wake-up alarm (AlarmVibe) + view controller that registers it, see native/ios/
  const appDir = path.join(root, 'ios/App/App');
  const pbxF = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj');
  let pbx = fs.readFileSync(pbxF, 'utf8');
  const ref = /([0-9A-F]{24}) \/\* AppDelegate\.swift \*\/ = \{isa = PBXFileReference/.exec(pbx);
  const bld = /([0-9A-F]{24}) \/\* AppDelegate\.swift in Sources \*\/ = \{isa = PBXBuildFile/.exec(pbx);
  if (!ref || !bld) throw new Error('Could not find AppDelegate.swift in project.pbxproj');
  let n = 0;
  const newId = () => ('AA11' + String(Date.now() % 1e8).padStart(8, '0') + String(++n).padStart(12, '0')).slice(0, 24);
  for (const file of ['AlarmVibePlugin.swift', 'MainViewController.swift']) {
    fs.copyFileSync(path.join(root, 'native/ios', file), path.join(appDir, file));
    if (pbx.includes(`/* ${file} */`)) continue;
    const fr = newId(), bf = newId();
    pbx = pbx
      .replace('/* Begin PBXBuildFile section */', `/* Begin PBXBuildFile section */\n\t\t${bf} /* ${file} in Sources */ = {isa = PBXBuildFile; fileRef = ${fr} /* ${file} */; };`)
      .replace('/* Begin PBXFileReference section */', `/* Begin PBXFileReference section */\n\t\t${fr} /* ${file} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${file}; sourceTree = "<group>"; };`)
      .replace(new RegExp(`(\\t+)${ref[1]} /\\* AppDelegate\\.swift \\*/,`), (m, tabs) => `${m}\n${tabs}${fr} /* ${file} */,`)
      .replace(new RegExp(`(\\t+)${bld[1]} /\\* AppDelegate\\.swift in Sources \\*/,`), (m, tabs) => `${m}\n${tabs}${bf} /* ${file} in Sources */,`);
  }
  fs.writeFileSync(pbxF, pbx);
  const sbF = path.join(appDir, 'Base.lproj/Main.storyboard');
  fs.writeFileSync(sbF, fs.readFileSync(sbF, 'utf8')
    .replace('customClass="CAPBridgeViewController" customModule="Capacitor"', 'customClass="MainViewController" customModule="App" customModuleProvider="target"'));
  console.log('Added AlarmVibePlugin (background vibration + alarm sound) and MainViewController');
} else {
  console.error('Usage: node scripts/patch-native.js android|ios');
  process.exit(1);
}

// keep native version numbers in step with package.json
require('./version.js');
