#!/usr/bin/env bash
# Cloud release build for this game: the keystore is generated and kept on the Expo server, and the AAB is built by EAS.
# Nothing is compiled on this computer. Run from the game folder:  bash scripts/eas-release.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PACK="$(ls -d Delivery/V1_*\(game\) | head -1)"
SLUG="$(node -p "require('./app.json').expo.slug")"
OWNER="$(node -p "require('./app.json').expo.owner")"
EAS="npx --yes eas-cli@latest"
export EXPO_NO_METRO_WORKSPACE_ROOT=1 EXPO_NO_TELEMETRY=1

echo "== 1/7 Expo account"
if ! WHO="$($EAS whoami 2>/dev/null | head -1)"; then $EAS login; WHO="$($EAS whoami | head -1)"; fi
echo "Signed in as: $WHO (app.json owner: $OWNER)"
if [ "$(printf %s "$WHO" | tr A-Z a-z)" != "$(printf %s "$OWNER" | tr A-Z a-z)" ]; then
  echo "The signed-in account is not $OWNER. Sign in as $OWNER (eas logout && eas login), or set expo.owner in app.json."; exit 1
fi
node -e "const f='app.json',a=require('./'+f);a.expo.owner='$WHO';require('fs').writeFileSync(f,JSON.stringify(a,null,2)+'\n')"

echo "== 2/7 Dependencies"
npm ci --no-audit --no-fund

echo "== 3/7 Project link (writes extra.eas.projectId into app.json)"
node -e "process.exit(require('./app.json').expo.extra?.eas?.projectId?0:1)" || $EAS init --non-interactive --force

echo "== 4/7 GitHub (public repo in vibe-codebase)"
bash scripts/push-github.sh || echo "GitHub push skipped: see the message above. The build continues."

echo "== 5/7 EAS cloud build (production AAB). EAS generates the upload keystore and stores it on the Expo server."
$EAS build -p android --profile production --non-interactive --wait
URL="$($EAS build:list -p android --status finished --limit 1 --json --non-interactive | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)[0].artifacts.buildUrl))")"
curl -fL "$URL" -o "$PACK/$SLUG-release.aab"
echo "AAB saved: $PACK/$SLUG-release.aab"
VC="$(node -p "require('./app.json').expo.android.versionCode")"
sed -i '' -E "s/\(versionCode [0-9]+\)/(versionCode $VC)/" "$PACK/PACKAGE.txt"

echo "== 6/7 Keystore into the pack"
/usr/bin/expect scripts/eas-keystore.exp || echo "Keystore download failed: run 'eas credentials -p android' → production → credentials.json → Download, then run this step's commands again."
[ -f credentials/android/keystore.jks ] && mv credentials/android/keystore.jks "$PACK/$SLUG-release.jks"
rm -rf credentials credentials.json   # passwords stay on the Expo server only
find Delivery -name .DS_Store -delete
ls -la "$PACK"

echo "== 7/7 GitHub again (release state + zipped keystore)"
bash scripts/push-github.sh || echo "GitHub push skipped: see the message above."
echo "Done."
