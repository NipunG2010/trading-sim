const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api': ''
      }
    })
  );

  // Also proxy static files from public directory
  app.use(
    '/',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      ws: true,
      filter: (path) => path.endsWith('.json'),
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying static:', req.method, req.url, '→', 'http://localhost:3001' + req.url);
      },
      onError: (err, req, res) => {
        console.error('Static File Proxy Error:', err);
        res.writeHead(503, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Service temporarily unavailable. Please ensure the backend server is running.'
        }));
      }
    })
  );
}; 