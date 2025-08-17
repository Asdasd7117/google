// server.js
import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import { lookup as lookupMime } from "mime-types";
import helmet from "helmet";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// نصائح أمان HTTP بسيطة (نسمح بالإطار لأن هدفنا إظهار iframes)
app.use(
  helmet({
    contentSecurityPolicy: false, // سنعالج CSP بنفسنا عند الحاجة
  })
);

// خدم الملفات الستاتيكية (واجهة المستخدم)
app.use(express.static("public"));

/**
 * يساعد بتحويل قيمة نسبية إلى مطلقة بالنسبة للـ base
 */
function resolveUrl(url, base) {
  try {
    return new URL(url, base).toString();
  } catch (e) {
    return url;
  }
}

/**
 * يزيل سكربتات التفجير (frame-busting) والـ meta التي تمنع الإطار
 * ويعيدل الروابط في HTML لتشير إلى البروكسي (proxy route أو asset route)
 */
async function rewriteHtml(originalHtml, targetUrl) {
  const $ = cheerio.load(originalHtml, { decodeEntities: false });

  // 1) إزالة meta CSP أو meta http-equiv="Content-Security-Policy"
  $('meta[http-equiv]').each((i, el) => {
    const val = ($(el).attr('http-equiv') || '').toLowerCase();
    if (val.includes('content-security-policy')) $(el).remove();
  });
  $('meta[name="csp"]').remove();

  // 2) إزالة أي ترويسة X-Frame-Options غير مرئية هنا، لكن نحن لا نعيدها للعميل

  // 3) حذف السكربتات المعروفة أو التي تحتوي شروط framebusting
  $('script').each((i, el) => {
    const js = $(el).html() || '';
    const src = $(el).attr('src') || '';
    const lowered = js.toLowerCase() + ' ' + src.toLowerCase();

    // قواعد بسيطة لاكتشاف: window.top != window.self, top.location, parent.location, frameElement, break out
    if (
      lowered.includes('window.top') ||
      lowered.includes('window.self') && lowered.includes('!=') ||
      lowered.includes('top.location') ||
      lowered.includes('parent.location') ||
      lowered.includes('framebust') ||
      lowered.includes('framebuster') ||
      lowered.includes('breakout')
    ) {
      $(el).remove();
      return;
    }

    // إذا كان سكربت خارجي ونفس الدومين مرجح أنه يحتوي حماية، لدينا خيار إعادة توجيهه عبر asset proxy:
    if (src) {
      const abs = resolveUrl(src, targetUrl);
      $(el).attr('src', `/asset?url=${encodeURIComponent(abs)}`);
    }
  });

  // 4) تعديل الروابط لأننا نريد أن يبقى المستخدم داخل البروكسي عند النقر
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const abs = resolveUrl(href, targetUrl);
    $(el).attr('href', `/proxy?url=${encodeURIComponent(abs)}`);
    $(el).attr('target', '_self');
  });

  // 5) تعديل روابط الصور، CSS، وملفات JS إلى route /asset
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
    // لو هو css أو icon
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

  // 6) إضافة <base> لتصحيح الروابط النسبية (بعض المواقع تستخدمها)
  const parsed = new URL(targetUrl);
  const originBase = parsed.origin + parsed.pathname.replace(/\/[^/]*$/, '/');
  if ($('base').length === 0) {
    $('head').prepend(`<base href="${parsed.origin}">`);
  }

  // 7) إضافة تعليق أو banner صغير لبيان أن المحتوى يتم عبر proxy (يمكن حذفه)
  $('body').prepend(
    `<div style="position:fixed;right:6px;top:6px;z-index:99999;background:rgba(0,0,0,0.6);color:#fff;padding:6px 8px;border-radius:6px;font-size:12px">Proxy View</div>`
  );

  // 8) إرجاع HTML المعدل
  return $.html();
}

/**
 * route: /proxy?url=<target>
 * يعيد HTML معدل جاهز للعرض داخل iframe
 */
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("ضع ?url=...");

  try {
    // جلب الصفحة كـ text
    const upstreamResp = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      redirect: "follow",
    });

    const contentType = upstreamResp.headers.get("content-type") || "";

    // لو المحتوى ليس HTML نعيده كـ asset
    if (!contentType.includes("text/html")) {
      const buffer = await upstreamResp.arrayBuffer();
      res.setHeader("Content-Type", contentType);
      // نمنع أي قيود إطار من المصدر بالذات (لا نرسل headers الأصلية)
      return res.send(Buffer.from(buffer));
    }

    let html = await upstreamResp.text();

    // الفلترة وإعادة الكتابة
    const rewritten = await rewriteHtml(html, target);

    // تأكد أننا لا نعيد ترويسات CSP أو X-Frame-Options من المصدر
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // لا تضف CSP تقيد العرض، اسمح بما تحتاجه (يمكن ضبط لاحقاً)
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");

    return res.send(rewritten);
  } catch (err) {
    console.error("proxy error:", err);
    return res.status(500).send("خطأ أثناء جلب الصفحة.");
  }
});

/**
 * route: /asset?url=<targetResource>
 * يعيد css/js/img/fonts ... بنوعية صحيحة
 */
app.get("/asset", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("ضع ?url=...");

  try {
    const upstreamResp = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      redirect: "follow",
    });
    const buf = await upstreamResp.arrayBuffer();
    const contentType = upstreamResp.headers.get("content-type") || lookupMime(target) || "application/octet-stream";

    // لا ننقل هيدرات الحماية من المصدر؛ نعيد نوع المحتوى فقط
    res.setHeader("Content-Type", contentType);
    // Cache short (يمكن تغييره)
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.send(Buffer.from(buf));
  } catch (err) {
    console.error("asset error:", err);
    return res.status(500).send("خطأ أثناء جلب الأصل.");
  }
});

// optional: simple health route
app.get("/_health", (req, res) => res.send("ok"));

app.listen(PORT, () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}`);
});
