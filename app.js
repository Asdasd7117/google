const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const puppeteer = require("puppeteer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let browser, pages = [];

app.use(express.static("public")); // index.html موجود هنا

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("startSync", async (url) => {
    if (!browser) {
      browser = await puppeteer.launch({ headless: false });
      pages = [];
      // افتح 6 تبويبات
      const page0 = await browser.newPage();
      await page0.goto(url);
      pages.push(page0);
      for (let i = 1; i < 6; i++) {
        const p = await browser.newPage();
        await p.goto(url);
        pages.push(p);
      }
    }
  });

  socket.on("keyEvent", async ({ key }) => {
    // أرسل أي كتابة في التبويبة الأولى لباقي التبويبات
    for (let i = 1; i < pages.length; i++) {
      await pages[i].keyboard.press(key);
    }
  });

  socket.on("clickEvent", async () => {
    for (let i = 1; i < pages.length; i++) {
      await pages[i].mouse.click(100, 100); // تعديل الإحداثيات حسب الحاجة
    }
  });
});

server.listen(10000, () => {
  console.log("Server running on port 10000");
});
