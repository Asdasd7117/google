const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const compression = require("compression");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

// وسطاء مفيدة
app.use(morgan("dev"));
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// واجهة ثابتة
app.use(express.static("public"));

// مساعد لتحويل أي رابط نسبي إلى مطلق
function toAbsolute(baseUrl, maybeRelative) {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}

// دالة رئيسية لجلب أي URL وتمريره عبر البروكسي
async function fetchThroughProxy(targetUrl, req) {
  const method = req.method; // GET/POST/...
  const headers = {
    // تزييف المتصفح لتجنب حظر بدائي
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
    "Accept-Language": req.headers["accept-language"] || "ar,en;q=0.9",
    Accept:
      req.headers.accept ||
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: targetUrl
  };

  const axiosOptions = {
    method,
    url: targetUrl,
    // نحتاج arraybuffer حتى للـ HTML كي نحافظ على أي ترميزات مختلفة
    responseType: "arraybuffer",
    maxRedirects: 5,
    headers
  };

  // ارسال البيانات للفورمات POST/PUT…
  if (["POST", "PUT", "PATCH"].includes(method)) {
    // إن كان المحتوى x-www-form-urlencoded
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(req.body);
      axiosOptions.data = params.toString();
      axiosOptions.headers["Content-Type"] =
        "application/x-www-form-urlencoded";
    } else {
      // إرسال JSON كما هو
      axiosOptions.data = req.body;
      axiosOptions.headers["Content-Type"] = contentType || "application/json";
    }
  }

  const resp = await axios(axiosOptions);
  return resp;
}

// مسار البروكسي العام: /p?url=<encoded target>
app.all("/p", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing ?url parameter");

  try {
    const upstream = await fetchThroughProxy(target, req);
    const contentType = upstream.headers["content-type"] || "";

    // السماح بالتضمين داخل iframe
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    // (1) لو المحتوى HTML: نعيد كتابة الروابط والفورمات والملفات
    if (contentType.includes("text/html")) {
      // محاولة كشف الترميز (بسيطة)
      let charset = "utf-8";
      const ct = contentType.toLowerCase();
      const m = ct.match(/charset=([^;]+)/);
      if (m && m[1]) charset = m[1].trim();

      let html = Buffer.from(upstream.data).toString(charset);
      const $ = cheerio.load(html, { decodeEntities: false });

      const baseUrl = target;

      // إعادة كتابة <a href> و <link href>
      $("a[href], link[href]").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href");
        if (!href) return;
        const abs = toAbsolute(baseUrl, href);
        $el.attr("href", `/p?url=${encodeURIComponent(abs)}`);
      });

      // إعادة كتابة src (صور/سكربت/فريم…)
      $("[src]").each((_, el) => {
        const $el = $(el);
        const src = $el.attr("src");
        if (!src) return;
        const abs = toAbsolute(baseUrl, src);
        $el.attr("src", `/p?url=${encodeURIComponent(abs)}`);
      });

      // إعادة كتابة أكشن الفورمات
      $("form[action]").each((_, el) => {
        const $el = $(el);
        const action = $el.attr("action");
        const abs = toAbsolute(baseUrl, action);
        $el.attr("action", `/p?url=${encodeURIComponent(abs)}`);
        // اجعل الطريقة واضحة لتفادي مشاكل بعض المواقع
        const method = ($el.attr("method") || "GET").toUpperCase();
        $el.attr("method", method);
      });

      // تعويض وسم <base> إن وجد (لأننا نحول كل شيء مطلقًا)
      $("base").remove();

      res.setHeader("Content-Type", `text/html; charset=${charset}`);
      return res.send($.html());
    }

    // (2) غير HTML: (صور/JS/CSS/خطوط/..) نعيد تمريرها كما هي
    res.setHeader("Content-Type", contentType);
    return res.send(Buffer.from(upstream.data));
  } catch (err) {
    const status = err.response?.status || 500;
    const msg = err.response?.statusText || err.message || "Proxy error";
    return res.status(status).send(`Proxy error (${status}): ${msg}`);
  }
});

// فحص صحة
app.get("/healthz", (req, res) => res.send("OK"));

// شغل السيرفر
app.listen(PORT, () => {
  console.log(`✅ Reverse proxy running on http://localhost:${PORT}`);
});
