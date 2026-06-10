const http = require('http');
const httpProxy = require('http-proxy');
const localtunnel = require('localtunnel');

const PORT = 3000; 
const TARGET = 'https://smileysmp.eagler.host';

// 1. Build the backend WebSocket proxy server
const proxy = httpProxy.createProxyServer({
  target: TARGET,
  changeOrigin: true, 
  secure: false,      
  ws: true            
});

// Handle proxy errors safely
proxy.on('error', (err, req, res) => {
  console.error('Proxy Error:', err);
  if (res && !res.headersSent && typeof res.writeHead === 'function') {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy error occurred.');
  }
});

// Automatically inject headers to bypass Localtunnel's landing warning page
proxy.on('proxyReq', function(proxyReq, req, res, options) {
  proxyReq.setHeader('bypass-tunnel-reminder', 'true');
  proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
});

proxy.on('proxyReqWs', function(proxyReq, req, socket, options, head) {
  proxyReq.setHeader('bypass-tunnel-reminder', 'true');
  proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
});

const server = http.createServer((req, res) => {
  proxy.web(req, res, (err) => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy routing active.');
    }
  });
});

// Forward the WebSocket 'upgrade' events safely
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, (err) => {
    console.error('WebSocket Proxy Error:', err);
    socket.destroy();
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend server active on internal port ${PORT}`);

  // 2. Automatically launch Localtunnel inside Render's container
  try {
    const tunnel = await localtunnel({ port: PORT });
    
    console.log("=========================================");
    console.log(`YOUR COPYABLE LINK: ${tunnel.url}`);
    console.log("=========================================");

    tunnel.on('close', () => {
      console.log("Tunnel connection lost.");
    });
  } catch (error) {
    console.error("Localtunnel initialization failed:", error);
  }
});
