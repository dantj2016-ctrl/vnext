// wordmark_v3.mjs - zero-dependency premium wordmark generator (design B "Arco", reserve design D "Capitular").
// Pure JS: glyph outlines (FONTS, OFL) + own non-zero scanline anti-aliased rasterizer + own PNG writer. No canvas, no DOM, no system fonts, no AI call.
// Runs unchanged in Node 22 and in a Cloudflare Worker (only CompressionStream is used, with a stored-deflate fallback).
import { FONTS } from "./wordmark3_fonts.js";

// ===================== 1. glyph parsing, layout, flattening =====================
const CMD = /([mlhvqcz])([^mlhvqcz]*)/g, PATHS = new Map();
function parseD(d) {
  const out = []; let cur = null, cx = 0, cy = 0, sx = 0, sy = 0, m; CMD.lastIndex = 0;
  while ((m = CMD.exec(d))) {
    const t = m[1], a = m[2].trim() ? m[2].trim().split(/\s+/).map(Number) : [];
    if (t === "m") { cx += a[0]; cy += a[1]; sx = cx; sy = cy; cur = [["m", cx, cy]]; out.push(cur); }
    else if (t === "l") { cx += a[0]; cy += a[1]; cur.push(["l", cx, cy]); }
    else if (t === "h") { cx += a[0]; cur.push(["l", cx, cy]); }
    else if (t === "v") { cy += a[0]; cur.push(["l", cx, cy]); }
    else if (t === "q") { cur.push(["q", cx + a[0], cy + a[1], cx + a[2], cy + a[3]]); cx += a[2]; cy += a[3]; }
    else if (t === "c") { cur.push(["c", cx + a[0], cy + a[1], cx + a[2], cy + a[3], cx + a[4], cy + a[5]]); cx += a[4]; cy += a[5]; }
    else { cx = sx; cy = sy; }
  }
  return out;
}
const pathOf = (font, key) => { const id = font.cap + ":" + key + ":" + (font.p[key] || (font.marks && font.marks[key.slice(1)]) || "").length; let p = PATHS.get(id); if (!p) { p = parseD(key[0] === "@" ? font.marks[key.slice(1)] : font.p[key]); PATHS.set(id, p); } return p; };
const isMark = (c) => c >= "̀" && c <= "ͯ";
function glyphFor(font, base, marks) {
  const nfc = (base + marks).normalize("NFC"), ch = nfc.length === 1 ? nfc : base;
  if (font.comp && font.comp[ch]) return { adv: font.adv[ch], parts: font.comp[ch] };
  if (font.p[ch]) return { adv: font.adv[ch], parts: [[ch, 0, 0]] };
  if (font.p[base]) return { adv: font.adv[base], parts: [[base, 0, 0]] }; // unknown accent: keep the letter, drop the mark
  return null;
}
function layoutText(font, text, size, track, space = 0.28) {
  const s = size / 1000, items = [], chars = [...String(text).normalize("NFD")]; let x = 0, prev = null;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]; if (isMark(c)) continue;
    if (c === " ") { x += size * (space + track); prev = null; continue; }
    let marks = ""; while (i + 1 < chars.length && isMark(chars[i + 1])) marks += chars[++i];
    const g = glyphFor(font, c, marks); if (!g) continue;
    if (prev !== null && font.kern) x += (font.kern[prev + c] || 0) * s;
    items.push({ g, x }); x += g.adv * s + size * track; prev = c;
  }
  const last = items[items.length - 1];
  return { items, width: last ? last.x + last.g.adv * s : 0, size };
}
function flatten(contours, T, tol = 0.08) {
  const out = [], ap = (x, y) => [T[0] * x + T[2] * y + T[4], T[1] * x + T[3] * y + T[5]];
  for (const c of contours) {
    const pts = []; let px = 0, py = 0;
    for (const seg of c) {
      if (seg[0] === "m" || seg[0] === "l") { [px, py] = ap(seg[1], seg[2]); pts.push(px, py); }
      else if (seg[0] === "q") {
        const [x1, y1] = ap(seg[1], seg[2]), [x2, y2] = ap(seg[3], seg[4]), n = Math.max(2, Math.min(40, Math.ceil(Math.sqrt(Math.hypot(px - 2 * x1 + x2, py - 2 * y1 + y2) / 4 / tol))));
        for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; pts.push(u * u * px + 2 * u * t * x1 + t * t * x2, u * u * py + 2 * u * t * y1 + t * t * y2); } px = x2; py = y2;
      } else {
        const [x1, y1] = ap(seg[1], seg[2]), [x2, y2] = ap(seg[3], seg[4]), [x3, y3] = ap(seg[5], seg[6]);
        const n = Math.max(2, Math.min(48, Math.ceil(Math.sqrt(0.75 * Math.max(Math.hypot(px - 2 * x1 + x2, py - 2 * y1 + y2), Math.hypot(x1 - 2 * x2 + x3, y1 - 2 * y2 + y3)) / tol))));
        for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; pts.push(u * u * u * px + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * py + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3); } px = x3; py = y3;
      }
    }
    if (pts.length >= 6) out.push(Float64Array.from(pts));
  }
  return out;
}
// horizontal text -> contours. (x, y) = baseline anchor. size in px of em.
function drawText(font, text, { size, track = 0, x, y, anchor = "c", space }) {
  const L = layoutText(font, text, size, track, space), ox = anchor === "c" ? -L.width / 2 : anchor === "r" ? -L.width : 0, s = size / 1000, out = [];
  for (const it of L.items) for (const [key, dx, dy] of it.g.parts) for (const c of flatten(pathOf(font, key), [s, 0, 0, -s, x + ox + it.x + dx * s, y - dy * s])) out.push(c);
  return { contours: out, width: L.width };
}
const sizeForCap = (font, cap) => cap / (font.cap / 1000);
const widthAt = (font, str, cap, track) => layoutText(font, str, sizeForCap(font, cap), track).width;
const textLine = (font, str, { cap, track, y, x = 600 }) => drawText(font, str, { size: sizeForCap(font, cap), track, x, y });

