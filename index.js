const http = require('http');
const httpProxy = require('http-proxy');
const localtunnel = require('localtunnel');

const PORT = 3000; 
// FIX: Added 'https://' protocol to prevent the split() null crash
const TARGET = 'https://smileysmp.eagler.host';

// 1. Build the backend WebSocket proxy server
const proxy = httpProxy.createProxyServer({
  target: TARGET,
  changeOrigin: true, // Changes the origin of the host header to the target URL
  secure: false,      // CRITICAL: Prevents SSL/TLS handshake crashes with the external host
  ws: true            // Enables WebSocket forwarding for Eaglercraft connections
});

// Handle proxy errors to prevent the node process from crashing dynamically
proxy.on('error', (err, req, res) => {
  console.error('Proxy Error:', err);
  if (res && !res.headersSent) {
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
