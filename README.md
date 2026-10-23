# VXC Obfuscator — Roblox Lua Protection

7-layer obfuscation system untuk Lua scripts Roblox.

## Layer System (Urutan Eksekusi)

```
L7 Debug Guard  →  L6 FFI Guard  →  L1 Anti-Tamper
→  L5 Global Alias  →  L4 Double VM  →  L2 VM Core
→  L3 LZ Compression + XOR Encrypt
```

| Layer | Nama | Fungsi |
|-------|------|--------|
| L1 | Anti-Tamper | Hash check + crash on RE, pcall hook detect, env mutation trap |
| L2 | VM Core | Custom bytecode interpreter, opcode shuffled per-build |
| L3 | VM Compression | LZ77 compress + XOR encrypt, dekompresi di runtime |
| L4 | Double VM | Outer+Inner VM isolasi, magic number integrity check |
| L5 | Hardcore Global | Alias semua global, junk injection, _G proxy |
| L6 | FFI Library | Null semua ffi/jit.util dangerous functions |
| L7 | Debug Library | Null debug.*, anti-hook timing probe |

## Deploy ke Vercel

```bash
npm install -g vercel
vercel --prod
```

## Local Dev

```bash
npm install
npm run dev
# → http://localhost:3000
```

## API

```http
POST /api/obfuscate
Content-Type: application/json

{ "source": "-- your lua script" }
```

Response:
```json
{
  "result": "-- obfuscated output",
  "stats": {
    "inputSize": 100,
    "outputSize": 3200,
    "ratio": "32.00",
    "elapsedMs": 45,
    "layers": 7
  }
}
```

## Web UI Shortcuts

- `Ctrl+Enter` — Jalankan obfuscate
- `Load Example` — Load contoh ESP script
- `⬇ Download` — Download hasil sebagai `.lua`
