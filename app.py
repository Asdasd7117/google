from flask import Flask, render_template, request, Response
import requests

app = Flask(__name__)

# بروكسي قوي يتجاوز X-Frame-Options
@app.route("/proxy")
def proxy():
    url = request.args.get("url")
    if not url:
        return "❌ ضع رابط ?url=..."

    if not url.startswith("http"):
        url = "https://" + url

    try:
        resp = requests.get(
            url,
            timeout=10,
            headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        excluded = ["content-encoding", "transfer-encoding", "connection",
                    "x-frame-options", "content-security-policy"]
        headers = [(name, value) for name, value in resp.headers.items() if name.lower() not in excluded]

        return Response(resp.content, resp.status_code, headers)
    except Exception as e:
        return f"❌ خطأ: {str(e)}"

# الصفحة الرئيسية مع المربعات
@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
