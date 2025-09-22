# Echo App Server
import os
import subprocess
import sys
import tkinter as tk
from tkinter import ttk, messagebox

# ========= CONFIGURAÇÃO: AJUSTE AQUI =========
PATH_FLASK = r'D:\\Desenvolvimento\\Projeto_Echo\\Admin_Echo\\servidor.py'
EXPO_DIR   = r'D:\\Desenvolvimento\\Projeto_Echo\\Echo_app'  # pasta onde tem o package.json (npm start)
PYTHON_EXE = sys.executable  # usa o mesmo Python que executa este script
# ============================================

IS_WINDOWS = os.name == "nt"

if IS_WINDOWS:
    CREATE_NEW_PROCESS_GROUP = 0x00000200
else:
    CREATE_NEW_PROCESS_GROUP = 0

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Echo - Gerenciador de Servidores")
        self.geometry("920x300")
        self.minsize(820, 280)

        # Paleta suave
        self.bg = "#0f172a"      # azul bem escuro
        self.card_bg = "#111827" # card
        self.text = "#e5e7eb"    # cinza claro
        self.accent = "#1f6feb"  # azul
        self.ok = "#16a34a"      # verde
        self.err = "#dc2626"     # vermelho
        self.dim = "#9ca3af"     # cinza

        self.configure(bg=self.bg)
        self._style()

        # Processos
        self.proc_flask = None
        self.proc_expo = None

        # UI
        self._build_ui()

        # Loop de status
        self.after(500, self._update_status_loop)

        # Fechar app encerra tudo
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def _style(self):
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TFrame", background=self.bg)
        style.configure("Card.TFrame", background=self.card_bg, borderwidth=0)
        style.configure("Title.TLabel", background=self.bg, foreground=self.text, font=("Segoe UI", 18, "bold"))
        style.configure("Sub.TLabel", background=self.card_bg, foreground=self.dim, font=("Segoe UI", 10))
        style.configure("Big.TLabel", background=self.card_bg, foreground=self.text, font=("Segoe UI", 12, "bold"))
        style.configure("Status.TLabel", background=self.card_bg, foreground=self.text, font=("Segoe UI", 11, "bold"))
        style.configure("TButton", font=("Segoe UI", 11, "bold"), padding=10)

    def _build_ui(self):
        header = ttk.Frame(self)
        header.pack(fill="x", padx=20, pady=(18, 10))
        ttk.Label(header, text="Painel de Servidores (Ambiente em teste)", style="Title.TLabel").pack(side="left")

        grid = ttk.Frame(self)
        grid.pack(fill="both", expand=True, padx=20, pady=10)

        grid.columnconfigure(0, weight=1, uniform="card")
        grid.columnconfigure(1, weight=1, uniform="card")
        grid.columnconfigure(2, weight=1, uniform="card")

        # Card Flask
        self.card_flask = self._make_card(
            grid,
            title="Servidor de Aplicação (Windows)",
            subtitle=os.path.normpath("Inicia o ambiente no Windows com a lista de músicas e acesso ao Servidor de Armazenamento dos Dados."),
            btn_text="▶️  Iniciar Servidor Windows",
            btn_cmd=self.start_flask,
            col=0
        )
        # Status label específico do card flask
        self.lbl_status_flask = self.card_flask["status_label"]

        # Card Expo
        self.card_expo = self._make_card(
            grid,
            title="Servidor de aplicação Android",
            subtitle=f"{os.path.normpath("Necessário escanear o QR Code do prompt que será aberto. Aplicação ainda em fase de testes.")}",
            btn_text="▶️  Iniciar Ambiente Android",
            btn_cmd=self.start_expo,
            col=1
        )
        self.lbl_status_expo = self.card_expo["status_label"]

        # Card Encerrar
        self.card_kill = self._make_card(
            grid,
            title="Encerrar tudo",
            subtitle="Finaliza todos os servidores",
            btn_text="🛑  Encerrar Servidores",
            btn_cmd=self.stop_all,
            col=2,
            show_status=False
        )

        # Rodapé
        footer = ttk.Frame(self)
        footer.pack(fill="x", padx=20, pady=(6, 16))
        ttk.Label(
            footer,
            text="Dica: inicie cada serviço separadamente. O status atualiza sozinho.",
            style="Title.TLabel",
            font=("Segoe UI", 10)
        ).pack(side="left")

    def _make_card(self, parent, title, subtitle, btn_text, btn_cmd, col, show_status=True):
        outer = ttk.Frame(parent, style="TFrame")
        outer.grid(row=0, column=col, sticky="nsew", padx=8, pady=8)

        # “Card” com cantos suaves (simulados com padding)
        card = ttk.Frame(outer, style="Card.TFrame")
        card.pack(fill="both", expand=True)
        # Borda visual com um frame interno
        container = tk.Frame(card, bg=self.card_bg, bd=0, highlightthickness=0)
        container.pack(fill="both", expand=True, padx=14, pady=14)

        # Título e subtítulo
        ttk.Label(container, text=title, style="Big.TLabel").pack(anchor="w", pady=(0, 2))
        ttk.Label(container, text=subtitle, style="Sub.TLabel", wraplength=260, justify="left").pack(anchor="w", pady=(0, 12))

        # Status + Botão
        status_label = None
        if show_status:
            status_label = tk.Label(
                container,
                text="🔴 OFFLINE",
                bg=self.card_bg,
                fg=self.err,
                font=("Segoe UI", 11, "bold")
            )
            status_label.pack(anchor="w", pady=(0, 10))

        btn = ttk.Button(container, text=btn_text, command=btn_cmd)
        btn.pack(anchor="w")

        return {
            "frame": outer,
            "status_label": status_label,
            "button": btn
        }

    # ---------- Controle de processos ----------
    def start_flask(self):
        if self._is_running(self.proc_flask):
            messagebox.showinfo("Servidor", "O servidor Flask já está em execução.")
            return
        if not os.path.isfile(PATH_FLASK):
            messagebox.showerror("Caminho inválido", f"Arquivo não encontrado:\n{PATH_FLASK}")
            return
        try:
            self.proc_flask = subprocess.Popen(
                [PYTHON_EXE, PATH_FLASK],
                cwd=os.path.dirname(PATH_FLASK) or None,
                creationflags=CREATE_NEW_PROCESS_GROUP,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        except Exception as e:
            messagebox.showerror("Erro", f"Falha ao iniciar Flask:\n{e}")

    def start_expo(self):
        if self._is_running(self.proc_expo):
            messagebox.showinfo("Expo", "O Expo já está em execução.")
            return
        if not os.path.isdir(EXPO_DIR):
            messagebox.showerror("Caminho inválido", f"Pasta não encontrada:\n{EXPO_DIR}")
            return
        # "npm start" precisa do shell
        try:
            if IS_WINDOWS:
                self.proc_expo = subprocess.Popen(
                    "npm start",
                    cwd=EXPO_DIR,
                    shell=True,
                    creationflags=CREATE_NEW_PROCESS_GROUP
                )
            else:
                self.proc_expo = subprocess.Popen(
                    ["bash", "-lc", "npm start"],
                    cwd=EXPO_DIR,
                    creationflags=CREATE_NEW_PROCESS_GROUP
                )
        except Exception as e:
            messagebox.showerror("Erro", f"Falha ao iniciar Expo:\n{e}")

    def stop_all(self):
        errors = []

        def kill_proc(p, name):
            if not self._is_running(p):
                return
            try:
                if IS_WINDOWS:
                    # Mata árvore de processos
                    subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True)
                else:
                    p.terminate()
            except Exception as e:
                errors.append(f"{name}: {e}")

        kill_proc(self.proc_expo, "Expo")
        kill_proc(self.proc_flask, "Flask")
        self.proc_expo = None
        self.proc_flask = None

        if errors:
            messagebox.showwarning("Aviso", "Alguns processos podem não ter sido encerrados:\n" + "\n".join(errors))

    def _is_running(self, proc):
        return proc is not None and proc.poll() is None

    def _update_status_loop(self):
        # Atualiza status Flask
        if self.lbl_status_flask is not None:
            if self._is_running(self.proc_flask):
                self._set_status(self.lbl_status_flask, online=True)
            else:
                self._set_status(self.lbl_status_flask, online=False)

        # Atualiza status Expo
        if self.lbl_status_expo is not None:
            if self._is_running(self.proc_expo):
                self._set_status(self.lbl_status_expo, online=True)
            else:
                self._set_status(self.lbl_status_expo, online=False)

        self.after(500, self._update_status_loop)

    def _set_status(self, label: tk.Label, online: bool):
        if online:
            label.config(text="🟢 ONLINE", fg=self.ok, bg=self.card_bg)
        else:
            label.config(text="🔴 OFFLINE", fg=self.err, bg=self.card_bg)

    def on_close(self):
        if messagebox.askyesno("Sair", "O ambiente será encerrado e não será possível mais acessar o App e no Windows. Deseja continuar?"):
            try:
                self.stop_all()
            finally:
                self.destroy()


if __name__ == "__main__":
    app = App()
    app.mainloop()
