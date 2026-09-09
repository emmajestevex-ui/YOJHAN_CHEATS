function cleanInput(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  const emptyValues = new Set(["-", "no", "none", "n/a", "na", "null"]);
  return emptyValues.has(trimmed.toLowerCase()) ? "" : trimmed;
}

function truncate(value, maxLength) {
  const text = cleanInput(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function parseBooleanInput(value, fallback = false) {
  const text = cleanInput(value).toLowerCase();
  if (!text) return fallback;
  if (["si", "sí", "s", "yes", "y", "true", "1", "on"].includes(text)) return true;
  if (["no", "n", "false", "0", "off"].includes(text)) return false;
  return fallback;
}

function formatFunctionList(value) {
  const text = cleanInput(value);
  if (!text) return "";

  const items = text
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean);

  if (items.length === 0) return "";
  return truncate(items.map((item) => `- ${item}`).join("\n"), 1024);
}

function isHttpUrl(value) {
  const text = cleanInput(value);
  if (!text) return false;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeChannelName(value) {
  return cleanInput(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "usuario";
}

module.exports = {
  cleanInput,
  truncate,
  parseBooleanInput,
  formatFunctionList,
  isHttpUrl,
  sanitizeChannelName
};
