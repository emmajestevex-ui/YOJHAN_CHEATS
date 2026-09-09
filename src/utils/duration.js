const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};

const MAX_TIMEOUT_MS = 28 * UNIT_MS.d;

function parseDuration(input) {
  const value = String(input || "").trim().toLowerCase();
  const match = value.match(/^(\d{1,4})(s|m|h|d)$/);
  if (!match) return null;

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const ms = amount * UNIT_MS[unit];

  if (!Number.isFinite(ms) || ms <= 0 || ms > MAX_TIMEOUT_MS) {
    return null;
  }

  return ms;
}

function formatDuration(ms) {
  if (ms % UNIT_MS.d === 0) return `${ms / UNIT_MS.d}d`;
  if (ms % UNIT_MS.h === 0) return `${ms / UNIT_MS.h}h`;
  if (ms % UNIT_MS.m === 0) return `${ms / UNIT_MS.m}m`;
  return `${Math.round(ms / UNIT_MS.s)}s`;
}

module.exports = {
  parseDuration,
  formatDuration,
  MAX_TIMEOUT_MS
};
