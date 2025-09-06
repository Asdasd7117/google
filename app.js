const express = require("express");
const puppeteer = require("puppeteer-core");
const chrome = require("@sparticuz/chrome-linux");
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.static("public"));
app.use(express.json());

let browser;
let pages = [];

// فتح 6 تبويبات بنفس الموقع
async function startBrowser(url = "https://www.google.com") {
  browser = await puppeteer.launch({
    headless: false,
    executablePath: chrome.executablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const firstPage = await browser.newPage();
  await firstPage.goto(url);
  pages.push(firstPage);

  for (let i = 1; i < 6; i++) {
    const p = await browser.newPage();
    await p.goto(url);
    pages.push(p);
  }
}

// مزامنة كتابة النص
app.post("/sync-text", async (req, res) => {
  const { text } = req.body;
  for (let i = 1; i < pages.length; i++) {
    await pages[i].evaluate((t) => {
      const input = document.querySelector("input[type=text]");
      if (input) input.value = t;
    }, text);
  }
  res.sendStatus(200);
});

// مزامنة نقرة زر
app.post("/sync-click", async (req, res) => {
  const { selector } = req.body;
  for (let i = 1; i < pages.length; i++) {
    await pages[i].evaluate((s) => {
      const btn = document.querySelector(s);
      if (btn) btn.click();
    }, selector);
  }
  res.sendStatus(200);
});

// صفحة تحكم بسيطة
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startBrowser(); // يبدأ التبويبات تلقائيًا عند تشغيل السيرفر
});
