from flask import Flask, render_template
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route("/")
def index():
    return render_template("index.html")

# استقبال حدث المزامنة من التبويبة الرئيسية
@socketio.on("sync_event")
def handle_sync(data):
    socketio.emit("update_tabs", data)

if __name__ == "__main__":
    # تجاوز مشكلة Werkzeug في Render
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)
