// Layer 2: VM Core — Custom Bytecode Interpreter
// Konversi instruksi Lua ke custom opcode, dieksekusi oleh VM interpreter
// Opcode shuffle per-build agar tidak statis

const { randomIdent, randomInt, encodeString } = require('../core/utils');

// Opcode table — di-shuffle tiap build
const BASE_OPCODES = {
  LOAD_CONST:   0x01,
  LOAD_VAR:     0x02,
  STORE_VAR:    0x03,
  ADD:          0x04,
  SUB:          0x05,
  MUL:          0x06,
  DIV:          0x07,
  CALL:         0x08,
  RETURN:       0x09,
  JUMP:         0x0A,
  JUMP_IF:      0x0B,
  NOT:          0x0C,
  CONCAT:       0x0D,
  GET_FIELD:    0x0E,
  SET_FIELD:    0x0F,
  CLOSURE:      0x10,
  LOAD_UPVAL:   0x11,
  STORE_UPVAL:  0x12,
  TABLE_NEW:    0x13,
  TABLE_SET:    0x14,
  TABLE_GET:    0x15,
  LEN:          0x16,
  MOD:          0x17,
  POW:          0x18,
  UNM:          0x19,
  BAND:         0x1A,
  BOR:          0x1B,
  BXOR:         0x1C,
  SHL:          0x1D,
  SHR:          0x1E,
  COMPARE_EQ:   0x1F,
  COMPARE_LT:   0x20,
  COMPARE_LE:   0x21,
  COMPARE_NEQ:  0x22,
  VARARG:       0x23,
  SELF:         0x24,
  FORPREP:      0x25,
  FORLOOP:      0x26,
  NOP:          0xFF,
};

