from flask import Flask, render_template, request, Response
from playwright.sync_api import sync_playwright

app = Flask(__name__)

@app.route("/proxy")
def proxy():
    url = request.args.get("url")
    if not url:
        return "❌ ضع رابط ?url=..."

    if not url.startswith("http"):
        url = "https://" + url

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(url, timeout=15000)
            content = page.content()
            browser.close()
            return Response(content, mimetype="text/html")
    except Exception as e:
        return f"❌ خطأ أثناء الوصول للرابط: {str(e)}"

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
