// VXC Obfuscator Pipeline
// Urutan layer: 1→7, setiap layer membungkus output layer sebelumnya

const { buildAntiTamper } = require('../layer/1_antitamper');
const { buildVMCore, shuffleOpcodes } = require('../layer/2_vm_core');
const { buildVMCompression } = require('../layer/3_vm_compression');
const { buildDoubleVMWrapper } = require('../layer/4_double_vm');
const { buildHardcoreGlobal } = require('../layer/5_hardcore_global');
const { buildFFIProtection } = require('../layer/6_ffi_library');
const { buildDebugProtection } = require('../layer/7_debug_library');
const { randomSeed, junkStatements, resetIdentCache } = require('./utils');

/**
 * Obfuscate source Lua melalui pipeline yang tersedia.
 * @param {string} source Source Lua asli.
 * @param {object} opts Opsi tambahan untuk kompatibilitas.
 * @returns {string} Output Lua terobfuscate.
 */
function obfuscate(source, opts = {}) {
  if (typeof source !== 'string' || source.length === 0) {
    throw new TypeError('source harus berupa string Lua yang tidak kosong');
  }

  resetIdentCache();

  const outerSeed = randomSeed();
  const innerSeed = randomSeed();
  const outerOpcodes = shuffleOpcodes(outerSeed);
  const innerOpcodes = shuffleOpcodes(innerSeed);

  // Layer 1: Anti-tamper
  const l1 = buildAntiTamper(source);

  // Layer 7: Debug protection
  const l7 = buildDebugProtection();

  // Layer 6: FFI protection
  const l6 = buildFFIProtection();

  const innerPayload = [
    '-- [VXC] Inner Payload',
    junkStatements(3),
    l7,
    junkStatements(3),
    l6,
    junkStatements(3),
    l1,
    junkStatements(3),
    '-- [VXC] User Code Begin',
    source,
    '-- [VXC] User Code End'
  ].join('\n');

  // Layer 5: Global protection
  const l5 = buildHardcoreGlobal(innerPayload);

  // Layer 2: Inner VM
  const innerVM = buildVMCore(innerOpcodes, innerSeed);

  // Layer 4: Double VM wrapper
  const doubleVMContent = innerVM + '\n' + l5;
  const l4 = buildDoubleVMWrapper(doubleVMContent, outerSeed, innerSeed);

  // Layer 2: Outer VM
  const outerVM = buildVMCore(outerOpcodes, outerSeed);

  // Layer 3: Compression
  const compressTarget = outerVM + '\n' + l4;
  const l3 = buildVMCompression(compressTarget);

  const header = [
    '-- VXC Obfuscator v1.0',
    `-- Build: ${Date.now()}`,
    '-- Layers: AntiTamper|VMCore|VMCompression|DoubleVM|HardcoreGlobal|FFI|Debug',
    '-- DO NOT DECOMPILE'
  ].join('\n');

  return [
    header,
    'do',
    junkStatements(4),
    l3,
    junkStatements(4),
    'end',
    junkStatements(5)
  ].join('\n');
}
module.exports = { obfuscate };
