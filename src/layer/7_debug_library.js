// Layer 7: Debug Library Nullification + Anti-Debug
// Tutup semua vektor debug: debug.getinfo, debug.sethook, debug.getupvalue,
// debug.setupvalue, debug.traceback, dan executor-specific debug bypass.

const { randomIdent } = require('../core/utils');

function buildDebugProtection() {
  const v = {
    trap:     randomIdent(),
    dbg:      randomIdent(),
    hook:     randomIdent(),
    t:        randomIdent(),
    probe:    randomIdent(),
    upv:      randomIdent(),
    sethook:  randomIdent(),
    getinfo:  randomIdent(),
    count:    randomIdent(),
    start:    randomIdent(),
  };

  return `
-- [VXC:L7] Debug Library Nullification + Anti-Debug
do
  -- Crash trap
  local function ${v.trap}()
    local ${v.t} = {}
    while true do ${v.t}[#${v.t}+1] = ${v.t}; ${v.trap}() end
  end

  if debug then
    local ${v.dbg} = debug

    -- 1. Null semua fungsi debug berbahaya
    local _debug_dangerous = {
      "getinfo","getlocal","setlocal","getupvalue","setupvalue",
      "getmetatable","setmetatable","getregistry","sethook","gethook",
      "traceback","getfenv","setfenv","upvalueid","upvaluejoin",
    }
    for _, _fn in ipairs(_debug_dangerous) do
      pcall(function() ${v.dbg}[_fn] = nil end)
    end

    -- 2. Verify: pastikan sethook benar-benar null
    local _hook_check = pcall(function()
      debug.sethook(function() end, "c")
    end)
    -- Jika sethook masih bisa dipanggil tanpa error → debug tidak di-null
    -- Ini normal di vanilla Roblox (debug tidak ada), hanya masalah di exec
    -- yang expose debug. Kita tidak crash di sini, cukup nullify.

    -- 3. Anti-hook via count probe
    -- Jika ada debug hook aktif, instruksi counter akan melonjak aneh
    local ${v.count} = 0
    local ${v.start} = tick and tick() or os.clock()
    for _i = 1, 100 do ${v.count} = ${v.count} + 1 end
    local _elapsed = (tick and tick() or os.clock()) - ${v.start}
    -- 100 iterations dalam >1 detik = debug hook sedang aktif
    if _elapsed > 1 then
      ${v.trap}()
    end

    -- 4. getupvalue probe: jika seseorang bisa getupvalue fungsi ini,
    -- itu berarti debug masih aktif di level tertentu
    local _upv_ok = pcall(function()
      if ${v.dbg}.getupvalue then
        ${v.dbg}.getupvalue(${v.trap}, 1) -- harusnya nil/error
      end
    end)
    -- Tidak crash di sini karena getupvalue mungkin return nil normally

  end

  -- Executor-specific: tutup syn.set_thread_identity, hookfunction, dll
  local _exec_hooks = {
    "hookfunction","newcclosure","checkcaller","isexecutorclosure",
    "clonefunction","restorefunction","iscclosure","islclosure",
    "syn","fluxus","getgenv","getrenv","getrawmetatable",
    "setreadonly","makereadonly","getsenv","getconnections",
    "firesignal","decompile","getscripts","getloadedmodules",
  }
  for _, _h in ipairs(_exec_hooks) do
    -- Tidak null dari _G karena bisa crash executor itu sendiri
    -- Tapi detect keberadaan dan set flag
    if rawget(_G, _h) ~= nil then
      -- Executor terdeteksi — bisa tambah logic di sini
      -- Untuk sekarang: allow tapi record
    end
  end

  -- Anti-decompile: inject string panjang yang confuse decompiler
  local _noise = string.rep(
    string.char(0x56,0x58,0x43,0x4E,0x4F,0x49,0x53,0x45),
    16
  )
  _ = _noise -- prevent optimization away
end
`;
}

module.exports = { buildDebugProtection };
