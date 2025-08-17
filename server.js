const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const url = require('url');
const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// بروكسي كامل لأي رابط
app.get('/p', (req, res, next) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('رابط غير صالح');
  
  // إعادة توجيه الطلب باستخدام http-proxy-middleware ديناميكياً
  createProxyMiddleware({
    target,
    changeOrigin: true,
    secure: false, // لتجاوز مشاكل HTTPS
    pathRewrite: () => '', // إزالة أي مسار
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
