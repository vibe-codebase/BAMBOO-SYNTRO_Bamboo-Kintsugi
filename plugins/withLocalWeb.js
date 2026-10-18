const fs = require('fs');
const path = require('path');
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}
/** Copies the bundled offline web game (assets/www) into the Android app's assets during prebuild. */
module.exports = function withLocalWeb(config) {
  const { withDangerousMod } = require('@expo/config-plugins');
  return withDangerousMod(config, ['android', async (mod) => {
    const src = path.join(mod.modRequest.projectRoot, 'assets', 'www');
    const dest = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/assets/www');
    if (fs.existsSync(src)) { fs.rmSync(dest, { recursive: true, force: true }); copyDir(src, dest); }
    return mod;
  }]);
};
