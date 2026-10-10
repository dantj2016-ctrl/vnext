import fs from "node:fs"; import zlib from "node:zlib";
const p = new Uint8Array(fs.readFileSync(new URL("./baseline_4.png", import.meta.url)));
const dv = new DataView(p.buffer); let o = 8; const chunks = [];
const idat = [];
while (o < p.length) { const len = dv.getUint32(o); const type = String.fromCharCode(...p.subarray(o + 4, o + 8)); chunks.push(type + ":" + len); if (type === "IDAT") idat.push(p.subarray(o + 8, o + 8 + len)); o += 12 + len; }
console.log("chunks:", chunks.join(" "));
const raw = zlib.inflateSync(Buffer.concat(idat));
console.log("raw scanlines bytes:", raw.length, "| IDAT bytes:", idat[0].length, "(stored deflate, no compression: ratio", (idat[0].length / raw.length).toFixed(4) + ")");
for (const lvl of [1, 6, 9]) console.log("same raw with real deflate level", lvl, "->", zlib.deflateSync(raw, { level: lvl }).length, "bytes IDAT");
// palette type 3 vs 24-bit: what would RGB cost raw?
console.log("24-bit RGB raw would be", (1200 * 3 + 1) * 1200, "bytes before compression;", "RGBA", (1200 * 4 + 1) * 1200);
