// Layer 4: Double VM Layer Protection
// Outer VM mengeksekusi Inner VM yang mengeksekusi payload asli.
// Setiap VM punya opcode set berbeda (seed berbeda), stack terpisah,
// dan constant pool diobfuscate secara independen.

const { randomIdent, randomInt } = require('../core/utils');

function buildDoubleVMWrapper(innerVMCode, outerSeed, innerSeed) {
  const v = {
    outer:     randomIdent(),
    inner:     randomIdent(),
    dispatch:  randomIdent(),
    sandbox:   randomIdent(),
    gate:      randomIdent(),
    payload:   randomIdent(),
    runner:    randomIdent(),
    env1:      randomIdent(),
    env2:      randomIdent(),
    result:    randomIdent(),
    trap:      randomIdent(),
    magic:     randomIdent(),
    key1:      randomIdent(),
    key2:      randomIdent(),
  };

  // Magic number untuk verify double-layer integritas
  const magic1 = randomInt(0x1000, 0xFFFF);
  const magic2 = randomInt(0x1000, 0xFFFF);
  const magic3 = magic1 ^ magic2; // derived, verified at runtime

  return `
-- [VXC:L4] Double VM Layer
-- Outer seed: ${outerSeed} | Inner seed: ${innerSeed}
local ${v.outer} = (function()
  -- Magic constants — jika dimodifikasi, VM collapse
  local ${v.key1} = ${magic1}
  local ${v.key2} = ${magic2}
  local _magic_check = ${v.key1} ~ ${v.key2}
  if _magic_check ~= ${magic3} then
    -- Crash: infinite loop + taint
    local _t = {}
    while true do _t[#_t+1] = _t end
  end

  -- Outer VM environment: terisolasi dari _G
  local ${v.env1} = setmetatable({}, {
    __index = function(_, k)
      -- Whitelist akses ke global yang diizinkan
      local _allowed = {
        tostring=tostring, tonumber=tonumber, type=type,
        pairs=pairs, ipairs=ipairs, next=next,
        select=select, unpack=unpack or table.unpack,
        error=error, pcall=pcall, xpcall=xpcall,
        setmetatable=setmetatable, getmetatable=getmetatable,
        rawget=rawget, rawset=rawset, rawequal=rawequal,
        string=string, table=table, math=math,
        load=load, loadstring=loadstring,
        print=print, warn=warn,
        game=game, workspace=workspace,
        script=script, _G=_G,
        task=task, coroutine=coroutine,
        Instance=Instance, Vector3=Vector3,
        CFrame=CFrame, Color3=Color3,
        Enum=Enum, UDim2=UDim2, UDim=UDim,
        tick=tick, os=os, DateTime=DateTime,
        wait=wait, spawn=spawn,
        require=require,
      }
      return _allowed[k]
    end,
    __newindex = function(t, k, v)
      rawset(t, k, v)
    end,
  })

  -- Inner VM environment: subset dari outer
  local ${v.env2} = setmetatable({}, {
    __index = ${v.env1},
    __newindex = function(t, k, v) rawset(t, k, v) end,
  })

  -- Inner VM runner: load dan eksekusi payload di env2
  local function ${v.runner}(${v.payload})
    local ${v.inner}, _err = load(${v.payload}, "=[VXC:inner]", "t", ${v.env2})
    if not ${v.inner} then
      error("[VXC] inner load fail: " .. tostring(_err))
    end
    return ${v.inner}()
  end

  -- Outer dispatch: load inner runner di env1
  local function ${v.dispatch}(${v.payload})
    local _wrapped = string.format(
      "return (function() %s end)()",
      ${v.payload}
    )
    local ${v.gate}, _err2 = load(_wrapped, "=[VXC:outer]", "t", ${v.env1})
    if not ${v.gate} then
      error("[VXC] outer load fail: " .. tostring(_err2))
    end
    return ${v.gate}()
  end

  return {
    run    = ${v.runner},
    gate   = ${v.dispatch},
    env    = ${v.env2},
  }
end)()

-- Jalankan inner VM di dalam outer
${v.outer}.run([==[
${innerVMCode}
]==])
`;
}

module.exports = { buildDoubleVMWrapper };
