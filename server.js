const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();

// خدمة الواجهة الثابتة
app.use(express.static("public"));

// بروكسي لجميع روابط Google
app.use("/proxy", createProxyMiddleware({
    target: "https://www.google.com",
    changeOrigin: true,
    pathRewrite: { "^/proxy": "" },
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
    },
    // إعادة توجيه كل الروابط داخل iframe
    router: function(req) {
        return "https://www.google.com";
    }
}));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("🚀 Proxy Server شغال على البورت " + port);
});
