# app.py
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

sync_enabled = False  # التحكم بالمزامنة

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('toggle_sync')
def toggle_sync():
    global sync_enabled
    sync_enabled = not sync_enabled
    emit('sync_status', {'enabled': sync_enabled}, broadcast=True)

@socketio.on('action')
def handle_action(data):
    if sync_enabled:
        emit('action', data, broadcast=True, include_self=False)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
