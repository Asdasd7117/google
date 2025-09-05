from flask import Flask
app = Flask(__name__)

@app.route("/")
def home():
    return "Hello World"

if __name__ == "__main__":
    # بدّل هذا السطر:
    # app.run(host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
    
    # إلى هذا:
    app.run(host="0.0.0.0", port=5000, debug=True)