// ===================== 2. shapes + stroker =====================
const circlePts = (cx, cy, r, n = Math.max(24, Math.ceil(r * 0.9))) => { const a = new Float64Array(n * 2); for (let i = 0; i < n; i++) { const t = i / n * 6.283185307; a[2 * i] = cx + r * Math.cos(t); a[2 * i + 1] = cy + r * Math.sin(t); } return a; };
const arcPts = (cx, cy, rx, ry, a0, a1, step = 0.02) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step)), a = new Float64Array((n + 1) * 2); for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; a[2 * i] = cx + rx * Math.cos(t); a[2 * i + 1] = cy + ry * Math.sin(t); } return a; };
const area = (p) => { let a = 0; for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; } return a; };
const pos = (p) => { if (area(p) >= 0) return p; const n = p.length / 2, q = new Float64Array(p.length); for (let i = 0; i < n; i++) { q[2 * i] = p[2 * (n - 1 - i)]; q[2 * i + 1] = p[2 * (n - 1 - i) + 1]; } return q; };
function stroke(pts, w, closed = false) { // polyline -> union of positively oriented quads + round joins (non-zero fill = union)
  const out = [], r = w / 2, n = pts.length / 2, segs = closed ? n : n - 1, nc = Math.max(10, Math.ceil(r * 3)); let prev = null;
  const joinAt = (x, y, a) => { if (prev === null) return; let d = Math.abs(a - prev); d = Math.min(d, 6.283185307 - d); if (d > 0.12) out.push(pos(circlePts(x, y, r, nc))); };
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n, x0 = pts[2 * i], y0 = pts[2 * i + 1], x1 = pts[2 * j], y1 = pts[2 * j + 1], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 1e-9) continue;
    const nx = -dy / L * r, ny = dx / L * r, a = Math.atan2(dy, dx);
    out.push(pos(Float64Array.of(x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny))); joinAt(x0, y0, a); prev = a;
  }
  if (closed && prev !== null) joinAt(pts[0], pts[1], Math.atan2(pts[3] - pts[1], pts[2] - pts[0]));
  return out;
}
const line = (x0, y0, x1, y1, w) => stroke(Float64Array.of(x0, y0, x1, y1), w);
const disc = (cx, cy, r) => [pos(circlePts(cx, cy, r))];
const diamond = (cx, cy, rx, ry = rx) => [pos(Float64Array.of(cx, cy - ry, cx + rx, cy, cx, cy + ry, cx - rx, cy))];
const ring = (cx, cy, r, w) => stroke(circlePts(cx, cy, r, Math.max(72, Math.ceil(r * 1.2))), w, true);
const bbox = (cs) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of cs) for (let i = 0; i < p.length; i += 2) { if (p[i] < a) a = p[i]; if (p[i] > c) c = p[i]; if (p[i + 1] < b) b = p[i + 1]; if (p[i + 1] > d) d = p[i + 1]; } return { x0: a, y0: b, x1: c, y1: d, w: c - a, h: d - b }; };
const shift = (cs, dx, dy) => cs.map((c) => { const o = new Float64Array(c.length); for (let i = 0; i < c.length; i += 2) { o[i] = c[i] + dx; o[i + 1] = c[i + 1] + dy; } return o; });

