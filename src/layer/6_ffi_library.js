// Layer 6: FFI Library Nullification + Hook Detection
// Roblox executor kadang expose ffi (LuaJIT).
// Layer ini: detect ffi, null-trap function pointer, inject probe.

const { randomIdent } = require('../core/utils');

function buildFFIProtection() {
  const v = {
    ffi_chk:   randomIdent(),
    ffi_ref:   randomIdent(),
    ffi_trap:  randomIdent(),
    ffi_probe: randomIdent(),
    ffi_null:  randomIdent(),
    trap:      randomIdent(),
    i:         randomIdent(),
    t:         randomIdent(),
  };

  return `
-- [VXC:L6] FFI Library Protection
do
  -- Crash trap
  local function ${v.trap}()
    local ${v.t} = {}
    while true do ${v.t}[#${v.t}+1] = ${v.t}; ${v.trap}() end
  end

  -- FFI probe + nullification
  local _ffi_ok, ${v.ffi_ref} = pcall(function() return require("ffi") end)

  if _ffi_ok and ${v.ffi_ref} then
    -- ffi terdeteksi — null semua function yang berbahaya
    local _dangerous_ffi = {
      "cast","typeof","new","copy","fill","string","errno",
      "load","cdef","gc","offsetof","sizeof","alignof","istype",
      "metatype","C",
    }
    for _, _fn_name in ipairs(_dangerous_ffi) do
      pcall(function()
        ${v.ffi_ref}[_fn_name] = nil
      end)
    end

    -- Probe: pastikan nullification berhasil
    local _ffi_test = pcall(function()
      ${v.ffi_ref}.cast("int*", 0) -- harusnya error setelah null
    end)
    if _ffi_test then
      -- cast masih jalan → ffi tidak bisa di-null (protected) → crash
      ${v.trap}()
    end
  end

  -- ffi via jit.util juga ditutup
  if jit then
    local _jit_ok, _jit = pcall(function() return jit end)
    if _jit_ok and _jit and _jit.util then
      local _danger_jit = {"funcinfo","funcbc","funck","funcuvname","ircalladdr"}
      for _, _fn in ipairs(_danger_jit) do
        pcall(function() _jit.util[_fn] = nil end)
      end
    end
  end

  -- require hook detection: jika require di-hook untuk expose ffi
  local _req_orig = require
  local _req_probe_ok, _req_probe = pcall(require, "__vxc_probe_nonexistent__")
  -- require ke module nonexistent harusnya error/return nil
  if _req_probe_ok and _req_probe ~= nil then
    -- require di-hook dan return value palsu → crash
    ${v.trap}()
  end
end
`;
}

module.exports = { buildFFIProtection };
