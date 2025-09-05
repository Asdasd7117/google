from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # للسماح بالطلبات من أي تبويبة

# الحالة المشتركة بين التبويبات
state = {
    "text": "",
    "clicked": False
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/update", methods=["POST"])
def update():
    data = request.json
    state["text"] = data.get("text", state["text"])
    state["clicked"] = data.get("clicked", state["clicked"])
    return jsonify({"status": "ok"})

@app.route("/state", methods=["GET"])
def get_state():
    return jsonify(state)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
