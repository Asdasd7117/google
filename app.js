const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const puppeteer = require("puppeteer"); // ← استبدلنا puppeteer-core بالنسخة الكاملة

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let pages = [];

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("🔌 Client connected");

  socket.on("sync-action", async (data) => {
    console.log("🔄 Syncing action:", data);
    if (!pages.length) return;

    for (let i = 1; i < pages.length; i++) {
      try {
        if (data.type === "click") {
          await pages[i].click(data.selector);
        } else if (data.type === "input") {
          await pages[i].focus(data.selector);
          await pages[i].keyboard.type(data.value);
        }
      } catch (err) {
        console.error("⚠️ Error syncing tab:", err.message);
      }
    }
  });
});

async function startBrowser(url) {
  console.log("🚀 Launching browser...");
  const browser = await puppeteer.launch({
    headless: true, // خليه true عشان Render ما يعرض واجهة
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  pages = [];
  const page = await browser.newPage();
  await page.goto(url);
  pages.push(page);

  // فتح تبويبات إضافية
  for (let i = 0; i < 5; i++) {
    const p = await browser.newPage();
    await p.goto(url);
    pages.push(p);
  }

  console.log("✅ Opened 6 tabs on:", url);
}

app.get("/start", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.send("❌ Provide ?url=example.com");

  await startBrowser(url);
  res.send(`✅ Opened 6 tabs for <b>${url}</b>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🌍 Server running on port ${PORT}`);
});
