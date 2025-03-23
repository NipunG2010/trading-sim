const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const target = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/api': '/api'
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log proxy requests for debugging
        console.log('Proxying:', req.method, req.url, '→', target + req.url);
      },
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
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

  // Also proxy static files from public directory
  app.use(
    '/',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      filter: (path) => path.endsWith('.json'),
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying static:', req.method, req.url, '→', target + req.url);
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