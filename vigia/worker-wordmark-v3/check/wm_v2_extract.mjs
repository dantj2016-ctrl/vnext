// AUTO-EXTRACTED VERBATIM from bundle lines 503-771 (wf-supply-engine-v1). Do not edit. Prologue/epilogue only.
const __name = (target, value) => Object.defineProperty(target, "name", { value, configurable: true });
var WORDMARK_ON = false;
var WORDMARK_BASE = "https://wf-supply-engine-v1.daniel-wf.workers.dev/wordmark.png";
var WM_W = 1200;
var WM_H = 600;
var WM_GLYPHS = {
  A: [[[0, 6], [2, 0], [4, 6]], [[0.8, 4], [3.2, 4]]],
  B: [[[0, 0], [0, 6]], [[0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [0, 6]], [[0, 0], [2.5, 0], [4, 1.5], [4, 4.5], [2.5, 6], [0, 6]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [2.5, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[1, 0], [3, 0]], [[1, 6], [3, 6]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.5]], [[1.5, 2.5], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.5], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
  Q: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[2.5, 4.5], [4.2, 6.4]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[2, 3], [4, 6]]],
  S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 2.5], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3]], [[4, 0], [2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  "0": [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  "1": [[[1, 1], [2, 0], [2, 6]], [[1, 6], [3, 6]]],
  "2": [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  "3": [[[0, 0], [4, 0], [2, 2.5], [3, 2.5], [4, 3.5], [4, 5], [3, 6], [1, 6], [0, 5]]],
  "4": [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  "5": [[[4, 0], [0, 0], [0, 2.8], [3, 2.8], [4, 3.8], [4, 5], [3, 6], [1, 6], [0, 5]]],
  "6": [[[3.5, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  "7": [[[0, 0], [4, 0], [1.5, 6]]],
  "8": [[[1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0]], [[1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]]],
  "9": [[[0.5, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [4, 3]]],
  "&": [[[4, 6], [1, 2.5], [1, 1], [2, 0], [3, 1], [3, 2.5], [0, 4.5], [0, 5.5], [1, 6], [2, 6], [4, 3.5]]],
  "-": [[[0.5, 3], [3.5, 3]]],
  ".": [[[2, 5.7], [2, 6]]],
  "'": [[[2, 0], [2, 1.5]]]
};
var WM_MARKS = { "\u0301": [[[1.4, -0.8], [2.8, -1.8]]], "\u0303": [[[0.6, -1.2], [1.4, -1.8], [2.6, -1], [3.4, -1.6]]], "\u0302": [[[1, -0.8], [2, -1.8], [3, -0.8]]], "\u0300": [[[1.2, -1.8], [2.6, -0.8]]], "\u0327": [[[2, 6], [2.4, 6.9], [1.6, 7.5]]] };
function wordmarkText(name) {
  const t = String(name || "").normalize("NFD").replace(/[^A-Za-z0-9&'.\-̀-̧̃\s]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  return t.slice(0, 48);
}
__name(wordmarkText, "wordmarkText");
function wordmarkLinesV2(text) {
  const words = text.split(" "), lines = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > 11) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  while (lines.length > 3) {
    const last = lines.pop();
    lines[lines.length - 1] += " " + last;
  }
  return lines;
}
__name(wordmarkLinesV2, "wordmarkLinesV2");
function wordmarkLines(text) {
  if (text.length <= 16) return [text];
  const words = text.split(" ");
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    const score = Math.max(a.length, b.length);
    if (!best || score < best.score) best = { score, lines: [a, b] };
  }
  return best ? best.lines : [text];
}
__name(wordmarkLines, "wordmarkLines");
function wordmarkEmblem(seed, cx, cy, R) {
  const P = /* @__PURE__ */ __name((pts) => pts.map(([x, y]) => [cx + x * R, cy + y * R]), "P");
  const line = /* @__PURE__ */ __name((pts) => {
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
    return out;
  }, "line");
  const ring = [];
  for (let k = 0; k <= 56; k++) ring.push([Math.cos(k / 56 * 2 * Math.PI), Math.sin(k / 56 * 2 * Math.PI)]);
  const leaf = /* @__PURE__ */ __name((w, h) => [[0, h], [-w, h * 0.35], [-w, -h * 0.35], [0, -h], [w, -h * 0.35], [w, h * 0.35], [0, h]], "leaf");
  const v = seed % 3;
  let inner;
  if (v === 0) inner = [leaf(0.3, 0.55)];
  else if (v === 1) inner = [[[0, -0.5], [0.4, 0], [0, 0.5], [-0.4, 0], [0, -0.5]]];
  else inner = [leaf(0.2, 0.5), [[0, 0.5], [-0.42, 0.2], [-0.52, -0.15]], [[0, 0.5], [0.42, 0.2], [0.52, -0.15]]];
  return [ring, ...inner].flatMap((pts) => line(P(pts)));
}
__name(wordmarkEmblem, "wordmarkEmblem");
function wordmarkStrokes(lines, seed, v2 = false) {
  const GAP = 1.6, SPACE = 3, LINE_H = v2 ? 14 : 12, ER = v2 ? 70 : 36, EGAP = v2 ? 76 : 44, GOLD_GAP = v2 ? 80 : 46;
  const rows = lines.map((ln) => {
    const items = [];
    let x = 0;
    for (const ch of ln.normalize("NFD")) {
      if (WM_MARKS[ch]) {
        const last = items[items.length - 1];
        if (last) last.marks.push(...WM_MARKS[ch]);
        continue;
      }
      if (ch === " ") {
        x += SPACE;
        continue;
      }
      const g = WM_GLYPHS[ch];
      if (!g) continue;
      items.push({ x, g, marks: [] });
      x += 4 + GAP;
    }
    return { items, width: Math.max(0, x - GAP) };
  });
  const maxW = Math.max(1, ...rows.map((r) => r.width));
  const totalH = rows.length * 6 + (rows.length - 1) * (LINE_H - 6);
  const margin = v2 ? 230 : 110, availH = WM_H - 2 * (v2 ? 250 : 90) - (2 * ER + EGAP) - GOLD_GAP;
  const scale = Math.min((WM_W - 2 * margin) / maxW, availH / totalH, v2 ? 30 : 26);
  const textH = totalH * scale, groupH = 2 * ER + EGAP + textH + GOLD_GAP, top = (WM_H - groupH) / 2;
  const segs = [];
  const oy0 = top + 2 * ER + EGAP;
  rows.forEach((r, ri) => {
    const ox = (WM_W - r.width * scale) / 2, oy = oy0 + ri * LINE_H * scale;
    for (const it of r.items) {
      for (const stroke of [...it.g, ...it.marks]) for (let i = 0; i + 1 < stroke.length; i++) segs.push([ox + (it.x + stroke[i][0]) * scale, oy + stroke[i][1] * scale, ox + (it.x + stroke[i + 1][0]) * scale, oy + stroke[i + 1][1] * scale]);
    }
  });
  const radius = Math.max(2.2, scale * 0.17);
  return { segs, emblem: wordmarkEmblem(seed, WM_W / 2, top + ER, ER), radius, eradius: Math.max(2, radius * 0.7), baseY: oy0 + textH + GOLD_GAP - 6, cx: WM_W / 2 };
}
__name(wordmarkStrokes, "wordmarkStrokes");
function wordmarkRaster(name, v2 = false) {
  const text = wordmarkText(name);
  if (text.replace(/[^A-Z0-9]/g, "").length < 2) return null;
  const seed = [...text].reduce((n, ch) => n * 31 + ch.charCodeAt(0) >>> 0, 7);
  const { segs, emblem, radius, eradius, baseY, cx } = wordmarkStrokes(v2 ? wordmarkLinesV2(text) : wordmarkLines(text), seed, v2);
  const cov = new Uint8Array(WM_W * WM_H);
  const mark = /* @__PURE__ */ __name((x0, y0, x1, y1, r, idxBase) => {
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - r - 1)), maxX = Math.min(WM_W - 1, Math.ceil(Math.max(x0, x1) + r + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - r - 1)), maxY = Math.min(WM_H - 1, Math.ceil(Math.max(y0, y1) + r + 1));
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = ((px - x0) * dx + (py - y0) * dy) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
      const a = Math.max(0, Math.min(1, r + 0.5 - d));
      if (a <= 0) continue;
      const v = idxBase + Math.round(a * 127), i = y * WM_W + x;
      if (idxBase === 0) {
        if (cov[i] < 128 && v > cov[i]) cov[i] = v;
      } else if (v > cov[i]) cov[i] = v;
    }
  }, "mark");
  for (const [x0, y0, x1, y1] of segs) mark(x0, y0, x1, y1, radius, 0);
  for (const [x0, y0, x1, y1] of emblem) mark(x0, y0, x1, y1, eradius, 128);
  mark(cx - 60, baseY, cx + 60, baseY, 2.2, 128);
  return cov;
}
__name(wordmarkRaster, "wordmarkRaster");
var WM_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function wmCrc(bytes) {
  let c = 4294967295;
  for (let i = 0; i < bytes.length; i++) c = WM_CRC[(c ^ bytes[i]) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
__name(wmCrc, "wmCrc");
function wordmarkPng(name, ver = "") {
  const v2 = String(ver) === "2";
  WM_W = 1200;
  WM_H = v2 ? 1200 : 600;
  const cov = wordmarkRaster(name, v2);
  if (!cov) return null;
  const raw = new Uint8Array((WM_W + 1) * WM_H);
  for (let y = 0; y < WM_H; y++) {
    raw[y * (WM_W + 1)] = 0;
    raw.set(cov.subarray(y * WM_W, (y + 1) * WM_W), y * (WM_W + 1) + 1);
  }
  const blocks = Math.ceil(raw.length / 65535), z = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  let o = 0;
  z[o++] = 120;
  z[o++] = 1;
  for (let b = 0; b < blocks; b++) {
    const s = b * 65535, n = Math.min(65535, raw.length - s);
    z[o++] = b === blocks - 1 ? 1 : 0;
    z[o++] = n & 255;
    z[o++] = n >> 8;
    z[o++] = ~n & 255;
    z[o++] = ~n >> 8 & 255;
    z.set(raw.subarray(s, s + n), o);
    o += n;
  }
  let a = 1, bb = 0;
  for (let i = 0; i < raw.length; i++) {
    a = (a + raw[i]) % 65521;
    bb = (bb + a) % 65521;
  }
  const ad = (bb << 16 | a) >>> 0;
  z[o++] = ad >>> 24;
  z[o++] = ad >>> 16 & 255;
  z[o++] = ad >>> 8 & 255;
  z[o++] = ad & 255;
  const BG = [246, 241, 234], INK = [43, 43, 46], GOLD = [176, 141, 87];
  const plte = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    const half = i < 128, t = (half ? i : i - 128) / 127, tgt = half ? INK : GOLD;
    for (let k = 0; k < 3; k++) plte[i * 3 + k] = Math.round(BG[k] + (tgt[k] - BG[k]) * t);
  }
  const chunk = /* @__PURE__ */ __name((type, data) => {
    const out = new Uint8Array(12 + data.length), dv2 = new DataView(out.buffer);
    dv2.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv2.setUint32(8 + data.length, wmCrc(out.subarray(4, 8 + data.length)));
    return out;
  }, "chunk");
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, WM_W);
  dv.setUint32(4, WM_H);
  ihdr[8] = 8;
  ihdr[9] = 3;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("PLTE", plte), chunk("IDAT", z), chunk("IEND", new Uint8Array(0))];
  const png = new Uint8Array(parts.reduce((n, p2) => n + p2.length, 0));
  let p = 0;
  for (const part of parts) {
    png.set(part, p);
    p += part.length;
  }
  return png;
}
__name(wordmarkPng, "wordmarkPng");
async function wordmarkSig(env, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("wm1|" + String(env?.PAINEL_KEY || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("wm1|" + text)));
  return [...mac.slice(0, 10)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(wordmarkSig, "wordmarkSig");
async function wordmarkUrl(env, name) {
  const t = wordmarkText(name);
  if (t.replace(/[^A-Z0-9]/g, "").length < 2 || !env?.PAINEL_KEY) return "";
  return WORDMARK_BASE + "?t=" + encodeURIComponent(t) + "&s=" + await wordmarkSig(env, t) + "&v=2";
}
__name(wordmarkUrl, "wordmarkUrl");
async function wordmarkUrlValid(env, url) {
  try {
    const u = new URL(String(url || ""));
    if (u.origin + u.pathname !== WORDMARK_BASE) return false;
    const t = u.searchParams.get("t") || "", v = u.searchParams.get("v") || "";
    return (v === "" || v === "2") && t === wordmarkText(t) && u.searchParams.get("s") === await wordmarkSig(env, t);
  } catch {
    return false;
  }
}
__name(wordmarkUrlValid, "wordmarkUrlValid");
export { WORDMARK_BASE, WM_GLYPHS, WM_MARKS, wordmarkText, wordmarkLinesV2, wordmarkLines, wordmarkEmblem, wordmarkStrokes, wordmarkRaster, wmCrc, wordmarkPng, wordmarkSig, wordmarkUrl, wordmarkUrlValid };
