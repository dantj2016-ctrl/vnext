// Invariant checker for the wordmark generator.
//   node check_invariants.mjs [--module ./path/to/extract.mjs] [--ver 3] [--budget-ms 50] [--max-bytes 6500000] [--out dir]
// A: v=2 and v='' must be BYTE-IDENTICAL to golden_hashes.json (generated from the verbatim bundle block, lines 503-771).
// B: URL/signature/route behaviour (route logic = verbatim copy of bundle lines 3675-3681).
// C: for --ver N: PNG structurally valid (own CRC + zlib inflate + filter bytes), PIL decodable, consumer gates (fetchRaster/imageDimensions/logoDimsOk emulation), CPU budget, edge names.
import fs from "node:fs";
import zlib from "node:zlib";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NAMES, EDGE } from "./names.mjs";
import * as gates from "./consumer_gates_extract.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const modPath = path.resolve(HERE, arg("--module", "./wm_v2_extract.mjs"));
const VER = arg("--ver", "3"), BUDGET = Number(arg("--budget-ms", "50")), MAXB = Number(arg("--max-bytes", String(gates.FETCH_RASTER_MAX_BYTES)));
const OUT = path.resolve(arg("--out", path.join(HERE, "_check_out")));
fs.mkdirSync(OUT, { recursive: true });
const wm = await import(modPath);
// Route uses wordmarkPngAsync if the candidate made v=3 async (then bundle line 3678 gains an await); else the sync wordmarkPng.
const PNG = async (t, v) => (wm.wordmarkPngAsync ? wm.wordmarkPngAsync(t, v) : wm.wordmarkPng(t, v));
const golden = JSON.parse(fs.readFileSync(path.join(HERE, "golden_hashes.json"), "utf8"));
const env = { PAINEL_KEY: "TEST-KEY-NOT-A-SECRET-0123456789" };
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
let pass = 0, fail = 0;
const T = (name, ok, extra = "") => { (ok ? pass++ : fail++); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  [" + extra + "]" : "")); };

// ---- A. v=2 / v='' byte-identical
for (const [n, g] of Object.entries(golden)) {
  const t = wm.wordmarkText(n);
  T(`A text stable: ${JSON.stringify(n.slice(0, 30))}`, t === g.t);
  for (const [v, key] of [["2", "v2"], ["", "v1"]]) {
    const p = await PNG(t, v);
    const ok = g[key] === null ? p === null : (p && p.length === g[key].bytes && sha(p) === g[key].sha256);
    T(`A v=${v || "''"} byte-identical: ${JSON.stringify(n.slice(0, 30))}`, ok);
  }
}

// ---- B. URL / signature / route (route = verbatim copy of bundle 3675-3681; wordmarkUrlValid is the candidate's)
const WORDMARK_BASE = wm.WORDMARK_BASE;
async function route(urlStr) {
  const u = new URL(urlStr);
  const t = u.searchParams.get("t") || "";
  if (!await wm.wordmarkUrlValid(env, WORDMARK_BASE + "?t=" + encodeURIComponent(t) + "&s=" + (u.searchParams.get("s") || ""))) return { status: 403 };
  const png = await PNG(t, u.searchParams.get("v") || "");
  if (!png) return { status: 400 };
  return { status: 200, png, headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } };
}
if (wm.__setWordmarkVer) wm.__setWordmarkVer(VER); // emulates cfg FACTORY_WORDMARK_VER_V1=<VER> (setLogoHero)
const nm = NAMES[2], t0 = wm.wordmarkText(nm), sig = await wm.wordmarkSig(env, t0);
const baseUrl = (v) => `${WORDMARK_BASE}?t=${encodeURIComponent(t0)}&s=${sig}` + (v === null ? "" : `&v=${v}`);
T("B emitted URL by wordmarkUrl() ends with &v=" + VER + " (informational: baseline emits 2)", (await wm.wordmarkUrl(env, nm)).endsWith("&v=" + VER), (await wm.wordmarkUrl(env, nm)).slice(-12));
T("B wordmarkUrlValid accepts v=2 (OLD URLS MUST STAY VALID)", await wm.wordmarkUrlValid(env, baseUrl("2")));
T("B wordmarkUrlValid accepts v='' (legacy)", await wm.wordmarkUrlValid(env, baseUrl("")));
T("B wordmarkUrlValid accepts no v param", await wm.wordmarkUrlValid(env, baseUrl(null)));
T("B wordmarkUrlValid rejects bad signature", !(await wm.wordmarkUrlValid(env, baseUrl("2").replace(/s=[0-9a-f]{20}/, "s=" + "0".repeat(20)))));
T("B wordmarkUrlValid rejects other path", !(await wm.wordmarkUrlValid(env, baseUrl("2").replace("/wordmark.png", "/x.png"))));
T("B wordmarkUrlValid rejects non-canonical t", !(await wm.wordmarkUrlValid(env, `${WORDMARK_BASE}?t=${encodeURIComponent("abc")}&s=${await wm.wordmarkSig(env, "abc")}&v=2`)));
const vAcc = await wm.wordmarkUrlValid(env, baseUrl(VER));
T(`B wordmarkUrlValid accepts v=${VER} (needed or leads with official_site hit HERO_NOT_BOUND_TO_OFFICIAL_SITE, bundle 2740-2744)`, vAcc);
T("B wordmarkUrlValid rejects v=9 (unknown versions stay rejected by validator)", !(await wm.wordmarkUrlValid(env, baseUrl("9"))));
const r2 = await route(baseUrl("2")); T("B route v=2 -> 200 + immutable cache headers", r2.status === 200 && r2.headers["cache-control"] === "public, max-age=31536000, immutable" && r2.headers["content-type"] === "image/png");
T("B route bad sig -> 403", (await route(baseUrl("2").replace(/s=[0-9a-f]{20}/, "s=" + "1".repeat(20)))).status === 403);
T("B route 1-letter name -> 400 (needs >=2 alnum)", await (async () => { const a = wm.wordmarkText("A"); const r = await route(`${WORDMARK_BASE}?t=${a}&s=${await wm.wordmarkSig(env, a)}&v=${VER}`); return r.status === 400; })());

