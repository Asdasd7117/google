# app.py
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    # ضع الرابط هنا الذي تريد فتحه في كل iframe
    url = "https://www.google.com"
    return render_template("index.html", url=url)

# استقبال النصوص من التبويب الأول وبثها للبقية
@socketio.on('text_update')
def handle_text(data):
    emit('update_text', data, broadcast=True)

# استقبال ضغط الزر من التبويب الأول وبثه للبقية
@socketio.on('button_click')
def handle_button(data):
    emit('sync_button', data, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
