const fail = (message) => { throw Error(message); };

export const percentValue = (text, name) => {
  const match = String(text).match(/^(\d+(?:\.\d+)?)\s*%/);
  if (!match) {
    if (/^unknown$/i.test(String(text).trim())) return null;
    fail(name + ' must start with a number and a percent sign, such as 62% or 62% estimate.');
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    fail(name + ' must be a percentage from 0 to 100, not ' + value + '.');
  }
  return value;
};

const UNITS = { ms: ['time', 1], s: ['time', 1000], min: ['time', 60000], h: ['time', 3600000],
  b: ['size', 1], kb: ['size', 1024], mb: ['size', 1048576], gb: ['size', 1073741824],
  k: ['count', 1000], '%': ['percent', 1] };

export const measure = (text, name) => {
  const match = String(text).replace(/,/g, '').match(/^(-?\d+(?:\.\d+)?)\s*([a-z%]+)?$/i);
  if (!match) fail(name + ' must be a number with an optional unit, like 92 s or 1.2k.');
  const value = Number(match[1]);
  const unit = (match[2] || '').toLowerCase();
  if (value < 0) fail(name + ' must not be negative.');
  if (!unit) return { value, unit: '', family: '' };
  const entry = UNITS[unit];
  if (!entry) fail(name + ' uses an unknown unit "' + match[2] + '". Use ms, s, min, h, KB, MB, GB, k, %, or no unit.');
  return { value: value * entry[1], unit, family: entry[0] };
};