function shuffleOpcodes(seed) {
  // Deterministic shuffle per build menggunakan seed
  const entries = Object.entries(BASE_OPCODES);
  const values = entries.map(e => e[1]);
  // Fisher-Yates dengan LCG seed
  let s = seed;
  const lcg = () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return s; };
  for (let i = values.length - 1; i > 0; i--) {
    const j = lcg() % (i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  const result = {};
  entries.forEach((e, i) => { result[e[0]] = values[i]; });
  return result;
}

function buildVMCore(opcodes, seed) {
  const v = {
    vm:       randomIdent(),
    exec:     randomIdent(),
    stack:    randomIdent(),
    regs:     randomIdent(),
    consts:   randomIdent(),
    upvals:   randomIdent(),
    env:      randomIdent(),
    pc:       randomIdent(),
    instr:    randomIdent(),
    op:       randomIdent(),
    a:        randomIdent(),
    b:        randomIdent(),
    c:        randomIdent(),
    chunk:    randomIdent(),
    code:     randomIdent(),
    dispatch: randomIdent(),
    frame:    randomIdent(),
    top:      randomIdent(),
    tmp:      randomIdent(),
    tbl:      randomIdent(),
    fn:       randomIdent(),
    args:     randomIdent(),
    res:      randomIdent(),
    i:        randomIdent(),
    k:        randomIdent(),
    seed_v:   randomIdent(),
  };

  const OP = opcodes;

  return `
-- [VXC:L2] VM Core Interpreter
-- Seed: ${seed} | Opcode map shuffled per-build
local ${v.vm} = (function()
  local ${v.seed_v} = ${seed}

  local function ${v.exec}(${v.chunk}, ${v.env}, ...)
    local ${v.code}    = ${v.chunk}.code
    local ${v.consts}  = ${v.chunk}.k
    local ${v.upvals}  = ${v.chunk}.upvals or {}
    local ${v.stack}   = {}
    local ${v.regs}    = {}
    local ${v.pc}      = 1
    local ${v.top}     = 0
    local _vargs       = {...}

    -- Helper: push ke stack
    local function _push(v)
      ${v.top} = ${v.top} + 1
      ${v.stack}[${v.top}] = v
    end
    local function _pop()
      local v = ${v.stack}[${v.top}]
      ${v.stack}[${v.top}] = nil
      ${v.top} = ${v.top} - 1
      return v
    end
    local function _peek(n)
      return ${v.stack}[${v.top} - (n or 0)]
    end

    -- Dispatch loop
    while ${v.pc} <= #${v.code} do
      local ${v.instr} = ${v.code}[${v.pc}]
      local ${v.op}    = ${v.instr}[1]
      local ${v.a}     = ${v.instr}[2]
      local ${v.b}     = ${v.instr}[3]
      local ${v.c}     = ${v.instr}[4]
      ${v.pc} = ${v.pc} + 1

      if ${v.op} == ${OP.LOAD_CONST} then
        _push(${v.consts}[${v.a}])

      elseif ${v.op} == ${OP.LOAD_VAR} then
        _push(${v.regs}[${v.a}] or ${v.env}[${v.consts}[${v.a}]])

      elseif ${v.op} == ${OP.STORE_VAR} then
        ${v.regs}[${v.a}] = _pop()

      elseif ${v.op} == ${OP.ADD} then
        local _r = _pop(); local _l = _pop()
        _push(_l + _r)

      elseif ${v.op} == ${OP.SUB} then
        local _r = _pop(); local _l = _pop()
        _push(_l - _r)

      elseif ${v.op} == ${OP.MUL} then
        local _r = _pop(); local _l = _pop()
        _push(_l * _r)

      elseif ${v.op} == ${OP.DIV} then
        local _r = _pop(); local _l = _pop()
        _push(_l / _r)

      elseif ${v.op} == ${OP.MOD} then
        local _r = _pop(); local _l = _pop()
        _push(_l % _r)

      elseif ${v.op} == ${OP.POW} then
        local _r = _pop(); local _l = _pop()
        _push(_l ^ _r)

      elseif ${v.op} == ${OP.CONCAT} then
        local _n = ${v.a}
        local _parts = {}
        for _ci = _n, 1, -1 do _parts[_ci] = _pop() end
        _push(table.concat(_parts))

      elseif ${v.op} == ${OP.NOT} then
        _push(not _pop())

      elseif ${v.op} == ${OP.UNM} then
        _push(-_pop())

      elseif ${v.op} == ${OP.LEN} then
        _push(#_pop())

      elseif ${v.op} == ${OP.BAND} then
        local _r = _pop(); local _l = _pop()
        _push(_l & _r)

      elseif ${v.op} == ${OP.BOR} then
        local _r = _pop(); local _l = _pop()
        _push(_l | _r)

      elseif ${v.op} == ${OP.BXOR} then
        local _r = _pop(); local _l = _pop()
        _push(_l ~ _r)

      elseif ${v.op} == ${OP.SHL} then
        local _r = _pop(); local _l = _pop()
        _push(_l << _r)

      elseif ${v.op} == ${OP.SHR} then
        local _r = _pop(); local _l = _pop()
        _push(_l >> _r)

      elseif ${v.op} == ${OP.COMPARE_EQ} then
        local _r = _pop(); local _l = _pop()
        _push(_l == _r)

      elseif ${v.op} == ${OP.COMPARE_NEQ} then
        local _r = _pop(); local _l = _pop()
        _push(_l ~= _r)

      elseif ${v.op} == ${OP.COMPARE_LT} then
        local _r = _pop(); local _l = _pop()
        _push(_l < _r)

      elseif ${v.op} == ${OP.COMPARE_LE} then
        local _r = _pop(); local _l = _pop()
        _push(_l <= _r)

      elseif ${v.op} == ${OP.TABLE_NEW} then
        _push({})

      elseif ${v.op} == ${OP.TABLE_SET} then
        local _val = _pop()
        local _key = _pop()
        local _tbl = _peek()
        _tbl[_key] = _val

      elseif ${v.op} == ${OP.TABLE_GET} then
        local _key = _pop()
        local _tbl = _pop()
        _push(_tbl[_key])

      elseif ${v.op} == ${OP.GET_FIELD} then
        local _obj = _pop()
        _push(_obj[${v.consts}[${v.a}]])

      elseif ${v.op} == ${OP.SET_FIELD} then
        local _val = _pop()
        local _obj = _pop()
        _obj[${v.consts}[${v.a}]] = _val

      elseif ${v.op} == ${OP.JUMP} then
        ${v.pc} = ${v.a}

      elseif ${v.op} == ${OP.JUMP_IF} then
        local _cond = _pop()
        if _cond then ${v.pc} = ${v.a} end

      elseif ${v.op} == ${OP.CALL} then
        local _argc = ${v.a}
        local _args = {}
        for _ai = _argc, 1, -1 do _args[_ai] = _pop() end
        local _callee = _pop()
        local _results = table.pack(_callee(table.unpack(_args)))
        for _ri = 1, _results.n do _push(_results[_ri]) end

      elseif ${v.op} == ${OP.SELF} then
        local _key = _pop()
        local _obj = _peek()
        _push(_obj[_key])

      elseif ${v.op} == ${OP.LOAD_UPVAL} then
        _push(${v.upvals}[${v.a}][1])

      elseif ${v.op} == ${OP.STORE_UPVAL} then
        ${v.upvals}[${v.a}][1] = _pop()

      elseif ${v.op} == ${OP.CLOSURE} then
        local _sub = ${v.consts}[${v.a}]
        local _ups = {}
        for _ui = 1, (_sub.nupvals or 0) do
          _ups[_ui] = {${v.regs}[${v.b} + _ui - 1]}
        end
        local _cl = function(...)
          return ${v.exec}(_sub, ${v.env}, ...)
        end
        _push(_cl)

      elseif ${v.op} == ${OP.VARARG} then
        for _vi = 1, ${v.a} do _push(_vargs[_vi]) end

      elseif ${v.op} == ${OP.FORPREP} then
        local _step  = _pop()
        local _limit = _pop()
        local _init  = _pop()
        _push(_init)
        _push(_limit)
        _push(_step)
        if (_init > _limit and _step > 0) or
           (_init < _limit and _step < 0) then
          ${v.pc} = ${v.a}
        end

      elseif ${v.op} == ${OP.FORLOOP} then
        local _step  = _peek(0)
        local _limit = _peek(1)
        local _cur   = _peek(2)
        local _next  = _cur + _step
        if (_step > 0 and _next <= _limit) or
           (_step < 0 and _next >= _limit) then
          ${v.stack}[${v.top} - 2] = _next
          ${v.regs}[${v.a}] = _next
          ${v.pc} = ${v.b}
        else
          _pop(); _pop(); _pop()
        end

      elseif ${v.op} == ${OP.RETURN} then
        local _n = ${v.a}
        if _n == 0 then return end
        local _rets = {}
        for _ri = _n, 1, -1 do _rets[_ri] = _pop() end
        return table.unpack(_rets)

      elseif ${v.op} == ${OP.NOP} then
        -- no-op junk instruction

      end
    end
  end

  return { exec = ${v.exec} }
end)()
`;
}

module.exports = { buildVMCore, shuffleOpcodes, BASE_OPCODES };
