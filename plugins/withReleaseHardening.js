const fs = require('fs');
const path = require('path');
/**
 * Production hardening for the Android release build:
 * - the manifest declares the app a game (so Android 16+ large-screen rules keep it in its designed portrait
 *   orientation), keeps the game in one full-screen window, forbids cleartext traffic and is never debuggable;
 * - the release build type is non-debuggable, minified and resource-shrunk by R8 (with the template's proguard files);
 * - our R8 rules (plugins/proguard-rules.pro) are appended to the app's proguard-rules.pro;
 * - release builds carry no network permissions at all (the game is offline); debug builds keep them for Metro.
 */
const RELEASE_MANIFEST = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <!-- release-hardening: the game runs fully offline, so the release build asks for no network access -->
  <uses-permission android:name="android.permission.INTERNET" tools:node="remove" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" tools:node="remove" />
  <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" tools:node="remove" />
</manifest>
`;
module.exports = function withReleaseHardening(config) {
  const { withAndroidManifest, withAppBuildGradle, withGradleProperties, withDangerousMod } = require('@expo/config-plugins');
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:appCategory'] = 'game';
      app.$['android:usesCleartextTraffic'] = 'false';
      delete app.$['android:debuggable'];
      delete app.$['android:testOnly'];
      // a portrait game: one full-screen window (no split-screen squeeze); Android 16 honours this for games
      for (const act of app.activity ?? []) if (act.$['android:name'] === '.MainActivity') act.$['android:resizeableActivity'] = 'false';
    }
    return mod;
  });
  config = withGradleProperties(config, (mod) => {
    const set = (key, value) => {
      const i = mod.modResults.findIndex((p) => p.type === 'property' && p.key === key);
      if (i >= 0) mod.modResults[i].value = value; else mod.modResults.push({ type: 'property', key, value });
    };
    set('android.enableMinifyInReleaseBuilds', 'true');
    set('android.enableShrinkResourcesInReleaseBuilds', 'true');
    set('android.enablePngCrunchInReleaseBuilds', 'true');
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    let s = mod.modResults.contents;
    const marker = '// release-hardening';
    if (!s.includes(marker)) {
      s = s.replace(/buildTypes\s*\{([\s\S]*?)release\s*\{/, (m) => `${m}\n            ${marker}\n            debuggable false\n            jniDebuggable false\n            minifyEnabled true\n            shrinkResources true`);
    }
    mod.modResults.contents = s;
    return mod;
  });
  config = withDangerousMod(config, ['android', async (mod) => {
    const rules = path.join(mod.modRequest.projectRoot, 'plugins', 'proguard-rules.pro');
    const dest = path.join(mod.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
    if (fs.existsSync(rules)) {
      const ours = fs.readFileSync(rules, 'utf8'), cur = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
      if (!cur.includes('# release-hardening')) fs.writeFileSync(dest, `${cur}\n# release-hardening\n${ours}`);
    }
    const rel = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'release', 'AndroidManifest.xml');
    fs.mkdirSync(path.dirname(rel), { recursive: true }); fs.writeFileSync(rel, RELEASE_MANIFEST);
    return mod;
  }]);
  return config;
};
