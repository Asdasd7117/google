const express = require("express");
const request = require("request");
const { JSDOM } = require("jsdom");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, "public")));

// مسار البروكسي
app.use("/search", (req, res) => {
  const url = "https://duckduckgo.com" + req.url;

  request(url, (err, resp, body) => {
    if (err) return res.status(500).send("Proxy Error");

    const dom = new JSDOM(body);
    const document = dom.window.document;
    const baseUrl = "https://duckduckgo.com";

    // إعادة كتابة الروابط
    document.querySelectorAll("a[href]").forEach(a => {
      const abs = new URL(a.href, baseUrl).toString();
      a.href = "/search" + abs.replace(baseUrl, "");
    });
    document.querySelectorAll("[src]").forEach(el => {
      const abs = new URL(el.src, baseUrl).toString();
      el.src = "/search" + abs.replace(baseUrl, "");
    });
    document.querySelectorAll("link[href]").forEach(el => {
      const abs = new URL(el.href, baseUrl).toString();
      el.href = "/search" + abs.replace(baseUrl, "");
    });
    document.querySelectorAll("form[action]").forEach(f => {
      const abs = new URL(f.action, baseUrl).toString();
      f.action = "/search" + abs.replace(baseUrl, "");
    });

    // السماح بالعرض داخل iframe
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    res.send(dom.serialize());
  });
});

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
});
