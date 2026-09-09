const { COLORS } = require("../constants");

function parseColor(input, fallback = COLORS.YOJHAN_RED) {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (!input) return fallback;

  const value = String(input).trim().toLowerCase();
  const namedColors = {
    rojo: COLORS.YOJHAN_RED,
    red: COLORS.YOJHAN_RED,
    negro: COLORS.YOJHAN_BLACK,
    black: COLORS.YOJHAN_BLACK,
    blanco: COLORS.YOJHAN_WHITE,
    white: COLORS.YOJHAN_WHITE
  };

  if (Object.prototype.hasOwnProperty.call(namedColors, value)) {
    return namedColors[value];
  }

  const normalized = value.replace(/^#/, "").replace(/^0x/, "");
  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return Number.parseInt(normalized, 16);
  }

  if (/^[0-9a-f]{3}$/i.test(normalized)) {
    const expanded = normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
    return Number.parseInt(expanded, 16);
  }

  return fallback;
}

function toHexColor(color) {
  return `#${Number(color || COLORS.YOJHAN_RED).toString(16).padStart(6, "0")}`;
}

module.exports = {
  parseColor,
  toHexColor
};
