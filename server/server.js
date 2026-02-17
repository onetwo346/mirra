/* Mira proxy — your PC as the server.
   Forwards requests to Ollama and adds CORS so Mira works from any device. */

const http = require('http');

const OLLAMA_PORT = 11434;
const PROXY_PORT = 3001;

function addCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  addCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || !req.url.startsWith('/api/')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const body = [];
  req.on('data', (chunk) => body.push(chunk));
  req.on('end', () => {
    const buf = Buffer.concat(body);
    const options = {
      hostname: 'localhost',
      port: OLLAMA_PORT,
      path: req.url,
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Content-Length': buf.length
      }
    };

    const proxy = http.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers, 'Access-Control-Allow-Origin': '*' };
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxy.on('error', (err) => {
      console.error('Ollama error:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Could not reach Ollama. Is it running?' }));
    });

    proxy.write(buf);
    proxy.end();
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`\n  Mira proxy running on http://localhost:${PROXY_PORT}`);
  console.log(`  Expose with: npx cloudflared tunnel --url http://localhost:${PROXY_PORT}`);
  console.log(`  Then set MIRA_API_BASE in api-config.js to your tunnel URL.\n`);
});
