from flask import Flask, render_template, request, jsonify
from threading import Thread
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
import time

app = Flask(__name__)

driver = None
tabs = []
sync_active = False

def start_browser(url):
    global driver, tabs
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    driver = webdriver.Chrome(service=Service("/usr/local/bin/chromedriver"), options=options)
    driver.get(url)
    tabs = [driver.current_window_handle]
    # افتح 5 تبويبات إضافية (6 تبويبات إجمالاً)
    for _ in range(5):
        driver.execute_script("window.open('');")
        tabs.append(driver.window_handles[-1])
    # ضع الرابط في كل التبويبات
    for tab in tabs:
        driver.switch_to.window(tab)
        driver.get(url)

def sync_action(action_type, value=""):
    if not driver or not tabs:
        return
    driver.switch_to.window(tabs[0])
    if action_type == "write":
        # ضع النص في أول input إذا موجود
        driver.execute_script(f'''
            let input = document.querySelector('input');
            if(input) {{ input.value = "{value}"; }}
        ''')
    elif action_type == "click":
        driver.execute_script(f'''
            let btn = document.querySelector('button');
            if(btn) {{ btn.click(); }}
        ''')

    # انسخ نفس الإجراء لكل التبويبات الأخرى
    for tab in tabs[1:]:
        driver.switch_to.window(tab)
        if action_type == "write":
            driver.execute_script(f'''
                let input = document.querySelector('input');
                if(input) {{ input.value = "{value}"; }}
            ''')
        elif action_type == "click":
            driver.execute_script(f'''
                let btn = document.querySelector('button');
                if(btn) {{ btn.click(); }}
            ''')

@app.route("/", methods=["GET", "POST"])
def index():
    global sync_active
    if request.method == "POST":
        url = request.form.get("url")
        if url:
            # شغل المتصفح في Thread للخلفية
            Thread(target=start_browser, args=(url,), daemon=True).start()
        return render_template("index.html", message="تم فتح التبويبات!")
    return render_template("index.html", message="")

@app.route("/sync", methods=["POST"])
def sync():
    data = request.json
    action_type = data.get("type")
    value = data.get("value", "")
    sync_action(action_type, value)
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
