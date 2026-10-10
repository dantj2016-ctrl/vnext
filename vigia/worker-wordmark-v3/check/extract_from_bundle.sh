#!/usr/bin/env bash
# Usage: extract_from_bundle.sh <bundle.js|txt> <out.mjs>
# Extracts the wordmark block by MARKERS (not line numbers) so it also works on a patched bundle
# (a v=3 block added between wordmarkPng and wordmarkSig is included automatically).
# Start: line "var WORDMARK_ON"   End: line '__name(wordmarkUrlValid, "wordmarkUrlValid");'
# Exports every top-level function/var of the block that exists (incl. wordmarkPng3 / wordmarkPngAsync if present).
set -euo pipefail
SRC="$1"; OUT="$2"
S=$(grep -n '^var WORDMARK_ON' "$SRC" | head -1 | cut -d: -f1)
E=$(grep -n '^__name(wordmarkUrlValid, "wordmarkUrlValid");' "$SRC" | head -1 | cut -d: -f1)
BODY=$(sed -n "${S},${E}p" "$SRC")
NAMES=$(printf '%s\n' "$BODY" | grep -oE '^(async function|function|var) +[A-Za-z0-9_]+' | awk '{print $NF}' | sort -u | paste -sd, -)
{
 echo 'const __name = (target, value) => Object.defineProperty(target, "name", { value, configurable: true });'
 printf '%s\n' "$BODY"
 echo "export { ${NAMES//,/, } };"
 echo 'export const __setWordmarkVer = (v) => { WORDMARK_VER = v; };' | { grep -q 'WORDMARK_VER' <<<"$BODY" && cat || true; }
} > "$OUT"
echo "extracted lines $S-$E -> $OUT (exports: $NAMES)"
