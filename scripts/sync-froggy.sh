#!/usr/bin/env bash
# Vendor the froggy-bird module into site/vendor/froggy-bird/ from a sibling
# checkout (override with FROGGY_SRC=/path/to/froggy-bird). The vendored copies
# are never edited in place — fix the game in its own repo, then re-run this.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${FROGGY_SRC:-../froggy-bird}"
[ -f "$SRC/froggy-bird.js" ] || {
  echo "✖ froggy-bird checkout not found at $SRC (set FROGGY_SRC)" >&2
  exit 1
}
if [ -n "$(git -C "$SRC" status --porcelain 2>/dev/null)" ]; then
  echo "✖ refusing to vendor: $SRC has uncommitted changes" >&2
  exit 1
fi

ver="$(cat "$SRC/VERSION")"
mkdir -p site/vendor/froggy-bird
for f in froggy-bird.js froggy-bird.css; do
  {
    printf '/* froggy-bird v%s — vendored, do not edit; run scripts/sync-froggy.sh */\n' "$ver"
    cat "$SRC/$f"
  } > "site/vendor/froggy-bird/$f"
done
printf '%s\n' "$ver" > site/vendor/froggy-bird/.version

echo "✔ vendored froggy-bird v$ver"
git status --short site/vendor/froggy-bird
