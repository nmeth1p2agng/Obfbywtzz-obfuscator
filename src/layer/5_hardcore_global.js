// Layer 5: Hardcore Global Protection
// - Rename semua global yang digunakan ke local alias terobfuscate
// - Protect _G dari akses luar
// - Inject junk globals untuk mislead debugger
// - Wrap semua dalam do...end block

const { randomIdent, randomStr } = require('../core/utils');

// Daftar Roblox global yang perlu di-alias
const ROBLOX_GLOBALS = [
  'game','workspace','script','_G','_ENV',
  'Instance','Vector3','CFrame','Color3','UDim2','UDim',
  'Enum','TweenInfo','BrickColor','Ray','Region3',
  'task','coroutine','table','string','math','os',
  'tostring','tonumber','type','pairs','ipairs','next','select',
  'setmetatable','getmetatable','rawget','rawset','rawequal','rawlen',
  'error','assert','pcall','xpcall','load','loadstring',
  'print','warn','unpack','require',
  'tick','wait','spawn','delay','typeof',
  'getn','ipairs','collectgarbage',
  'utf8','bit32',
  'Axes','BrickColor','CatalogSearchParams','ColorSequence',
  'ColorSequenceKeypoint','DateTime','DockWidgetPluginGuiInfo',
  'Faces','FloatCurveKey','Font','NumberRange','NumberSequence',
  'NumberSequenceKeypoint','OverlapParams','PathWaypoint',
  'PhysicalProperties','RaycastParams','RaycastResult',
  'RotationCurveKey','SharedTable','TweenInfo','Vector2',
  'Vector2int16','Vector3int16',
];

function buildHardcoreGlobal(code) {
  const aliasMap = {};

  // Generate alias untuk setiap global
  for (const g of ROBLOX_GLOBALS) {
    aliasMap[g] = randomIdent();
  }

  // Junk globals — mislead static analysis
  const junkCount = 20;
  const junkDecls = [];
  for (let i = 0; i < junkCount; i++) {
    const junkName = randomIdent();
    const junkVal  = randomIdent();
    // Junk yang terlihat meaningful tapi tidak pernah dipakai
    junkDecls.push(`local ${junkName} = nil -- junk`);
  }

  // Build alias declarations
  const aliasDecls = Object.entries(aliasMap)
    .map(([orig, alias]) => `local ${alias} = ${orig}`)
    .join('\n');

  // Replace global references di code dengan alias
  let obfCode = code;
  for (const [orig, alias] of Object.entries(aliasMap)) {
    // Word boundary replacement — hindari substring match
    const re = new RegExp(`\\b${orig}\\b`, 'g');
    obfCode = obfCode.replace(re, alias);
  }

  // _G protection: wrap akses ke _G dengan proxy
  const gProxy   = randomIdent();
  const realG    = aliasMap['_G'] || randomIdent();
  const guardFn  = randomIdent();
  const banned   = ['getfenv','setfenv','debug','rawget','rawset'];
  const bannedLua = banned.map(b => `["${b}"]=true`).join(',');

  const gProtect = `
-- _G proxy: blok akses ke fungsi berbahaya dari luar VM
local ${gProxy} = setmetatable({}, {
  __index = function(_, k)
    local _banned = {${bannedLua}}
    if _banned[k] then return nil end
    return ${realG}[k]
  end,
  __newindex = function(_, k, v)
    ${realG}[k] = v
  end,
  __metatable = false,
})
`;

  // Shuffle junk di antara alias agar tidak mudah dibaca
  const shuffled = shuffleArray([...junkDecls]);
  const halfJunk = shuffled.slice(0, 10);
  const restJunk = shuffled.slice(10);

  return `do
-- [VXC:L5] Hardcore Global Aliasing + Protection
${halfJunk.join('\n')}
${aliasDecls}
${gProtect}
${restJunk.join('\n')}

${obfCode}
end`;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { buildHardcoreGlobal };
