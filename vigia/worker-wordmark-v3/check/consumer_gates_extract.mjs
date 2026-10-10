// AUTO-EXTRACTED VERBATIM from bundle lines 802-853 (LOGO_* limits, imageDimensions, logoDimsOk) and 2620-2631 (rasterMime). Consumer-gate emulation. Do not edit.
const __name = (target, value) => Object.defineProperty(target, "name", { value, configurable: true });
const __name2 = __name, __name22 = __name, __name222 = __name, __name2222 = __name;
var LOGO_MIN_SHORT = 180;
var LOGO_MIN_PIXELS = 3e4;
var LOGO_MAX_ASPECT = 4.5;
function businessHeroTypeList() {
  return LOGO_HERO_ENABLED ? ["CLINIC_FACADE", "CLINIC_RECEPTION", "CLINIC_INTERIOR", "LOGO"] : ["CLINIC_FACADE", "CLINIC_RECEPTION", "CLINIC_INTERIOR"];
}
__name(businessHeroTypeList, "businessHeroTypeList");
function imageDimensions(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  const n = b.length;
  const u16 = /* @__PURE__ */ __name((i) => b[i] << 8 | b[i + 1], "u16");
  const u32 = /* @__PURE__ */ __name((i) => (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0, "u32");
  if (n >= 24 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) return { width: u32(16), height: u32(20) };
  if (n >= 10 && b[0] === 71 && b[1] === 73 && b[2] === 70) return { width: b[6] | b[7] << 8, height: b[8] | b[9] << 8 };
  if (n >= 4 && b[0] === 255 && b[1] === 216) {
    let i = 2;
    while (i + 9 < n) {
      if (b[i] !== 255) {
        i++;
        continue;
      }
      const m = b[i + 1];
      if (m === 255) {
        i++;
        continue;
      }
      if (m >= 192 && m <= 207 && m !== 196 && m !== 200 && m !== 204) return { height: u16(i + 5), width: u16(i + 7) };
      if (m === 216 || m === 1 || m >= 208 && m <= 215) {
        i += 2;
        continue;
      }
      i += 2 + u16(i + 2);
    }
    return null;
  }
  if (n >= 30 && b[0] === 82 && b[1] === 73 && b[2] === 70 && b[3] === 70 && b[8] === 87 && b[9] === 69 && b[10] === 66 && b[11] === 80) {
    const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (tag === "VP8 ") return { width: (b[26] | b[27] << 8) & 16383, height: (b[28] | b[29] << 8) & 16383 };
    if (tag === "VP8L") return { width: 1 + ((b[22] & 63) << 8 | b[21]), height: 1 + ((b[24] & 15) << 10 | b[23] << 2 | (b[22] & 192) >> 6) };
    if (tag === "VP8X") return { width: 1 + (b[24] | b[25] << 8 | b[26] << 16), height: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
  }
  return null;
}
__name(imageDimensions, "imageDimensions");
function logoDimsOk(w, h) {
  w = Number(w);
  h = Number(h);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;
  const short = Math.min(w, h);
  if (short < LOGO_MIN_SHORT || w * h < LOGO_MIN_PIXELS) return false;
  return Math.max(w, h) / short <= LOGO_MAX_ASPECT;
}
function rasterMime(bytes, header = "") {
  const h = String(header || "").toLowerCase().split(";")[0].trim();
  if (["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(h)) return h;
  const b = new Uint8Array(bytes);
  if (b.length >= 8 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) return "image/png";
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.length >= 6 && String.fromCharCode(...b.slice(0, 6)).startsWith("GIF8")) return "image/gif";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  if (b.length >= 12 && String.fromCharCode(...b.slice(4, 8)) === "ftyp" && String.fromCharCode(...b.slice(8, 12)).toLowerCase().includes("avif")) return "image/avif";
  return "";
}
__name(rasterMime, "rasterMime");
export const FETCH_RASTER_MAX_BYTES = 65e5; // fetchRaster default maxBytes (line 2636)
export { LOGO_MIN_SHORT, LOGO_MIN_PIXELS, LOGO_MAX_ASPECT, imageDimensions, logoDimsOk, rasterMime };
