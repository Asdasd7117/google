const puppeteer = require('puppeteer');

// ===== روابط السفارات =====
const SERVICES = {
    "الجزائر": "https://www.ecsc-expat.sy/algeria-service",
    "برلين": "https://www.ecsc-expat.sy/berlin-service",
    "بكين": "https://www.ecsc-expat.sy/beijing-service",
    "أثينا": "https://www.ecsc-expat.sy/athens-service",
    "القاهرة": "https://www.ecsc-expat.sy/cairo-service"
};

const TYPES = ["استخراج", "تجديد", "جواز سفر مستعجل", "جواز سفر عادي"];

(async () => {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();

    while (true) {
        for (const [embassy, url] of Object.entries(SERVICES)) {
            try {
                await page.goto(url, { waitUntil: 'networkidle2' });
                await page.waitForTimeout(3000); // انتظر تحميل الصفحة

                // محاكاة النقر على أي قوائم أو خيارات إذا موجودة
                const buttons = await page.$$('button, a');
                for (const btn of buttons) {
                    try { await btn.click(); await page.waitForTimeout(1000); } catch {}
                }

                const content = await page.evaluate(() => document.body.innerText);

                TYPES.forEach(type => {
                    if (content.includes(type)) {
                        console.log("🚨 حجز متاح!");
                        console.log("السفارة:", embassy);
                        console.log("النوع:", type);
                        console.log("رابط الحجز:", url);
                        console.log("-".repeat(40));
                    }
                });

            } catch (err) {
                console.log(`⚠️ خطأ في السفارة ${embassy}: ${err.message}`);
            }
        }

        await page.waitForTimeout(10000); // كل 10 ثواني
    }
})();
