# استخدم صورة Python الرسمية
FROM python:3.11-slim

# تثبيت أدوات نظام مطلوبة
RUN apt-get update && apt-get install -y curl git libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libcups2 libxss1 libgtk-3-0 wget unzip

# نسخ ملفات المشروع
WORKDIR /app
COPY . /app

# تثبيت المكتبات
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# تثبيت متصفح Chromium الخاص بـ Playwright
RUN playwright install chromium

#Expose port
EXPOSE 5000

# الأمر لتشغيل التطبيق
CMD ["gunicorn", "app:app", "-b", "0.0.0.0:5000"]