// ---- C. candidate version structural / consumer / budget checks
const crcTab = (b) => zlib.crc32 ? zlib.crc32(b) >>> 0 : null;
function pngCheck(png) {
  const e = [];
  const sig8 = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!sig8.every((x, i) => png[i] === x)) e.push("bad signature");
  let o = 8, ihdr = null, idat = [], seen = [], plte = null, end = false;
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (o + 12 <= png.length) {
    const len = dv.getUint32(o), type = String.fromCharCode(...png.subarray(o + 4, o + 8));
    const data = png.subarray(o + 8, o + 8 + len), crc = dv.getUint32(o + 8 + len);
    if (crcTab(png.subarray(o + 4, o + 8 + len)) !== crc) e.push("bad CRC in " + type);
    seen.push(type);
    if (type === "IHDR") ihdr = { w: dv.getUint32(o + 8), h: dv.getUint32(o + 12), depth: data[8], ctype: data[9], comp: data[10], filt: data[11], inter: data[12] };
    if (type === "PLTE") plte = data;
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") { end = true; o += 12 + len; break; }
    o += 12 + len;
  }
  if (!end) e.push("no IEND"); if (o !== png.length) e.push("trailing bytes");
  if (!ihdr) { e.push("no IHDR"); return { e, ihdr, seen }; }
  if (seen[0] !== "IHDR") e.push("IHDR not first");
  if (ihdr.inter !== 0) e.push("interlaced");
  const chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.ctype];
  let raw;
  try { raw = zlib.inflateSync(Buffer.concat(idat)); } catch (x) { e.push("zlib inflate failed: " + x.message); return { e, ihdr, seen }; }
  const stride = Math.ceil(ihdr.w * chans * ihdr.depth / 8);
  if (raw.length !== (stride + 1) * ihdr.h) e.push(`raw size ${raw.length} != ${(stride + 1) * ihdr.h}`);
  for (let y = 0; y < ihdr.h; y++) if (raw[y * (stride + 1)] > 4) { e.push("bad filter byte row " + y); break; }
  if (ihdr.ctype === 3 && !plte) e.push("palette image without PLTE");
  return { e, ihdr, seen, idatBytes: idat.reduce((n, d) => n + d.length, 0) };
}
console.log(`\n--- C. checks for version v=${VER} using module ${path.relative(HERE, modPath)} ---`);
const files = [], rows = [];
const all = [...NAMES, ...EDGE];
for (const [k, n] of all.entries()) {
  const t = wm.wordmarkText(n);
  const nullV2 = (await PNG(t, "2")) === null;
  let png = null, err = "";
  const times = [];
  try { for (let i = 0; i < 5; i++) { const a = performance.now(); png = await PNG(t, VER); times.push(performance.now() - a); } } catch (x) { err = x.message; }
  if (err) { T(`C no throw: ${JSON.stringify(n.slice(0, 30))}`, false, err); continue; }
  if (nullV2) { T(`C null-contract preserved (<2 alnum -> null): ${JSON.stringify(n.slice(0, 30))}`, png === null); continue; }
  if (!png) { T(`C non-null for valid name: ${JSON.stringify(n.slice(0, 30))}`, false); continue; }
  const chk = pngCheck(png);
  const d = gates.imageDimensions(png);
  const warm = [...times].sort((a, b) => a - b)[2];
  const okc = chk.e.length === 0 && gates.rasterMime(png, "image/png") === "image/png" && gates.rasterMime(png, "") === "image/png" && d && gates.logoDimsOk(d.width, d.height) && png.length <= MAXB && png.length > 0;
  T(`C valid+gates ${d ? d.width + "x" + d.height : "?"} ${png.length}B ${warm.toFixed(1)}ms: ${JSON.stringify(n.slice(0, 34))}`, okc, chk.e.join("; "));
  T(`C CPU first-call ${times[0].toFixed(1)}ms / warm-median ${warm.toFixed(1)}ms <= ${BUDGET}ms`, warm <= BUDGET && times[0] <= BUDGET * 2);
  const f = path.join(OUT, `v${VER}_${String(k + 1).padStart(2, "0")}.png`); fs.writeFileSync(f, png); files.push(f);
  rows.push({ n, bytes: png.length, warm_ms: +warm.toFixed(2), first_ms: +times[0].toFixed(2), colortype: chk.ihdr && chk.ihdr.ctype, size: d, idat: chk.idatBytes });
}
if (files.length) {
  const r = spawnSync("python3", ["-I", path.join(HERE, "pil_check.py"), ...files], { encoding: "utf8", maxBuffer: 1 << 26 });
  let pil = []; try { pil = JSON.parse(r.stdout); } catch { T("C PIL decode run", false, (r.stderr || "").slice(0, 200)); }
  for (const p of pil) T(`C PIL strict decode ${path.basename(p.file)}`, p.ok && p.ink_frac > 0.003 && p.ink_frac < 0.6, p.ok ? `${p.size} ${p.mode} alpha_min=${p.alpha_min} ink=${p.ink_frac} bbox=${JSON.stringify(p.bbox)}` : p.error);
}
// same name -> same bytes (determinism; needed because fetchRaster + OpenAI + builder each re-request the URL)
{ const t = wm.wordmarkText(NAMES[3]); const a = await PNG(t, VER), b = await PNG(t, VER); T("C deterministic (two calls byte-equal)", a && b && sha(a) === sha(b)); }
fs.writeFileSync(path.join(OUT, `summary_v${VER}.json`), JSON.stringify(rows, null, 1));
console.log(`\nTOTAL PASS=${pass} FAIL=${fail}`);
process.exit(fail ? 1 : 0);
