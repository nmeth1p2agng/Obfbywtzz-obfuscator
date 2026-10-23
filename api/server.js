// Local development server (bukan Vercel)
const http = require('http');
const path = require('path');
const fs   = require('fs');
const handler = require('./obfuscate');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Serve static files dari /public
  if (req.method === 'GET' && !req.url.startsWith('/api')) {
    const filePath = path.join(__dirname, '../public',
      req.url === '/' ? 'index.html' : req.url);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css' };
      res.setHeader('Content-Type', mime[ext] || 'text/plain');
      return res.end(fs.readFileSync(filePath));
    }
    res.writeHead(404);
    return res.end('Not found');
  }

  // API route
  if (req.url === '/api/obfuscate') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try { req.body = JSON.parse(body); } catch { req.body = {}; }
      await handler(req, res);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[VXC] Dev server running at http://localhost:${PORT}`);
});
