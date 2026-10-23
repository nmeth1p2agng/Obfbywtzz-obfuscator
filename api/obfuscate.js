// ============================================================
// FILE: api/obfuscate.js
// Ganti seluruh isi file ini
// ============================================================

const { obfuscate } = require('../src/core/pipeline');

// Manual body parser — Vercel serverless tidak auto-parse JSON
function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  // Set JSON header pertama kali sebelum apapun
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body — handle keduanya: sudah di-parse Vercel atau belum
    let body = req.body;
    if (!body || typeof body !== 'object') {
      body = await parseBody(req);
    }

    const { source } = body || {};

    if (!source || typeof source !== 'string') {
      return res.status(400).json({ error: 'source is required (string)' });
    }

    if (source.length > 500000) {
      return res.status(413).json({ error: 'Source too large (max 500KB)' });
    }

    const startTime = Date.now();
    const result = obfuscate(source);
    const elapsed = Date.now() - startTime;

    return res.status(200).json({
      result,
      stats: {
        inputSize:  source.length,
        outputSize: result.length,
        ratio:      (result.length / source.length).toFixed(2),
        elapsedMs:  elapsed,
        layers:     7,
        timestamp:  new Date().toISOString(),
      }
    });

  } catch (err) {
    console.error('[VXC] Error:', err);
    return res.status(500).json({
      error:   'Obfuscation failed',
      message: err.message || String(err),
    });
  }
};
