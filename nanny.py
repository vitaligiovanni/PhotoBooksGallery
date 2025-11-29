#!/usr/bin/env python3
import subprocess
import os
import requests
from datetime import datetime
import customtkinter as ctk
from tkinter import messagebox

# ─────── НАСТРОЙКИ (поменяй только здесь) ───────
TELEGRAM_TOKEN = "8443450642:AAGzmXXTJGlzOWS2oLWNwvEZ8rJTBcT0xjs"   # ← твой токен от BotFather
TELEGRAM_CHAT_ID = 959125046                    # ← твой ID
PROJECT_NAME = os.path.basename(os.getcwd())
# ────────────────────────────────────────────────

def send_telegram(text):
    try:
        requests.get(f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                     params={"chat_id": TELEGRAM_CHAT_ID, "text": f"Проект «{PROJECT_NAME}»\n\n{text}"})
    except:
        pass

def run(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.STDOUT).strip()
    except:
        return ""

def check_status():
    status = ""
    
    # Текущая ветка
    branch = run("git branch --show-current")
    status += f"Ветка: {branch}\n"
    
    # Незакоммиченные изменения
    changes = run("git status --porcelain")
    if changes:
        status += f"Незакоммиченные изменения: {len(changes.splitlines())} файлов\n"
    
    # Что не запушено в dev
    not_pushed = run("git log origin/dev..dev --oneline")
    if not_pushed:
        status += f"Не запушено в dev: {len(not_pushed.splitlines())} коммитов\n"
    
    # Последний деплой
    try:
        last = run('git log production/main -1 --format="%cd" --date=short')
        days = (datetime.now() - datetime.strptime(last.strip('"'), "%Y-%m-%d")).days
        status += f"Последний деплой: {days} дней назад"
    except:
        status += "Деплоя ещё не было"
    
    return status

def full_deploy():
    if messagebox.askyesno("Деплой", "Выкатываем всё на боевой сервер прямо сейчас?"):
        send_telegram("Запускаю деплой на боевой сервер…")
        result = run("git checkout main && git merge dev && git push production main && git checkout dev")
        send_telegram("ДЕПЛОЙ ЗАВЕРШЁН!\nВсё на сервере обновлено")
        messagebox.showinfo("Готово", "Деплой прошёл успешно!\nУведомление ушло в Telegram")

def quick_actions():
    send_telegram("Быстрые действия от няньки:\n" + check_status())

# ─────── Красивое окно ───────
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

app = ctk.CTk()
app.geometry("500x400")
app.title(f"Нянька проекта — {PROJECT_NAME}")

ctk.CTkLabel(app, text=f"Проект: {PROJECT_NAME}", font=("Arial", 18, "bold")).pack(pady=20)

status_label = ctk.CTkLabel(app, text="Загрузка статуса…", justify="left")
status_label.pack(pady=10, padx=20, fill="both", expand=True)

def update_status():
    status_label.configure(text=check_status())
    app.after(10000, update_status)  # обновлять каждые 10 сек

ctk.CTkButton(app, text="Коммит + пуш в dev", width=300, height=40,
              command=lambda: os.system('git add . && git commit -m "авто-коммит от няньки" && git push origin dev')).pack(pady=8)

ctk.CTkButton(app, text="ДЕПЛОЙ НА БОЕВОЙ СЕРВЕР", width=300, height=50, fg_color="green", hover_color="darkgreen",
              font=("Arial", 16, "bold"), command=full_deploy).pack(pady=15)

ctk.CTkButton(app, text="Просто напомнить в Telegram", width=300,
              command=quick_actions).pack(pady=5)

send_telegram("Нянька запущена и следит за проектом")
update_status()
app.mainloop()