// ===================== 3. rasterizer (non-zero, exact horizontal coverage, 8 vertical sub-scanlines) =====================
const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const solid = (h) => { const c = hexRGB(h); return { at(x, y, o) { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; } }; };
function linear(x0, y0, x1, y1, stops) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, S = stops.map(([t, h]) => [t, hexRGB(h)]), lut = new Float32Array(768);
  for (let i = 0; i < 256; i++) { const t = i / 255; let k = 0; while (k < S.length - 2 && t > S[k + 1][0]) k++; const u = Math.max(0, Math.min(1, (t - S[k][0]) / (S[k + 1][0] - S[k][0] || 1))); for (let q = 0; q < 3; q++) lut[i * 3 + q] = S[k][1][q] + (S[k + 1][1][q] - S[k][1][q]) * u; }
  return { at(x, y, o) { let t = ((x - x0) * dx + (y - y0) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t; const i = (t * 255 + 0.5 | 0) * 3; o[0] = lut[i]; o[1] = lut[i + 1]; o[2] = lut[i + 2]; } };
}
class Raster {
  constructor(w, h) { this.w = w; this.h = h; this.buf = new Float32Array(w * h * 3); this.cov = new Float32Array(w + 3); this.dif = new Float32Array(w + 3); }
  background(top, bot, vignette, glow) { // vertical gradient + vignette + soft centre glow, allocation-free
    const { w, h, buf } = this, a = hexRGB(top), b = hexRGB(bot), g = hexRGB(glow.hex);
    for (let y = 0; y < h; y++) { const t = y / (h - 1), r0 = a[0] + (b[0] - a[0]) * t, g0 = a[1] + (b[1] - a[1]) * t, b0 = a[2] + (b[2] - a[2]) * t, dy = y / h - glow.y, dyv = (y / h - 0.5) * 2;
      for (let x = 0; x < w; x++) { const dxv = (x / w - 0.5) * 2, v = 1 - vignette * Math.min(1, (dxv * dxv + dyv * dyv) / 2), dx = x / w - 0.5, k = glow.k * Math.max(0, 1 - Math.hypot(dx, dy) / glow.r), i = (y * w + x) * 3;
        buf[i] = (r0 * v) * (1 - k) + g[0] * k; buf[i + 1] = (g0 * v) * (1 - k) + g[1] * k; buf[i + 2] = (b0 * v) * (1 - k) + g[2] * k; } }
  }
  fill(contours, paint, alpha = 1, S = 8) {
    const { w, h, buf, cov, dif } = this; let n = 0; for (const c of contours) n += c.length / 2; if (!n) return;
    const ex = new Float64Array(n), ey0 = new Float64Array(n), ey1 = new Float64Array(n), esl = new Float64Array(n), ed = new Int8Array(n); let m = 0, minY = 1e9, maxY = -1e9;
    for (const c of contours) { const k = c.length / 2; for (let i = 0; i < k; i++) { const j = i + 1 === k ? 0 : i + 1; let x0 = c[2 * i], y0 = c[2 * i + 1], x1 = c[2 * j], y1 = c[2 * j + 1]; if (y0 === y1) continue; let d = 1; if (y0 > y1) { d = -1; [x0, y0, x1, y1] = [x1, y1, x0, y0]; } ex[m] = x0; ey0[m] = y0; ey1[m] = y1; esl[m] = (x1 - x0) / (y1 - y0); ed[m] = d; m++; if (y0 < minY) minY = y0; if (y1 > maxY) maxY = y1; } }
    if (!m) return;
    const order = Array.from({ length: m }, (_, i) => i).sort((a, b) => ey0[a] - ey0[b]), r0 = Math.max(0, Math.floor(minY)), r1 = Math.min(h - 1, Math.floor(maxY)), inv = 1 / S, col = [0, 0, 0], xs = [], ds = [];
    let next = 0, active = [];
    for (let y = r0; y <= r1; y++) {
      let lo = w, hi = -1;
      for (let s = 0; s < S; s++) {
        const sy = y + (s + 0.5) * inv; while (next < m && ey0[order[next]] <= sy) active.push(order[next++]); if (!active.length) continue;
        let na = 0; xs.length = 0; ds.length = 0;
        for (let q = 0; q < active.length; q++) { const e = active[q]; if (ey1[e] <= sy) continue; active[na++] = e; const x = ex[e] + (sy - ey0[e]) * esl[e]; let p = xs.length; xs.push(x); ds.push(ed[e]); while (p > 0 && xs[p - 1] > x) { xs[p] = xs[p - 1]; ds[p] = ds[p - 1]; p--; } xs[p] = x; ds[p] = ed[e]; }
        active.length = na; let wnd = 0, xa = 0;
        for (let q = 0; q < xs.length; q++) { const was = wnd; wnd += ds[q]; if (was === 0 && wnd !== 0) xa = xs[q]; else if (was !== 0 && wnd === 0) { let xb = xs[q], a = xa; if (xb <= 0 || a >= w) continue; if (a < 0) a = 0; if (xb > w) xb = w; const ia = a | 0, ib = xb | 0; if (ia < lo) lo = ia; if (ib > hi) hi = ib; if (ia === ib) cov[ia] += xb - a; else { cov[ia] += ia + 1 - a; cov[ib] += xb - ib; dif[ia + 1] += 1; dif[ib] -= 1; } } }
      }
      if (hi < lo) continue; if (hi >= w) hi = w - 1; let run = 0;
      for (let x = lo; x <= hi + 1 && x < w; x++) { run += dif[x]; const cv = (cov[x] + run) * inv; cov[x] = 0; dif[x] = 0; if (cv > 0.002) { const a = (cv > 1 ? 1 : cv) * alpha, i = (y * w + x) * 3; paint.at(x + 0.5, y + 0.5, col); buf[i] += (col[0] - buf[i]) * a; buf[i + 1] += (col[1] - buf[i + 1]) * a; buf[i + 2] += (col[2] - buf[i + 2]) * a; } }
      cov[hi + 1] = cov[hi + 2] = dif[hi + 1] = dif[hi + 2] = 0; active = active.filter((e) => ey1[e] > y + 1);
    }
  }
  toRGB8(dither = true) { // 4x4 ordered dither removes gradient banding
    const { w, h, buf } = this, out = new Uint8ClampedArray(w * h * 3), B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = dither ? (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5 : 0, i = (y * w + x) * 3; out[i] = buf[i] + d + 0.5; out[i + 1] = buf[i + 1] + d + 0.5; out[i + 2] = buf[i + 2] + d + 0.5; }
    return out;
  }
}

