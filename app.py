from flask import Flask, render_template, request, jsonify
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
import threading
import time

app = Flask(__name__)

# الرابط الذي تريد فتحه
URL = "https://www.google.com"

# عدد التبويبات الخلفية
NUM_TABS = 5

# الحالة الحالية للنص والنقر
state = {"text": "", "click": False}

# إعداد Chrome وفتح التبويبات الخلفية
options = webdriver.ChromeOptions()
options.add_argument("--disable-extensions")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--headless")  # تبويبات خلفية
driver = webdriver.Chrome(service=Service("chromedriver"), options=options)
driver.get(URL)

# فتح باقي التبويبات
for _ in range(NUM_TABS - 1):
    driver.execute_script("window.open('{}');".format(URL))

tabs = driver.window_handles

def sync_loop():
    last_text = ""
    last_click = False
    while True:
        global state
        # مزامنة النص
        if state["text"] != last_text:
            for tab in tabs[1:]:
                driver.switch_to.window(tab)
                try:
                    driver.execute_script("document.querySelector('input').value = arguments[0];", state["text"])
                except: pass
            last_text = state["text"]
        # مزامنة النقر
        if state["click"] and not last_click:
            for tab in tabs[1:]:
                driver.switch_to.window(tab)
                try:
                    driver.execute_script("document.querySelector('button').click();")
                except: pass
            last_click = True
            state["click"] = False
        time.sleep(0.1)
        last_click = state["click"]

threading.Thread(target=sync_loop, daemon=True).start()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/update", methods=["POST"])
def update():
    data = request.json
    state["text"] = data.get("text", state["text"])
    state["click"] = data.get("click", state["click"])
    return jsonify({"status":"ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
