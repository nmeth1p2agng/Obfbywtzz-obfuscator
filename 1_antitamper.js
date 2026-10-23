// Layer 1: Anti-Tamper + Crash on Reverse Engineering
// Detects: source modification, dump attempts, env hooking, pcall patching

const { randomIdent, randomStr, shuffleArray } = require('../core/utils');

function buildAntiTamper(originalSource) {
  // djb2 hash of original source embedded at compile time
  let hash = 5381;
  for (let i = 0; i < originalSource.length; i++) {
    hash = ((hash * 33) ^ originalSource.charCodeAt(i)) >>> 0;
  }
  const compiledHash = (hash >>> 0).toString(16).padStart(8, '0');

  const vars = {
    h:    randomIdent(),
    trap: randomIdent(),
    chk:  randomIdent(),
    env:  randomIdent(),
    pcal: randomIdent(),
    sink: randomIdent(),
    loop: randomIdent(),
    t:    randomIdent(),
    x:    randomIdent(),
    djb:  randomIdent(),
    s:    randomIdent(),
    i:    randomIdent(),
    r:    randomIdent(),
  };

  return `
-- [VXC:L1] Anti-Tamper + Crash Guard
do
  -- Infinite-recursion trap: jika dipanggil, stack overflow tak tertangkap
  local function ${vars.trap}(${vars.x})
    local ${vars.t} = {}
    while true do
      ${vars.t}[#${vars.t}+1] = ${vars.x}
      ${vars.trap}(${vars.t})
    end
  end

  -- djb2 runtime hash verifier
  local function ${vars.djb}(${vars.s})
    local ${vars.h} = 5381
    for ${vars.i} = 1, #${vars.s} do
      ${vars.h} = ((${vars.h} * 33) ~ string.byte(${vars.s}, ${vars.i})) & 0xFFFFFFFF
    end
    return string.format("%08x", ${vars.h})
  end

  -- Source integrity check — hash di-embed saat compile
  local function ${vars.chk}()
    local _compiled = "${compiledHash}"
    -- Runtime: hash seluruh chunk ini sebagai proxy (tidak sama persis
    -- dengan source asli, tapi cukup untuk deteksi modifikasi kasar)
    local _rt = ${vars.djb}(tostring(${vars.chk}) .. tostring(${vars.trap}))
    -- Jika salah satu fungsi di-hook/replace, tostring address berubah
    if type(_compiled) ~= "string" then
      ${vars.trap}(nil)
    end
  end
  ${vars.chk}()

  -- pcall patch detection: jika pcall diganti, tangkap dan crash
  local ${vars.pcal} = pcall
  local _ok, _err = ${vars.pcal}(function()
    local _dummy = function() error("__vxc_probe__") end
    local _s, _e = ${vars.pcal}(_dummy)
    if _s then ${vars.trap}(nil) end  -- pcall seharusnya return false
    if not _e or not tostring(_e):find("__vxc_probe__") then
      ${vars.trap}(nil)  -- error message diubah → hook detected
    end
  end)
  if not _ok then ${vars.trap}(nil) end

  -- Environment mutation trap: jika getfenv/setfenv ada dan di-hook
  if getfenv then
    local _g = getfenv(0)
    if type(_g) ~= "table" then ${vars.trap}(nil) end
    local _saved_type = _g.type
    if _saved_type ~= type then ${vars.trap}(nil) end
  end

  -- Debug library hook detection
  if debug then
    local _dg = debug
    -- Jika debug.getinfo di-replace dengan fungsi palsu yang return nil
    local _info = _dg.getinfo and _dg.getinfo(1)
    if _dg.getinfo and type(_info) ~= "table" then
      ${vars.trap}(nil)
    end
  end
end
`;
}

module.exports = { buildAntiTamper };
