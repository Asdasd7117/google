// server.js
const express = require("express");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { lookup: lookupMime } = require("mime-types");
const helmet = require("helmet");
const { URL } = require("url");

const app = express();
const PORT = process.env.PORT || 3000;

// نصائح أمان HTTP بسيطة (نسمح بالإطار لأن هدفنا إظهار iframes)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// خدم الملفات الستاتيكية (واجهة المستخدم)
app.use(express.static("public"));

function resolveUrl(url, base) {
  try {
    return new URL(url, base).toString();
  } catch (e) {
    return url;
  }
}

async function rewriteHtml(originalHtml, targetUrl) {
  const $ = cheerio.load(originalHtml, { decodeEntities: false });

  $('meta[http-equiv]').each((i, el) => {
    const val = ($(el).attr('http-equiv') || '').toLowerCase();
    if (val.includes('content-security-policy')) $(el).remove();
  });
  $('meta[name="csp"]').remove();

  $('script').each((i, el) => {
    const js = $(el).html() || '';
    const src = $(el).attr('src') || '';
    const lowered = js.toLowerCase() + ' ' + src.toLowerCase();

    if (
      lowered.includes('window.top') ||
      (lowered.includes('window.self') && lowered.includes('!=')) ||
      lowered.includes('top.location') ||
      lowered.includes('parent.location') ||
      lowered.includes('framebust') ||
      lowered.includes('framebuster') ||
      lowered.includes('breakout')
    ) {
      $(el).remove();
      return;
    }

    if (src) {
      const abs = resolveUrl(src, targetUrl);
      $(el).attr('src', `/asset?url=${encodeURIComponent(abs)}`);
    }
  });

  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const abs = resolveUrl(href, targetUrl);
    $(el).attr('href', `/proxy?url=${encodeURIComponent(abs)}`);
    $(el).attr('target', '_self');
  });

  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    const abs = resolveUrl(src, targetUrl);
    $(el).attr('src', `/asset?url=${encodeURIComponent(abs)}`);
  });

  $('link').each((i, el) => {
    const rel = ($(el).attr('rel') || '').toLowerCase();
    const href = $(el).attr('href');
    if (!href) return;
    const abs = resolveUrl(href, targetUrl);
    if (rel.includes('stylesheet') || rel.includes('icon') || rel.includes('preload')) {
      $(el).attr('href', `/asset?url=${encodeURIComponent(abs)}`);
    } else {
      $(el).attr('href', `/proxy?url=${encodeURIComponent(abs)}`);
    }
  });

  $('script[src]').each((i, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    const abs = resolveUrl(src, targetUrl);
    $(el).attr('src', `/asset?url=${encodeURIComponent(abs)}`);
  });

  const parsed = new URL(targetUrl);
  if ($('base').length === 0) {
    $('head').prepend(`<base href="${parsed.origin}">`);
  }

  $('body').prepend(
    `<div style="position:fixed;right:6px;top:6px;z-index:99999;background:rgba(0,0,0,0.6);color:#fff;padding:6px 8px;border-radius:6px;font-size:12px">Proxy View</div>`
  );

  return $.html();
}

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("ضع ?url=...");

  try {
    const upstreamResp = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      redirect: "follow",
    });

    const contentType = upstreamResp.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      const buffer = await upstreamResp.buffer();
      res.setHeader("Content-Type", contentType);
      return res.send(buffer);
    }

    let html = await upstreamResp.text();
    const rewritten = await rewriteHtml(html, target);

    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");

    return res.send(rewritten);
  } catch (err) {
    console.error("proxy error:", err);
    return res.status(500).send("خطأ أثناء جلب الصفحة.");
  }
});

app.get("/asset", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("ضع ?url=...");

  try {
    const upstreamResp = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      redirect: "follow",
    });
    const buffer = await upstreamResp.buffer();
    const contentType = upstreamResp.headers.get("content-type") || lookupMime(target) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.send(buffer);
  } catch (err) {
    console.error("asset error:", err);
    return res.status(500).send("خطأ أثناء جلب الأصل.");
  }
});

app.get("/_health", (req, res) => res.send("ok"));

app.listen(PORT, () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}`);
});
