const express = require("express");
const request = require("request");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

// مساعدة لتحويل روابط نسبية إلى مطلقة
function toAbsolute(base, rel) {
  try {
    return new URL(rel, base).toString();
  } catch {
    return rel;
  }
}

// بروكسي كامل
app.use("/search", (req, res) => {
  const url = "https://duckduckgo.com" + req.url;

  request(url, (err, resp, body) => {
    if (err) return res.status(500).send("Proxy Error");

    const dom = new JSDOM(body);
    const document = dom.window.document;
    const baseUrl = "https://duckduckgo.com";

    // إعادة كتابة روابط <a>
    document.querySelectorAll("a[href]").forEach(a => {
      const abs = toAbsolute(baseUrl, a.href);
      a.href = "/search" + abs.replace(baseUrl, "");
    });

    // إعادة كتابة روابط <link href> و <script src> و <img src>
    document.querySelectorAll("[src]").forEach(el => {
      const abs = toAbsolute(baseUrl, el.src);
      el.src = "/search" + abs.replace(baseUrl, "");
    });
    document.querySelectorAll("link[href]").forEach(el => {
      const abs = toAbsolute(baseUrl, el.href);
      el.href = "/search" + abs.replace(baseUrl, "");
    });

    // إعادة كتابة فورمات <form action>
    document.querySelectorAll("form[action]").forEach(f => {
      const abs = toAbsolute(baseUrl, f.action);
      f.action = "/search" + abs.replace(baseUrl, "");
    });

    // السماح بالعرض داخل iframe
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    res.send(dom.serialize());
  });
});

app.listen(PORT, () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}`);
});
