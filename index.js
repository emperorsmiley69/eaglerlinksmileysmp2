const http = require('http');
const httpProxy = require('http-proxy');
const ngrok = require('@ngrok/ngrok');

const PORT = 3000; 
const TARGET = 'https://smileysmp.eagler.host';

// 1. Build the backend WebSocket proxy server
const proxy = httpProxy.createProxyServer({
  target: TARGET,
  changeOrigin: true, 
  secure: false,      
  ws: true            
});

// Handle proxy errors gracefully
proxy.on('error', (err, req, res) => {
  console.error('Proxy Error:', err);
  if (res && !res.headersSent && typeof res.writeHead === 'function') {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy error occurred.');
  }
});

const server = http.createServer((req, res) => {
  proxy.web(req, res, (err) => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy routing active.');
    }
  });
});

// Forward WebSocket upgrade events
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, (err) => {
    console.error('WebSocket Proxy Error:', err);
    socket.destroy();
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend server active on internal port ${PORT}`);

  // 2. Automatically launch Ngrok inside Render's container
  try {
    const session = await new ngrok.SessionBuilder().authtokenFromEnv().connect();
    const tunnel = await session.httpEndpoint().listen();
    
    console.log("=========================================");
    console.log(`YOUR COPYABLE LINK: ${tunnel.url()}`);
    console.log("=========================================");

  } catch (error) {
    console.error("Ngrok initialization failed:", error);
    console.log("CRITICAL: Ensure NGROK_AUTHTOKEN is configured in Render Environment Variables.");
  }
});
