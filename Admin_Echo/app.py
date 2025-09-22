from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_socketio import SocketIO, emit
import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("APP_SECRET_KEY", "dev-secret")
socketio = SocketIO(app, cors_allowed_origins="*")

# --- ESTADO DO SERVIDOR ---
router_user = None
connected_users = {}

# Define os caminhos dos bancos de dados
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CIFRAS_DB_PATH = os.path.join(BASE_DIR, "cifras.db")
USUARIOS_DB_PATH = os.path.join(BASE_DIR, "usuarios.db")

def get_cifras_conn():
    conn = sqlite3.connect(CIFRAS_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_usuarios_conn():
    conn = sqlite3.connect(USUARIOS_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_cifras_db():
    conn = get_cifras_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS cifras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL, banda TEXT NOT NULL, tom TEXT NOT NULL,
            letra TEXT NOT NULL, cifra TEXT NOT NULL, created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def init_user_db():
    conn = get_usuarios_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            senha TEXT NOT NULL,
            nivel TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ativo'
        )
    """)
    conn.commit()
    conn.close()

# ===================== ROTAS WEB (GERAIS) =====================
@app.route("/")
def home():
    return redirect(url_for("listar_cifras"))

@app.route("/cifras")
def listar_cifras():
    conn = get_cifras_conn()
    cur = conn.cursor()
    q = request.args.get("q", "").strip()
    if q:
        cur.execute("SELECT id, titulo, banda, tom, created_at FROM cifras WHERE titulo LIKE ? OR banda LIKE ? OR tom LIKE ? ORDER BY created_at DESC", (f"%{q}%", f"%{q}%", f"%{q}%"))
    else:
        cur.execute("SELECT id, titulo, banda, tom, created_at FROM cifras ORDER BY created_at DESC")
    musicas = cur.fetchall()
    conn.close()
    return render_template("index.html", musicas=musicas, q=q)

@app.route("/cifras/nova", methods=["GET", "POST"])
def criar_cifra():
    if request.method == "POST":
        data = { "titulo": request.form.get("titulo", "").strip(), "banda": request.form.get("banda", "").strip(), "tom": request.form.get("tom", "").strip(), "letra": request.form.get("letra", "").strip(), "cifra": request.form.get("cifra", "").strip() }
        if not all(data.values()):
            flash("Preencha todos os campos.", "danger")
            return render_template("create_edit.html", mode="create", values=data)
        conn = get_cifras_conn()
        cur = conn.cursor()
        cur.execute("INSERT INTO cifras (titulo, banda, tom, letra, cifra, created_at) VALUES (?, ?, ?, ?, ?, ?)", (data["titulo"], data["banda"], data["tom"], data["letra"], data["cifra"], datetime.now().isoformat(timespec="seconds")))
        conn.commit()
        conn.close()
        flash("Cifra cadastrada com sucesso!", "success")
        return redirect(url_for("listar_cifras"))
    return render_template("create_edit.html", mode="create", values={})

@app.route("/cifras/<int:cifra_id>")
def detalhar_cifra(cifra_id):
    conn = get_cifras_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cifras WHERE id = ?", (cifra_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        flash("Registro não encontrado.", "warning")
        return redirect(url_for("listar_cifras"))
    return render_template("detail.html", m=row)

@app.route("/cifras/<int:cifra_id>/editar", methods=["GET", "POST"])
def editar_cifra(cifra_id):
    conn = get_cifras_conn()
    cur = conn.cursor()
    if request.method == "POST":
        data = { "titulo": request.form.get("titulo", "").strip(), "banda": request.form.get("banda", "").strip(), "tom": request.form.get("tom", "").strip(), "letra": request.form.get("letra", "").strip(), "cifra": request.form.get("cifra", "").strip() }
        if not all(data.values()):
            flash("Preencha todos os campos.", "danger")
            data["id"] = cifra_id
            conn.close()
            return render_template("create_edit.html", mode="edit", values=data)
        cur.execute("UPDATE cifras SET titulo = ?, banda = ?, tom = ?, letra = ?, cifra = ? WHERE id = ?", (data["titulo"], data["banda"], data["tom"], data["letra"], data["cifra"], cifra_id))
        conn.commit()
        conn.close()
        flash("Cifra atualizada!", "success")
        return redirect(url_for("detalhar_cifra", cifra_id=cifra_id))
    cur.execute("SELECT * FROM cifras WHERE id = ?", (cifra_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        flash("Registro não encontrado.", "warning")
        return redirect(url_for("listar_cifras"))
    return render_template("create_edit.html", mode="edit", values=row)

@app.route("/cifras/<int:cifra_id>/excluir", methods=["POST"])
def excluir_cifra(cifra_id):
    conn = get_cifras_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM cifras WHERE id = ?", (cifra_id,))
    conn.commit()
    conn.close()
    flash("Cifra excluída.", "info")
    return redirect(url_for("listar_cifras"))

# ===================== ROTAS WEB (ADMIN) =====================
@app.route("/admin/usuarios")
def gerenciar_usuarios():
    conn = get_usuarios_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, nome, nivel, status FROM usuarios ORDER BY nome")
    usuarios = cur.fetchall()
    conn.close()
    return render_template("admin_usuarios.html", usuarios=usuarios)

@app.route("/admin/conectados")
def usuarios_conectados():
    return render_template("usuarios_conectados.html", users=connected_users)

@app.route("/usuarios/novo", methods=["POST"])
def criar_usuario():
    nome = request.form.get("nome", "").strip()
    senha = request.form.get("senha", "").strip()
    nivel = request.form.get("nivel", "").strip()
    if not nome or not senha or not nivel:
        flash("Preencha todos os campos para criar o usuário.", "danger")
        return redirect(url_for("gerenciar_usuarios"))
    senha_hash = generate_password_hash(senha)
    conn = get_usuarios_conn()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO usuarios (nome, senha, nivel) VALUES (?, ?, ?)", (nome, senha_hash, nivel))
        conn.commit()
        flash("Usuário criado com sucesso!", "success")
    except sqlite3.IntegrityError:
        flash("Nome de usuário já existe.", "danger")
    finally:
        conn.close()
    return redirect(url_for("gerenciar_usuarios"))

@app.route("/admin/usuarios/<int:user_id>/excluir", methods=["POST"])
def excluir_usuario(user_id):
    conn = get_usuarios_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM usuarios WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    flash("Usuário excluído com sucesso.", "success")
    return redirect(url_for("gerenciar_usuarios"))

@app.route("/admin/usuarios/<int:user_id>/status", methods=["POST"])
def alternar_status_usuario(user_id):
    conn = get_usuarios_conn()
    cur = conn.cursor()
    cur.execute("SELECT status FROM usuarios WHERE id = ?", (user_id,))
    user = cur.fetchone()
    if user:
        novo_status = "inativo" if user["status"] == "ativo" else "ativo"
        cur.execute("UPDATE usuarios SET status = ? WHERE id = ?", (novo_status, user_id))
        conn.commit()
        flash(f"Status do usuário alterado para {novo_status}.", "info")
    conn.close()
    return redirect(url_for("gerenciar_usuarios"))

# ===================== ROTAS API (JSON) - ADICIONADAS DE VOLTA =====================
@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    conn = get_usuarios_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM usuarios WHERE nome = ?", (username,))
    user = cur.fetchone()
    conn.close()
    if user and check_password_hash(user["senha"], password):
        if user["status"] == 'inativo':
            return jsonify({"status": "error", "message": "Usuário inativo. Contate o administrador."}), 403
        return jsonify({"status": "success", "message": "Login realizado com sucesso!", "nivel": user["nivel"]})
    else:
        return jsonify({"status": "error", "message": "Credenciais inválidas."}), 401

@app.route("/api/songs")
def api_songs():
    conn = get_cifras_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cifras ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    songs = [{key: row[key] for key in row.keys()} for row in rows]
    return jsonify(songs)

@app.route("/api/song/<int:cifra_id>")
def api_song(cifra_id):
    conn = get_cifras_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cifras WHERE id = ?", (cifra_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Registro não encontrado"}), 404
    song = {key: row[key] for key in row.keys()}
    return jsonify(song)

# ===================== EVENTOS SOCKET.IO (COM LOGS) =====================
def log_action(sid, action):
    if sid in connected_users:
        timestamp = datetime.now().strftime("%H:%M:%S")
        connected_users[sid]['logs'].append(f"[{timestamp}] {action}")

@socketio.on('connect')
def handle_connect():
    sid = request.sid
    print(f'Cliente conectado: {sid}')
    connected_users[sid] = {'user_info': 'Anônimo', 'logs': []}
    log_action(sid, "Usuário conectou ao servidor.")
    emit('router_claimed', {'router_user': router_user}, room=sid)

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    print(f'Cliente desconectado: {sid}')
    if sid in connected_users:
        del connected_users[sid]

@socketio.on('identify')
def handle_identify(data):
    sid = request.sid
    if sid in connected_users:
        username = data.get('username', 'desconhecido')
        connected_users[sid]['user_info'] = username
        log_action(sid, f"Identificado como: {username}")

@socketio.on('claim_router')
def handle_claim_router(data):
    global router_user
    sid = request.sid
    router_user = data.get('user', 'desconhecido')
    log_action(sid, f"Reivindicou o controle como Router.")
    print(f'Router reivindicado por: {router_user}')
    emit('router_claimed', {'router_user': router_user}, broadcast=True)

@socketio.on('release_router')
def handle_release_router(data):
    global router_user
    sid = request.sid
    log_action(sid, "Liberou o controle de Router.")
    print(f'Router liberado por: {router_user}')
    router_user = None
    emit('router_cleared', broadcast=True)

@socketio.on('open_song')
def handle_open_song(data):
    sid = request.sid
    song_id = data.get('song_id')
    user = data.get('user', 'desconhecido')
    log_action(sid, f"Abriu a música ID {song_id} para todos.")
    print(f'Router "{user}" abriu a música ID: {song_id}. Retransmitindo.')
    emit('open_song', {'song_id': song_id}, broadcast=True, include_self=False)

# ===================== MAIN =====================
if __name__ == "__main__":
    init_cifras_db()
    init_user_db()
    print("Servidor Echo iniciado. Aguardando conexões em http://0.0.0.0:5000")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

