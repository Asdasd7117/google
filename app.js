const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const puppeteer = require("puppeteer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let browser;
let pages = [];

async function startBrowser(url) {
  browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  // افتح أول تبويبة واذهب للرابط
  const firstPage = await browser.newPage();
  await firstPage.goto(url, { waitUntil: "networkidle2" });
  pages.push(firstPage);

  // افتح 5 تبويبات إضافية خلفية بنفس الرابط
  for (let i = 0; i < 5; i++) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    pages.push(page);
  }
}

// المزامنة
io.on("connection", (socket) => {
  console.log("عميل متصل");

  socket.on("startSync", async (url) => {
    if (!browser) {
      await startBrowser(url);
      console.log("تم فتح 6 تبويبات");
    }
  });

  socket.on("keyEvent", async (data) => {
    for (let i = 1; i < pages.length; i++) {
      try {
        await pages[i].keyboard.type(data.key);
      } catch (err) {
        console.error("خطأ بالمزامنة:", err);
      }
    }
  });

  socket.on("clickEvent", async () => {
    for (let i = 1; i < pages.length; i++) {
      try {
        // يمكنك تعديل الإحداثيات حسب مكان الزر في الموقع
        await pages[i].mouse.click(200, 200);
      } catch (err) {
        console.error("خطأ كليك:", err);
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Server running on port", PORT));
