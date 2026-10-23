// Layer 3: VM Compression
// Bytecode dikompresi dengan LZ-style compression + XOR cipher per-build
// Dekompresi hanya terjadi di runtime dalam VM, tidak ada plaintext di luar

const { randomIdent, randomInt } = require('../core/utils');

/**
 * LZ77-style encoder (JS side, saat obfuscate)
 * Output: array of [type, ...data]
 *   type 0 = literal: [0, byte]
 *   type 1 = backreference: [1, offset, length]
 */
function lzCompress(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    let bestLen = 0, bestOff = 0;
    const maxOff = Math.min(i, 255);
    const maxLen = Math.min(255, bytes.length - i);
    for (let off = 1; off <= maxOff; off++) {
      let len = 0;
      while (len < maxLen && bytes[i - off + len] === bytes[i + len]) len++;
      if (len > bestLen) { bestLen = len; bestOff = off; }
    }
    if (bestLen >= 3) {
      out.push([1, bestOff, bestLen]);
      i += bestLen;
    } else {
      out.push([0, bytes[i]]);
      i++;
    }
  }
  return out;
}

/**
 * Serialize compressed tokens ke flat byte array + XOR cipher
 * Format: [type(1), ...args]
 * XOR key = single byte per-build
 */
function serializeAndEncrypt(tokens, xorKey) {
  const flat = [];
  for (const t of tokens) {
    if (t[0] === 0) {
      flat.push(0x00, t[1]);
    } else {
      flat.push(0x01, t[1], t[2]);
    }
  }
  // XOR encrypt
  return flat.map(b => b ^ xorKey);
}

/**
 * Convert string source ke bytes (latin-1 safe)
 */
function strToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xFF);
  return bytes;
}

/**
 * Encode byte array ke Lua table literal string
 */
function bytesToLuaTable(bytes) {
  return '{' + bytes.join(',') + '}';
}

function buildVMCompression(sourceToCompress) {
  const xorKey = randomInt(1, 254);
  const bytes = strToBytes(sourceToCompress);
  const tokens = lzCompress(bytes);
  const encrypted = serializeAndEncrypt(tokens, xorKey);
  const luaTable = bytesToLuaTable(encrypted);

  const v = {
    data:    randomIdent(),
    key:     randomIdent(),
    decomp:  randomIdent(),
    out:     randomIdent(),
    i:       randomIdent(),
    t:       randomIdent(),
    off:     randomIdent(),
    len:     randomIdent(),
    b:       randomIdent(),
    result:  randomIdent(),
    load_fn: randomIdent(),
    chunk:   randomIdent(),
    fn:      randomIdent(),
  };

  return `
-- [VXC:L3] Compressed + Encrypted Payload
local ${v.data} = ${luaTable}
local ${v.key}  = ${xorKey}

local ${v.result} = (function()
  -- XOR decrypt
  local _dec = {}
  for ${v.i} = 1, #${v.data} do
    _dec[${v.i}] = ${v.data}[${v.i}] ~ ${v.key}
  end

  -- LZ decompress
  local ${v.out} = {}
  local ${v.i}   = 1
  while ${v.i} <= #_dec do
    local ${v.t} = _dec[${v.i}]
    ${v.i} = ${v.i} + 1
    if ${v.t} == 0 then
      ${v.out}[#${v.out}+1] = string.char(_dec[${v.i}])
      ${v.i} = ${v.i} + 1
    elseif ${v.t} == 1 then
      local ${v.off} = _dec[${v.i}]
      local ${v.len} = _dec[${v.i}+1]
      ${v.i} = ${v.i} + 2
      local _base = #${v.out} - ${v.off} + 1
      for _ci = 0, ${v.len}-1 do
        ${v.out}[#${v.out}+1] = ${v.out}[_base + (_ci % ${v.off})]
      end
    end
  end

  local ${v.chunk} = table.concat(${v.out})
  local ${v.fn}, _err = load(${v.chunk}, "=[VXC]", "t", getfenv and getfenv(0) or _ENV)
  if not ${v.fn} then error("[VXC] decomp fail: " .. tostring(_err)) end
  return ${v.fn}()
end)()
`;
}

module.exports = { buildVMCompression, lzCompress, serializeAndEncrypt, strToBytes };
