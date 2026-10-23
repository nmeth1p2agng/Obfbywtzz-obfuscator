// VXC Obfuscator Pipeline
// Urutan layer: 1→7, setiap layer membungkus output layer sebelumnya

const { buildAntiTamper }    = require('../layers/1_antitamper');
const { buildVMCore, shuffleOpcodes, BASE_OPCODES } = require('../layers/2_vm_core');
const { buildVMCompression } = require('../layers/3_vm_compression');
const { buildDoubleVMWrapper }= require('../layers/4_double_vm');
const { buildHardcoreGlobal }= require('../layers/5_hardcore_global');
const { buildFFIProtection } = require('../layers/6_ffi_library');
const { buildDebugProtection}= require('../layers/7_debug_library');
const { randomSeed, randomInt, junkStatements, resetIdentCache } = require('./utils');

/**
 * Obfuscate Lua source melalui semua 7 layer
 * @param {string} source - Source Lua asli
 * @param {object} opts   - { verbose: bool }
 * @returns {string}      - Output Lua terobfuscate
 */
function obfuscate(source, opts = {}) {
  resetIdentCache();

  const outerSeed = randomSeed();
  const innerSeed = randomSeed();
  const outerOpcodes = shuffleOpcodes(outerSeed);
  const innerOpcodes = shuffleOpcodes(innerSeed);

  // ─── Layer 1: Anti-Tamper ───────────────────────────────────────────────
  const l1 = buildAntiTamper(source);

  // ─── Layer 7: Debug Protection (dipasang sebelum payload) ──────────────
  const l7 = buildDebugProtection();

  // ─── Layer 6: FFI Protection ────────────────────────────────────────────
  const l6 = buildFFIProtection();

  // ─── Assemble inner payload ─────────────────────────────────────────────
  // Urutan eksekusi: debug guard → ffi guard → anti-tamper → user code
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
    '-- [VXC] User Code End',
  ].join('\n');

  // ─── Layer 5: Hardcore Global (wrap inner payload) ──────────────────────
  const l5 = buildHardcoreGlobal(innerPayload);

  // ─── Layer 2: VM Core (inner VM, seed = innerSeed) ──────────────────────
  const innerVM = buildVMCore(innerOpcodes, innerSeed);

  // ─── Layer 4: Double VM (wrap l5 + inner VM) ────────────────────────────
  // Inner content: innerVM code + l5 payload
  const doubleVMContent = innerVM + '\n' + l5;
  const l4 = buildDoubleVMWrapper(doubleVMContent, outerSeed, innerSeed);

  // ─── Layer 2 outer: VM Core (outer VM, seed = outerSeed) ────────────────
  const outerVM = buildVMCore(outerOpcodes, outerSeed);

  // ─── Layer 3: VM Compression (compress l4 + outer VM) ───────────────────
  // Payload yang dikompresi: outer VM + l4
  const compressTarget = outerVM + '\n' + l4;
  const l3 = buildVMCompression(compressTarget);

  // ─── Final assembly ──────────────────────────────────────────────────────
  const header = [
    `-- VXC Obfuscator v1.0`,
    `-- Build: ${Date.now()}`,
    `-- Layers: AntiTamper|VMCore|VMCompression|DoubleVM|HardcoreGlobal|FFI|Debug`,
    `-- DO NOT DECOMPILE`,
  ].join('\n');

  const footer = junkStatements(5);

  const final = [
    header,
    'do',
    junkStatements(4),
    l3,
    junkStatements(4),
    'end',
    footer,
  ].join('\n');

  return final;
}

module.exports = { obfuscate };
