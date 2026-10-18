#!/usr/bin/env bash
# Push this game's source to a public repository in the vibe-codebase GitHub organisation.
# Run from the game folder:  bash scripts/push-github.sh
# The upload keystore goes up zipped as keystore/<slug>-release.jks.zip (no passwords).
# AABs, APKs, credentials, .env files and node_modules never go up: they are git-ignored and checked again below.
set -euo pipefail
cd "$(dirname "$0")/.."

ORG="vibe-codebase"
COMPANY="$(node -p "require('./app.json').expo.extra.company")"
APP="$(node -p "require('./app.json').expo.name")"
SLUG="$(node -p "require('./app.json').expo.slug")"
REPO="$(printf %s "$COMPANY" | tr "[:lower:]" "[:upper:]" | sed -E "s/[^A-Z0-9]+/-/g; s/^-|-\$//g")_$(printf %s "$APP" | sed -E "s/[^A-Za-z0-9]+/-/g; s/^-|-\$//g")"   # e.g. PRIMEPICK-TRADERS-LTD_Umbra-Prime
[ -f .github-repo ] && REPO="$(tr -d "[:space:]" < .github-repo)"   # optional override of the repo name
URL="https://github.com/$ORG/$REPO.git"
PACK="$(ls -d Delivery/V1_*\(game\) 2>/dev/null | head -1 || true)"

echo "== Repository: $ORG/$REPO (public)"
[ -d .git ] || git init -q -b main
git config user.name "$SLUG"; git config user.email "release@$SLUG.invalid"
git branch -M main

# zipped copy of the upload keystore, refreshed whenever the pack holds one
if [ -n "$PACK" ] && [ -f "$PACK/$SLUG-release.jks" ]; then
  mkdir -p keystore && rm -f "keystore/$SLUG-release.jks.zip"
  zip -jqX "keystore/$SLUG-release.jks.zip" "$PACK/$SLUG-release.jks"
fi

git add -A
[ -f "keystore/$SLUG-release.jks.zip" ] && git add -f "keystore/$SLUG-release.jks.zip"
# never let build output or a secret other than the zipped keystore into the repository
if git diff --cached --name-only | grep -vE "^keystore/[^/]+-release\.jks\.zip$" | grep -E '\.(jks|keystore|aab|apk|p12|p8|key|zip)$|credentials\.json$|(^|/)\.env($|\.)|node_modules/' ; then
  echo "Refusing to push: the files above must stay out of the repository."; exit 1
fi
git diff --cached --quiet || git commit -qm "$APP source"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh repo view "$ORG/$REPO" >/dev/null 2>&1 || gh repo create "$ORG/$REPO" --public --description "$APP by $COMPANY"
else
  if ! git ls-remote "$URL" >/dev/null 2>&1; then
    echo "The GitHub CLI isn't signed in, and $ORG/$REPO doesn't exist yet."
    echo "Either run:  brew install gh && gh auth login   (then run this script again)"
    echo "or create a PUBLIC, EMPTY repository named $REPO at https://github.com/organizations/$ORG/repositories/new and run this again."
    exit 1
  fi
fi
git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$URL" || git remote add origin "$URL"
git push -u origin main
echo "Pushed: https://github.com/$ORG/$REPO"
