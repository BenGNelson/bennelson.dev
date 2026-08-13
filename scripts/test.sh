#!/usr/bin/env bash
# Static checks for bennelson.dev. Everything runs on the host or in throwaway
# containers — no host Node required. `scripts/test.sh secrets` runs only the
# forbidden-pattern scan.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0

secrets_scan() {
  echo "── forbidden patterns (mirrors the pre-commit scan)"
  if [ -f .githooks/patterns.local ]; then
    local hits
    hits=$(grep -rInE -f <(grep -v '^#' .githooks/patterns.local | grep -v '^[[:space:]]*$') \
      --exclude-dir=.git --exclude-dir=.githooks . || true)
    if [ -n "$hits" ]; then
      echo "$hits"
      return 1
    fi
    echo "   ok"
  else
    echo "   skipped (no .githooks/patterns.local — run workspace sync)"
  fi
}

if [ "${1:-}" = "secrets" ]; then
  secrets_scan || exit 1
  exit 0
fi

echo "── JS syntax (containerized node --check)"
docker run --rm -v "$PWD":/app -w /app node:20-alpine \
  sh -c 'for f in site/js/*.js; do node --check "$f" || exit 1; done'
echo "   ok"

echo "── every page has the mode-boot pre-paint script in <head>"
for f in site/index.html site/404.html site/*/index.html; do
  [ -f "$f" ] || continue
  case "$f" in site/hq-demo/*) continue ;; esac
  if ! grep -q 'js/mode-boot.js' "$f"; then
    echo "   missing mode-boot: $f"
    fail=1
  fi
done
[ "$fail" -eq 0 ] && echo "   ok"

echo "── internal links resolve to files"
links=$(grep -rhoE 'href="/[^"#?]*"|src="/[^"#?]*"' site --include='*.html' \
  | sed -E 's/^(href|src)="([^"]*)"$/\2/' | sort -u)
for l in $links; do
  p="site${l}"
  if [ -d "$p" ]; then p="${p%/}/index.html"; fi
  if [ ! -f "$p" ]; then
    echo "   dead link: $l"
    fail=1
  fi
done
[ "$fail" -eq 0 ] && echo "   ok"

echo "── vendored froggy-bird matches its stamped version"
if [ -f site/vendor/froggy-bird/.version ]; then
  ver="$(cat site/vendor/froggy-bird/.version)"
  src="${FROGGY_SRC:-../froggy-bird}"
  if [ -d "$src" ]; then
    for f in froggy-bird.js froggy-bird.css; do
      if ! diff -q <(tail -n +2 "site/vendor/froggy-bird/$f") \
                   <(git -C "$src" show "v${ver}:${f}" 2>/dev/null) >/dev/null 2>&1; then
        echo "   drift: site/vendor/froggy-bird/$f != froggy-bird v${ver} — run scripts/sync-froggy.sh"
        fail=1
      fi
    done
    [ "$fail" -eq 0 ] && echo "   ok (v${ver})"
  else
    echo "   skipped (no froggy-bird checkout at $src)"
  fi
else
  echo "   skipped (nothing vendored yet)"
fi

secrets_scan || fail=1

if [ "$fail" -ne 0 ]; then
  echo "✖ tests failed"
  exit 1
fi
echo "✔ all checks passed"
