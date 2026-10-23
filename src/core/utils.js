// VXC Core Utilities
const crypto = require('crypto');

// Karakter valid untuk identifier Lua
const IDENT_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const IDENT_ALL   = IDENT_CHARS + '0123456789_';

// Kata-kata yang tidak boleh jadi identifier
const LUA_KEYWORDS = new Set([
  'and','break','do','else','elseif','end','false','for','function',
  'goto','if','in','local','nil','not','or','repeat','return','then',
  'true','until','while',
]);

let _identCounter = 0;
const _identCache = new Set();

/**
 * Generate random valid Lua identifier
 * Menggunakan campuran karakter lookalike untuk confuse reader
 */
function randomIdent(len = null) {
  const targetLen = len || (6 + Math.floor(Math.random() * 6));
  let attempt = 0;
  while (attempt++ < 1000) {
    // Prefix: huruf saja
    let id = IDENT_CHARS[Math.floor(Math.random() * IDENT_CHARS.length)];
    for (let i = 1; i < targetLen; i++) {
      id += IDENT_ALL[Math.floor(Math.random() * IDENT_ALL.length)];
    }
    if (!LUA_KEYWORDS.has(id) && !_identCache.has(id)) {
      _identCache.add(id);
      return id;
    }
  }
  // Fallback: counter-based
  return `_v${_identCounter++}`;
}

/**
 * Reset identifier cache (untuk build baru)
 */
function resetIdentCache() {
  _identCache.clear();
  _identCounter = 0;
}

/**
 * Generate random integer [min, max]
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Encode string ke escaped Lua string dengan obfuscated char codes
 * Metode: mix antara \\xNN, string.char(), dan raw char
 */
function encodeString(str) {
  // Encode sebagai string.char(...) call
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  // Chunk untuk hindari terlalu panjang
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 50) {
    chunks.push(`string.char(${bytes.slice(i, i + 50).join(',')})`);
  }
  if (chunks.length === 1) return chunks[0];
  return chunks.join('..');
}

/**
 * Encode string ke Lua hex escape
 */
function encodeStringHex(str) {
  let out = '"';
  for (let i = 0; i < str.length; i++) {
    out += '\\x' + str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return out + '"';
}

/**
 * XOR encrypt string dengan key
 */
function xorEncrypt(str, key) {
  const result = [];
  for (let i = 0; i < str.length; i++) {
    result.push((str.charCodeAt(i) ^ key.charCodeAt(i % key.length)) & 0xFF);
  }
  return result;
}

/**
 * Shuffle array in-place (Fisher-Yates)
 */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate random hex string
 */
function randomHex(len = 8) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

/**
 * Generate random build seed (32-bit)
 */
function randomSeed() {
  return (crypto.randomBytes(4).readUInt32BE(0)) >>> 0;
}

/**
 * Obfuscate number literal: gunakan arithmetic expression
 * e.g., 42 → (6*7) atau (50-8) dll
 */
function obfuscateNumber(n) {
  if (!Number.isInteger(n) || n < 0 || n > 10000) return String(n);
  const strategies = [
    () => { const a = randomInt(1, Math.max(1, n)); return `(${a}+(${n-a}))`; },
    () => { const a = randomInt(n, n + 100); return `(${a}-(${a - n}))`; },
    () => {
      for (let d = 2; d <= Math.sqrt(n); d++) {
        if (n % d === 0) return `(${d}*${n/d})`;
      }
      return String(n);
    },
    () => `(${n}|0)`,
    () => `(0x${n.toString(16)})`,
  ];
  return strategies[randomInt(0, strategies.length - 1)]();
}

/**
 * Generate junk Lua statements untuk padding
 */
function junkStatements(count = 5) {
  const stmts = [];
  for (let i = 0; i < count; i++) {
    const v = randomIdent();
    const strategies = [
      `local ${v} = ${obfuscateNumber(randomInt(0, 999))}`,
      `local ${v} = nil`,
      `local ${v} = "${randomHex(4)}"`,
      `local ${v} = type(nil)`,
      `local ${v} = not false`,
      `local ${v} = (function() return nil end)()`,
      `do local ${v} = {} end`,
      `-- ${randomHex(16)}`,
    ];
    stmts.push(strategies[randomInt(0, strategies.length - 1)]);
  }
  return stmts.join('\n');
}

/**
 * Random string (untuk junk value)
 */
function randomStr(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[randomInt(0, chars.length - 1)];
  return s;
}

module.exports = {
  randomIdent, resetIdentCache,
  randomInt, randomHex, randomSeed,
  encodeString, encodeStringHex,
  xorEncrypt, shuffleArray,
  obfuscateNumber, junkStatements,
  randomStr,
};
