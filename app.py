from flask import Flask, request, render_template, jsonify
import requests
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# قائمة النوافذ الحالية، كل نافذة تحتوي على رابط أو كلمة بحث
windows = []

# الصفحة الرئيسية تعرض كل النوافذ
@app.route('/')
def index():
    return render_template('index.html', windows=windows)

# إضافة نافذة جديدة (رابط أو كلمة بحث)
@app.route('/add_window', methods=['POST'])
def add_window():
    data = request.json
    query = data.get('query', '').strip()
    if query:
        windows.append(query)
    return jsonify({"status": "success", "windows_count": len(windows)})

# حذف نافذة
@app.route('/remove_window', methods=['POST'])
def remove_window():
    data = request.json
    idx = data.get('index')
    if idx is not None and 0 <= idx < len(windows):
        windows.pop(idx)
    return jsonify({"status": "success", "windows_count": len(windows)})

# البروكسي لجلب أي رابط خارجي
@app.route('/proxy')
def proxy():
    target_url = request.args.get('url')
    if not target_url:
        return "رابط غير صالح", 400
    try:
        resp = requests.get(target_url)
        return resp.text
    except Exception as e:
        return f"خطأ: {e}", 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
