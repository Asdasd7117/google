const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();

// فتح واجهة index.html
app.use(express.static("public"));

// بروكسي لجوجل
app.use("/proxy", createProxyMiddleware({
    target: "https://www.google.com",
    changeOrigin: true,
    pathRewrite: { "^/proxy": "" },
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
    }
}));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("🚀 Proxy Server شغال على البورت " + port);
});
