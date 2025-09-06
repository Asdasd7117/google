const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const puppeteer = require("puppeteer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json());

let browser;
let pages = [];

app.post("/start-tabs", async (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).send("URL missing");

  if (!browser) {
    browser = await puppeteer.launch({ headless: false });
  }

  pages = [];
  const firstPage = await browser.newPage();
  await firstPage.goto(url);
  pages.push(firstPage);

  for (let i = 0; i < 5; i++) {
    const p = await browser.newPage();
    await p.goto(url);
    pages.push(p);
  }

  res.send({ success: true, tabs: pages.length });
});

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("sync-input", async (text) => {
    for (let i = 1; i < pages.length; i++) {
      await pages[i].evaluate((t) => {
        const input = document.querySelector("input");
        if (input) input.value = t;
      }, text);
    }
  });

  socket.on("sync-click", async () => {
    for (let i = 1; i < pages.length; i++) {
      await pages[i].evaluate(() => {
        const btn = document.querySelector("button");
        if (btn) btn.click();
      });
    }
  });
});

server.listen(process.env.PORT || 10000, () => {
  console.log("Server running on port 10000");
});
