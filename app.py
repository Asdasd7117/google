from flask import Flask, render_template, request
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def index():
    results = []
    query = ""
    if request.method == "POST":
        query = request.form.get("query", "").strip()
        if query:
            try:
                # إذا الرابط يبدأ بـ http أو https جلبه مباشرة
                if query.startswith("http://") or query.startswith("https://"):
                    url = query
                else:
                    # استخدم DuckDuckGo للبحث
                    url = f"https://duckduckgo.com/html/?q={query}"
                resp = requests.get(url, timeout=10, headers={"User-Agent":"Mozilla/5.0"})
                soup = BeautifulSoup(resp.text, "html.parser")
                # ضع المحتوى في مربع iframe
                results.append(url)
            except Exception as e:
                results.append(f"خطأ: {e}")
    return render_template("index.html", results=results, query=query)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
