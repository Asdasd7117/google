from flask import Flask, request, render_template, Response
import requests

app = Flask(__name__)

# بروكسي لفتح الروابط
@app.route("/p")
def proxy():
    target_url = request.args.get("url")
    if not target_url:
        return "❌ لا يوجد رابط"

    try:
        resp = requests.get(target_url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        })
        excluded_headers = ["content-encoding", "transfer-encoding", "connection"]
        headers = [(name, value) for name, value in resp.headers.items() if name.lower() not in excluded_headers]
        return Response(resp.content, resp.status_code, headers)
    except Exception as e:
        return f"❌ خطأ أثناء الوصول: {str(e)}"

# الصفحة الرئيسية (مربعات البحث)
@app.route("/")
def home():
    return render_template("index.html")

# صفحة بحث ثانية
@app.route("/search")
def search():
    query = request.args.get("q", "")
    return render_template("search.html", query=query)

if __name__ == "__main__":
    app.run(debug=True)