// ===================== 4. PNG writer =====================
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const o = new Uint8Array(12 + data.length), dv = new DataView(o.buffer); dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) o[4 + i] = type.charCodeAt(i); o.set(data, 8); dv.setUint32(8 + data.length, crc32(o.subarray(4, 8 + data.length))); return o; };
function storedZlib(raw) { const nb = Math.ceil(raw.length / 65535), z = new Uint8Array(2 + raw.length + nb * 5 + 4); let o = 0; z[o++] = 120; z[o++] = 1; for (let b = 0; b < nb; b++) { const s = b * 65535, n = Math.min(65535, raw.length - s); z[o++] = b === nb - 1 ? 1 : 0; z[o++] = n & 255; z[o++] = n >> 8; z[o++] = ~n & 255; z[o++] = (~n >> 8) & 255; z.set(raw.subarray(s, s + n), o); o += n; } let a = 1, bb = 0; for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; bb = (bb + a) % 65521; } const ad = ((bb << 16) | a) >>> 0; z[o++] = ad >>> 24; z[o++] = (ad >>> 16) & 255; z[o++] = (ad >>> 8) & 255; z[o++] = ad & 255; return z; }
async function pngFromRGB(rgb, w, h, compress = true) {
  const raw = new Uint8Array((w * 3 + 1) * h); for (let y = 0; y < h; y++) raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  let z = null; if (compress && typeof CompressionStream !== "undefined") { try { const cs = new CompressionStream("deflate"), wr = cs.writable.getWriter(); wr.write(raw); wr.close(); z = new Uint8Array(await new Response(cs.readable).arrayBuffer()); } catch { z = null; } }
  if (!z) z = storedZlib(raw); // valid everywhere, 4.3 MB (< fetchRaster 6.5 MB limit)
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer); dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 2;
  const parts = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), chunk("IHDR", ihdr), chunk("IDAT", z), chunk("IEND", new Uint8Array(0))], png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { png.set(p, o); o += p.length; } return png;
}

