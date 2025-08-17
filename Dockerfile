FROM python:3.11-slim

# تثبيت الأدوات المطلوبة لتشغيل Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libcups2 \
    libxss1 \
    libgtk-3-0 \
    libdrm2 \
    libgbm1 \
    libxkbcommon-x11-0 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libcups2 \
    libxss1 \
    libgtk-3-0 \
    wget \
    unzip

# تثبيت Playwright
RUN pip install --upgrade pip
RUN pip install playwright

# تنزيل Chromium يدويًا
RUN playwright install --with-deps

# تعيين المسار الكامل للمتصفح
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

WORKDIR /app
COPY . /app

RUN pip install -r requirements.txt

EXPOSE 5000
CMD ["gunicorn", "app:app", "-b", "0.0.0.0:5000"]
