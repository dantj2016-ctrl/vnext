#!/usr/bin/env python3
"""Apply the wordmark v=3 edits to the Worker's index.js (esbuild bundle OR src/index.js).
Usage: python3 apply_wordmark_v3.py <in index.js> <out index.js> --mode bundle|src
  bundle: inlines wordmark3.js (+fonts) as an IIFE (used to test against the deployed bundle).
  src   : adds `import { wm3 } from "./wordmark3.js"`; copy wordmark3.js + wordmark3_fonts.js next to index.js.
Every edit asserts that its anchor occurs EXACTLY once and aborts otherwise: a mismatch is loud, never silent.
v=2 and legacy v='' code is NOT edited. v=3 is EMITTED only when Airtable Config FACTORY_WORDMARK_VER_V1 = 3 (default: unchanged v=2)."""
import re, sys, os
src_path, out_path, mode = sys.argv[1], sys.argv[2], sys.argv[sys.argv.index('--mode') + 1]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src_path).read()
def rep(s, old, new, name):
    n = s.count(old)
    if n != 1:
        sys.exit("ABORT edit %s: anchor found %d times (expected 1): %r" % (name, n, old[:70]))
    return s.replace(old, new)
ASYNC = (
'async function wordmarkPngAsync(name, ver = "") {\n'
'  if (String(ver) !== "3") return wordmarkPng(name, ver);\n'
'  const t = wm3.wordmarkText3(name);\n'
'  if (t.replace(/[^A-Z0-9]/g, "").length < 2) return null;\n'
'  return wm3.wordmarkPngV3(t, wm3.pickVariant(t));\n'
'}\n')
# E1 version switch (emission only)
s = rep(s, 'var WORDMARK_ON = false;\n', 'var WORDMARK_ON = false;\nvar WORDMARK_VER = "2";\n', 'E1 WORDMARK_VER')
# E2 module + async renderer, inserted right before wordmarkSig (after wordmarkPng)
anchor = 'async function wordmarkSig(env, text) {'
if mode == 'bundle':
    mod = open(os.path.join(here, 'wordmark3.js')).read()
    fonts = open(os.path.join(here, 'wordmark3_fonts.js')).read()
    fonts = re.sub(r'^export const FONTS', 'const FONTS', fonts, flags=re.M)
    mod = mod.replace('import { FONTS } from "./wordmark3_fonts.js";\n', '')
    mod = re.sub(r'^export (async function|function|const)', r'\1', mod, flags=re.M)
    assert 'export ' not in mod.replace('exports', '')
    body = fonts + '\n' + mod
    ind = '\n'.join(('  ' + l if l.strip() else l) for l in body.split('\n'))
    block = 'var wm3 = (() => {\n' + ind + '\n  return wm3;\n})();\n' + ASYNC + '__name(wordmarkPngAsync, "wordmarkPngAsync");\n'
else:
    block = ASYNC
    first = 'import { WorkflowEntrypoint } from "cloudflare:workers";\n'
    s = rep(s, first, first + 'import { wm3 } from "./wordmark3.js";\n', 'E2a import')
s = rep(s, anchor, block + anchor, 'E2 async renderer')
# E3 emission uses the v3 text/version only when the flag is on
s = rep(s, 'async function wordmarkUrl(env, name) {\n  const t = wordmarkText(name);\n  if (t.replace(/[^A-Z0-9]/g, "").length < 2 || !env?.PAINEL_KEY) return "";\n  return WORDMARK_BASE + "?t=" + encodeURIComponent(t) + "&s=" + await wordmarkSig(env, t) + "&v=2";\n}',
        'async function wordmarkUrl(env, name) {\n  const t = WORDMARK_VER === "3" ? wm3.wordmarkText3(name) : wordmarkText(name);\n  if (t.replace(/[^A-Z0-9]/g, "").length < 2 || !env?.PAINEL_KEY) return "";\n  return WORDMARK_BASE + "?t=" + encodeURIComponent(t) + "&s=" + await wordmarkSig(env, t) + "&v=" + (WORDMARK_VER === "3" ? "3" : "2");\n}', 'E3 wordmarkUrl')
# E4 validator accepts v=3 ALWAYS (already-issued v=3 URLs stay valid even if the flag is turned off)
s = rep(s, '    return (v === "" || v === "2") && t === wordmarkText(t) && u.searchParams.get("s") === await wordmarkSig(env, t);',
        '    return (v === "" || v === "2" || v === "3") && t === (v === "3" ? wm3.wordmarkText3(t) : wordmarkText(t)) && u.searchParams.get("s") === await wordmarkSig(env, t);', 'E4 wordmarkUrlValid')
# E5 route
s = rep(s, '      const png = wordmarkPng(t, u.searchParams.get("v") || "");', '      const png = await wordmarkPngAsync(t, u.searchParams.get("v") || "");', 'E5 route')
# E6 flag read
old6 = '  WORDMARK_ON = LOGO_HERO_ENABLED && String(cfg?.FACTORY_GENERATED_WORDMARK_V1 || "").trim().toUpperCase() === "TRUE";\n'
s = rep(s, old6, old6 + '  WORDMARK_VER = String(cfg?.FACTORY_WORDMARK_VER_V1 || "").trim() === "3" ? "3" : "2";\n', 'E6 flag')
open(out_path, 'w').write(s)
print("OK %s: 6 edits applied -> %s (%d bytes)" % (mode, out_path, len(s)))
