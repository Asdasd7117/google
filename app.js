const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

let browser;
let pages = [];
let syncActive = false;

// واجهة HTML بسيطة للزر
app.get('/', (req, res) => {
  res.send(`
    <h2>Chrome Sync Controller</h2>
    <button onclick="fetch('/toggle').then(()=>location.reload())">
      ${syncActive ? 'إيقاف المزامنة' : 'تشغيل المزامنة'}
    </button>
  `);
});

// تشغيل / إيقاف المزامنة
app.get('/toggle', async (req, res) => {
  syncActive = !syncActive;
  res.sendStatus(200);
});

// فتح المتصفح مع 6 تبويبات
async function startBrowser(url) {
  browser = await puppeteer.launch({ headless: false });
  
  const firstPage = await browser.newPage();
  await firstPage.goto(url);
  pages.push(firstPage);

  for (let i = 1; i < 6; i++) {
    const page = await browser.newPage();
    await page.goto(url);
    pages.push(page);
  }

  // رصد الكتابة والنقر في التبويب الأول
  await firstPage.exposeFunction('syncInput', async (text) => {
    if (syncActive) {
      for (let i = 1; i < pages.length; i++) {
        await pages[i].evaluate((txt) => {
          const input = document.querySelector('input');
          if (input) input.value = txt;
        }, text);
      }
    }
  });

  await firstPage.evaluate(() => {
    const input = document.querySelector('input');
    if (input) {
      input.addEventListener('input', e => {
        window.syncInput(e.target.value);
      });
    }
  });
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  const url = 'https://example.com'; // ضع رابط الموقع هنا
  await startBrowser(url);
});
