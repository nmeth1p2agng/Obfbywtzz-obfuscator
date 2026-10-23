// Vercel Serverless Function: /api/obfuscate
// POST { source: string } → { result: string, stats: object }

const { obfuscate } = require('../src/core/pipeline');

module.exports = async (req, res) => {
  // CORS
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
    let body = req.body;
    // Vercel auto-parse JSON jika Content-Type: application/json
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const { source } = body || {};

    if (!source || typeof source !== 'string') {
      return res.status(400).json({ error: 'source is required (string)' });
    }

    if (source.length > 500_000) {
      return res.status(413).json({ error: 'Source too large (max 500KB)' });
    }

    const startTime = Date.now();
    const result = obfuscate(source);
    const elapsed = Date.now() - startTime;

    return res.status(200).json({
      result,
      stats: {
        inputSize:    source.length,
        outputSize:   result.length,
        ratio:        (result.length / source.length).toFixed(2),
        elapsedMs:    elapsed,
        layers:       7,
        timestamp:    new Date().toISOString(),
      }
    });

  } catch (err) {
    console.error('[VXC] Error:', err);
    return res.status(500).json({
      error:   'Obfuscation failed',
      message: err.message,
    });
  }
};
