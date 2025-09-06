const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let browser;
let pages = [];

async function launchBrowser(url) {
  const chromePath = await chromeLauncher.Launcher.getInstallations()[0];
  browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false
  });
  pages = [];
  for (let i = 0; i < 6; i++) {
    const page = await browser.newPage();
    await page.goto(url);
    pages.push(page);
  }
}

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('openTabs', async (url) => {
    if (browser) await browser.close();
    await launchBrowser(url);
    socket.emit('tabsOpened', 6);
  });

  socket.on('syncEvent', async (event) => {
    if (!pages.length) return;
    // نفذ نفس الحدث على باقي التبويبات
    for (let i = 1; i < pages.length; i++) {
      try {
        if (event.type === 'click') {
          await pages[i].click(event.selector);
        } else if (event.type === 'input') {
          await pages[i].focus(event.selector);
          await pages[i].keyboard.type(event.value);
        }
      } catch (err) {
        console.log('Error syncing:', err.message);
      }
    }
  });
});

server.listen(10000, () => console.log('Server running on port 10000'));
