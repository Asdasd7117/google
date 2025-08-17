const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// بروكسي كامل لأي رابط
app.get('/p', (req, res, next) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('رابط غير صالح');

  createProxyMiddleware({
    target,
    changeOrigin: true,
    secure: false,
    pathRewrite: () => '',
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
