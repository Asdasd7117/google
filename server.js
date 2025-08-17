const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// بروكسي كامل لأي رابط يرسل من المربع
app.use('/p', createProxyMiddleware({
  target: '', // سيتم تغييره ديناميكياً
  changeOrigin: true,
  router: (req) => {
    const url = req.query.url;
    return url; // أي رابط يرسل سيتم بروكسيه
  },
  pathRewrite: (path, req) => '', // إزالة مسار /p بعد التحويل
}));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
