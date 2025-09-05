from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# لتخزين النصوص المشتركة بين التبويبات
shared_text = ""

# صفحة رئيسية
@app.route("/")
def index():
    return render_template("index.html", text=shared_text)

# استقبال النصوص الجديدة من أي مستخدم
@socketio.on('update_text')
def handle_update_text(data):
    global shared_text
    shared_text = data
    emit('sync_text', shared_text, broadcast=True)  # إرسال النص لجميع المتصلين

# استقبال أمر الزر لتشغيل/إيقاف المزامنة
@socketio.on('toggle_sync')
def handle_toggle_sync(data):
    emit('sync_status', data, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)