// ===================== 5. name handling (same normalisation as production wordmarkText, but cut by base letters at 80) =====================
export function wordmarkText3(name) {
  const t = String(name || "").normalize("NFD").replace(/[^A-Za-z0-9&'.\-̀-̧\s]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  let n = 0, out = "", lastSp = -1; for (const ch of t) { if (!(ch >= "̀" && ch <= "ͯ")) { n++; if (n > 80) { if (lastSp > 0) out = out.slice(0, lastSp); break; } } if (ch === " ") lastSp = out.length; out += ch; }
  const ws = out.trim().split(" "); while (ws.length > 1 && /^(DE|DA|DO|DAS|DOS|E|&|EM|PARA|-)$/.test(ws[ws.length - 1])) ws.pop();
  // the signed URL carries t percent-encoded and Airtable keeps the URL in a 500-char field: keep the encoded text <= 300 chars (idempotent: re-applying changes nothing)
  while (ws.length > 1 && encodeURIComponent(ws.join(" ")).length > 300) { ws.pop(); while (ws.length > 1 && /^(DE|DA|DO|DAS|DOS|E|&|EM|PARA|-)$/.test(ws[ws.length - 1])) ws.pop(); }
  return ws.join(" ");
}
export const seedOf = (text) => [...text].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7); // identical to production
const rnd = (seed, k) => { let x = (seed ^ (k * 0x9e3779b1)) >>> 0; x = Math.imul(x ^ (x >>> 15), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const strip = (w) => w.normalize("NFD").replace(/[̀-ͯ]/g, "");
const DESC = new Set("CLINICA CLINICAS INSTITUTO CENTRO ESPACO ESTUDIO STUDIO ATELIER DRA DRA. DR DR. DRS MEDICINA ESTETICA ESTETICO AVANCADA AVANCADO PERSONALIZADA DERMATOLOGIA DERMATOLOGICA HARMONIZACAO FACIAL CORPORAL ODONTOLOGIA ODONTO SAUDE BELEZA CAPILAR LASER INTEGRATIVA INTEGRADA BIOMEDICINA FISIOTERAPIA NUTRICAO COSMETOLOGIA CLINIC ESTHETIC ESTHETICS AESTHETIC AESTHETICS BEAUTY SKIN SKINCARE DERMATOLOGY SPA MEDICAL CENTER CENTRE INSTITUTE CARE COSMIATRIA TRATAMENTOS BEM-ESTAR BEMESTAR WELLNESS WELLBEING REJUVENESCIMENTO BIOESTIMULADORES PREENCHIMENTO".split(" "));
const CONN = new Set(["DE", "DA", "DO", "DAS", "DOS", "E", "&", "EM", "PARA", "-"]), TITLES = new Set(["DRA", "DRA.", "DR", "DR.", "DRS"]);
const SUFFIX_SPLIT = ["ESTHETICS", "ESTHETIC", "AESTHETIC", "ESTETICA", "CLINIC", "STUDIO", "SKINCARE", "SKIN", "BEAUTY", "MEDICAL"];
export function parseName(text) { // brand words (large) vs generic descriptors (small, above/below)
  const words = text.split(" ").filter(Boolean), d = (w) => DESC.has(strip(w)), c = (w) => CONN.has(strip(w));
  let a = 0; while (a < words.length - 1 && (d(words[a]) || (c(words[a]) && a + 1 < words.length && d(words[a + 1])))) a++;
  let b = words.length; while (b - 1 > a && (d(words[b - 1]) || (c(words[b - 1]) && b < words.length && d(words[b])))) b--; while (b - 1 > a && c(words[b - 1])) b--;
  let prefix = words.slice(0, a), core = words.slice(a, b), suffix = words.slice(b);
  if (!core.length) { core = words; prefix = []; suffix = []; }
  else if (core.length > 2) { const k = core.findIndex((w, i) => i >= 1 && d(w) && !c(w)); if (k >= 1) { suffix = [...core.slice(k), ...suffix]; core = core.slice(0, k); while (core.length > 1 && c(core[core.length - 1])) suffix.unshift(core.pop()); } }
  if (core.length === 1 && !suffix.length) { const base = strip(core[0]); for (const s of SUFFIX_SPLIT) if (base.length >= s.length + 3 && base.endsWith(s)) { const want = base.length - s.length; let n = 0, head = ""; for (const ch of core[0].normalize("NFD")) { if (!isMark(ch)) { if (n === want) break; n++; } head += ch; } core = [head]; suffix = [s]; break; } }
  const initials = core.filter((w) => !c(w) && !TITLES.has(strip(w))).map((w) => strip(w).replace(/[^A-Z0-9]/g, "")[0]).filter(Boolean).slice(0, 2);
  return { prefix, core, suffix, initials, all: words };
}
const FAMILIES = [
  { light: { bg: ["#F6F0E5", "#EADFCB"], ink: "#2B2622", ink2: "#6B5A3E", foil: [[0, "#946F2F"], [0.5, "#D9BE7C"], [1, "#9F7B3A"]], block: "#2B2622", blockInk: "#E2C98F", glow: "#FFF9EC" } },       // marfim & ouro
  { light: { bg: ["#F1F2E9", "#DDE3D3"], ink: "#2C3D31", ink2: "#52684F", foil: [[0, "#6C7F5E"], [0.5, "#9FB08F"], [1, "#667957"]], block: "#566A52", blockInk: "#F6F1E4", glow: "#FBFBF4" } },       // sálvia & creme
  { light: { bg: ["#F7ECE8", "#EBDAD4"], ink: "#2C2B30", ink2: "#7A5C57", foil: [[0, "#A8695A"], [0.5, "#DFAE9F"], [1, "#9C6154"]], block: "#2F2E34", blockInk: "#EDC3B5", glow: "#FFF6F2" } },       // grafite & rosé
];
const palette = (seed) => FAMILIES[seed % 3].light;
const fitCapFree = (font, str, track, maxW) => Math.max(14, 100 * maxW / (widthAt(font, str, 100, track) || 1));
function wrap(font, words, cap, track, maxW) { const lines = []; let cur = ""; for (const w of words) { const t = cur ? cur + " " + w : w; if (cur && widthAt(font, t, cap, track) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
function fitCore(font, words, track, { maxW, maxCap, prefer1 = 0.62, maxLines = 3 }) { // 1..3 balanced lines, never overflows maxW
  const one = words.join(" "), cap1 = Math.min(maxCap, fitCapFree(font, one, track, maxW)); if (words.length < 2 || cap1 >= prefer1 * maxCap) return { lines: [one], cap: cap1 };
  let best = { lines: [one], cap: cap1 }; const n = words.length;
  const tryCuts = (cuts) => { const idx = [0, ...cuts, n], ls = []; for (let i = 0; i < idx.length - 1; i++) ls.push(words.slice(idx[i], idx[i + 1]).join(" ")); return { w: Math.max(...ls.map((l) => widthAt(font, l, 100, track))), ls }; };
  for (let k = 2; k <= Math.min(maxLines, n); k++) { let res = null; if (k === 2) for (let i = 1; i < n; i++) { const r = tryCuts([i]); if (!res || r.w < res.w) res = r; } else for (let i = 1; i < n - 1; i++) for (let j = i + 1; j < n; j++) { const r = tryCuts([i, j]); if (!res || r.w < res.w) res = r; } if (!res) continue; const cap = Math.min(maxCap, ...res.ls.map((l) => fitCapFree(font, l, track, maxW))); if (cap > best.cap * 1.12) best = { lines: res.ls, cap }; }
  return best;
}
const hasMarks = (s) => /[̀-ͯ]/.test(s.normalize("NFD"));

// ===================== 6. designs =====================
function newCanvas(P) { const r = new Raster(1200, 1200); r.background(P.bg[0], P.bg[1], 0.05, { x: 0.5, y: 0.42, r: 0.7, k: 0.35, hex: P.glow }); return r; }
function framePts(shape, cx, y0, fw, fh) {
  const y1 = y0 + fh, r = fw / 2;
  if (shape === 0) { const top = arcPts(cx, y0 + r, r, r, Math.PI, 2 * Math.PI, 0.02); return Float64Array.from([...top, cx + r, y1, cx - r, y1]); } // arch window
  if (shape === 1) return arcPts(cx, y0 + fh / 2, r, fh / 2, 0, 2 * Math.PI - 0.001, 0.015); // oval
  if (shape === 2) return circlePts(cx, y0 + fh / 2, Math.min(r, fh / 2), 360); // circle
  return Float64Array.from([...arcPts(cx, y0 + r, r, r, Math.PI, 2 * Math.PI, 0.02), ...arcPts(cx, y1 - r, r, r, 0, Math.PI, 0.02)]); // capsule
}
// B - "Arco": line frame (arch / oval / circle / capsule by seed) + italic monogram + tracked serif name + sans descriptors
function designB(text) {
  const seed = seedOf(text), P = palette(seed), N = parseName(text), shape = Math.floor(rnd(seed, 3) * 4), R = newCanvas(P);
  const main = FONTS.serif, mono = FONTS.ital, sans = FONTS.sans, ink = solid(P.ink), ink2 = solid(P.ink2), foil = linear(380, 120, 820, 620, P.foil);
  const TR = 0.12, coreStr = N.core.join(" "), { lines, cap } = fitCore(main, N.core, TR, { maxW: 930, maxCap: 104, prefer1: 0.72 });
  const dcap = 23, dTR = 0.4, pre = N.prefix.length ? wrap(sans, N.prefix, dcap, dTR, 800) : [], suf = N.suffix.length ? wrap(sans, N.suffix, dcap, dTR, 800) : [];
  const lh = cap * 1.6, acc = hasMarks(coreStr) ? cap * 0.3 : cap * 0.08;
  const textH = (pre.length ? pre.length * (dcap + 22) + 24 : 0) + acc + (lines.length - 1) * lh + cap + (suf.length ? 46 + suf.length * (dcap + 22) : 0);
  const gapF = 64, fh = Math.max(300, Math.min(500, 1010 - textH - gapF)), fw = shape === 0 ? fh * 0.68 : shape === 1 ? fh * 0.74 : shape === 2 ? fh : fh * 0.56;
  const top = 600 - (fh + gapF + textH) / 2 - 6, cx = 600, cy = top + fh / 2;
  const outer = framePts(shape, cx, top, fw, fh), inner = framePts(shape, cx, top + 18, fw - 36, fh - 36);
  R.fill([outer], foil, 0.11); R.fill(stroke(outer, 6.5, true), foil); R.fill(stroke(inner, 2.6, true), foil);
  const ini = N.initials.length ? N.initials : [N.all[0][0]], mcap = Math.min(fw * 0.46, fh * 0.37) * (ini.length > 1 ? 0.98 : 1.32), msize = sizeForCap(mono, mcap), my = cy + mcap / 2 + (shape === 0 ? fw * 0.05 : 0) - 8;
  const glyph = (ch) => { const t = drawText(mono, ch, { size: msize, x: 0, y: my, anchor: "l" }); return { c: t.contours, b: bbox(t.contours) }; };
  if (ini.length === 1) { const g = glyph(ini[0]); R.fill(shift(g.c, cx - (g.b.x0 + g.b.x1) / 2, 0), ink); }
  else { const a = glyph(ini[0]), b = glyph(ini[1]), sep = mcap * 0.5, x0 = cx - (a.b.w + sep + b.b.w) / 2; R.fill(shift(a.c, x0 - a.b.x0, 0), ink); R.fill(shift(b.c, x0 + a.b.w + sep - b.b.x0, 0), ink); R.fill(line(cx, my - mcap * 1.02, cx, my + mcap * 0.06, 2.2), foil); }
  R.fill(diamond(cx, cy + fh / 2 - 46, 7), foil);
  let y = top + fh + gapF;
  for (const l of pre) { R.fill(textLine(sans, l, { cap: dcap, track: dTR, y: y + dcap }).contours, ink2); y += dcap + 22; } if (pre.length) y += 24;
  y += acc; lines.forEach((l, i) => { R.fill(textLine(main, l, { cap, track: TR, y: y + cap }).contours, ink); y += i < lines.length - 1 ? lh : cap; });
  if (suf.length) { y += 46; for (const l of suf) { R.fill(textLine(sans, l, { cap: dcap, track: dTR, y: y + dcap }).contours, ink2); y += dcap + 22; } }
  return R;
}
// D - "Capitular": colour-block disc with a giant Didone initial + offset hairline ring + tracked sans name
function designD(text) {
  const seed = seedOf(text), P = palette(seed), N = parseName(text), R = newCanvas(P), bod = FONTS.didone, sans = FONTS.sans, ink = solid(P.ink), ink2 = solid(P.ink2), foil = linear(300, 120, 900, 700, P.foil);
  const cx = 600, r = 236, coreStr = N.core.join(" "), TR = 0.3, { lines, cap } = fitCore(sans, N.core, TR, { maxW: 930, maxCap: 78, prefer1: 0.66 });
  const dcap = 22, dTR = 0.42, pre = N.prefix.length ? wrap(sans, N.prefix, dcap, dTR, 760) : [], suf = N.suffix.length ? wrap(sans, N.suffix, dcap, dTR, 760) : [], acc = hasMarks(coreStr) ? cap * 0.35 : 0, gapD = 78;
  const textH = (pre.length ? pre.length * (dcap + 20) + 26 : 0) + acc + lines.length * cap + (lines.length - 1) * cap * 0.75 + (suf.length ? 82 + suf.length * (dcap + 20) : 0), cy = (1200 - (2 * r + 34 + gapD + textH)) / 2 + 6 + r;
  R.fill(ring(cx + 40, cy + 34, r, 3.4), foil); R.fill(disc(cx, cy, r), solid(P.block));
  const t = drawText(bod, N.initials[0] || N.all[0][0], { size: sizeForCap(bod, 250), x: 0, y: 0, anchor: "l" }), b = bbox(t.contours); R.fill(shift(t.contours, cx - (b.x0 + b.x1) / 2, cy - (b.y0 + b.y1) / 2), solid(P.blockInk));
  let y = cy + r + gapD;
  for (const l of pre) { R.fill(textLine(sans, l, { cap: dcap, track: dTR, y: y + dcap }).contours, ink2); y += dcap + 20; } if (pre.length) y += 26;
  y += acc; lines.forEach((l, i) => { R.fill(textLine(sans, l, { cap, track: TR, y: y + cap }).contours, ink); y += cap + (i < lines.length - 1 ? cap * 0.75 : 0); });
  if (suf.length) { y += 44; R.fill(line(560, y, 640, y, 2.4), foil); y += 38; for (const l of suf) { R.fill(textLine(sans, l, { cap: dcap, track: dTR, y: y + dcap }).contours, ink2); y += dcap + 20; } }
  return R;
}

const pickVariant = (text) => rnd(seedOf(text), 11) < 0.34 ? "D" : "B"; // deterministic from the signed text: ~2/3 framed monogram (B), ~1/3 colour-block disc (D)
export const wm3 = { wordmarkText3, wordmarkPngV3, pickVariant, seedOf, parseName };
// ===================== 7. public API =====================
// text: already normalised with wordmarkText3 (the signed `t` parameter). variant: "B" (recommended) | "D" (reserve).
export async function wordmarkPngV3(text, variant = "B", { compress = true, dither = true, timing } = {}) {
  const T = (k, t0) => { if (timing) timing[k] = +(performance.now() - t0).toFixed(1); };
  let t0 = performance.now(); const R = (variant === "D" ? designD : designB)(text); T("raster_ms", t0);
  t0 = performance.now(); const rgb = R.toRGB8(dither); T("quantize_ms", t0);
  t0 = performance.now(); const png = await pngFromRGB(rgb, 1200, 1200, compress); T("png_ms", t0);
  return png;
}
