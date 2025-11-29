#!/usr/bin/env python3
import subprocess
import os
import requests
from datetime import datetime
import customtkinter as ctk
from tkinter import messagebox, scrolledtext
import tkinter as tk

# ─────── НАСТРОЙКИ (поменяй только здесь) ───────
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "8443450642:AAGzmXXTJGlzOWS2oLWNwvEZ8rJTBcT0xjs")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "959125046")
PROJECT_NAME = os.path.basename(os.getcwd())
# ────────────────────────────────────────────────

def send_telegram(text):
    try:
        requests.get(f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                     params={"chat_id": TELEGRAM_CHAT_ID, "text": f"Проект «{PROJECT_NAME}»\n\n{text}"}, timeout=5)
    except:
        pass

def run(cmd, check=False):
    try:
        result = subprocess.run(cmd, shell=True, text=True, capture_output=True, timeout=30)
        if check and result.returncode != 0:
            raise Exception(f"Command failed: {result.stderr}")
        return result.stdout.strip()
    except Exception as e:
        return f"Error: {str(e)}"

def check_status():
    status = ""
    branch = run("git branch --show-current")
    status += f"✓ Ветка: {branch}\n"
    
    changes = run("git status --porcelain")
    if changes:
        status += f"⚠ Незакоммиченных: {len(changes.splitlines())} файлов\n"
    else:
        status += "✓ Нет незакоммиченных изменений\n"
    
    not_pushed = run("git log origin/dev..dev --oneline 2>&1")
    if not_pushed and "Error" not in not_pushed:
        status += f"📤 Не запушено в GitHub: {len(not_pushed.splitlines())} коммитов\n"
    else:
        status += "✓ Всё запушено в GitHub\n"
    
    try:
        last = run('git log production/main -1 --format="%cd" --date=short 2>&1')
        if last and "Error" not in last:
            days = (datetime.now() - datetime.strptime(last.strip('"'), "%Y-%m-%d")).days
            status += f"🚀 Последний деплой: {days} дней назад"
        else:
            status += "🚀 Деплоя ещё не было"
    except:
        status += "🚀 Деплоя ещё не было"
    
    return status

def safe_commit_and_push():
    # Показываем что будет закоммичено
    changes = run("git status --short")
    if not changes or changes.startswith("Error"):
        messagebox.showinfo("Информация", "Нет изменений для коммита")
        return
    
    # Диалог с показом изменений
    dialog = ctk.CTkToplevel(app)
    dialog.title("Подтвердите коммит")
    dialog.geometry("600x400")
    
    ctk.CTkLabel(dialog, text="Будут закоммичены следующие файлы:", font=("Arial", 14, "bold")).pack(pady=10)
    
    text_box = scrolledtext.ScrolledText(dialog, width=70, height=15, font=("Consolas", 10))
    text_box.pack(pady=10, padx=20)
    text_box.insert("1.0", changes)
    text_box.config(state="disabled")
    
    def do_commit():
        send_telegram("💾 Начинаю сохранение изменений...")
        run("git add .")
        commit_msg = f"feat: автосохранение {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        result = run(f'git commit -m "{commit_msg}"')
        
        if "Error" not in result:
            run("git push origin dev")
            send_telegram("✅ Изменения сохранены и отправлены в GitHub!")
            messagebox.showinfo("Готово", "Коммит и пуш выполнены успешно!")
        else:
            messagebox.showerror("Ошибка", f"Ошибка коммита:\n{result}")
        dialog.destroy()
    
    btn_frame = ctk.CTkFrame(dialog)
    btn_frame.pack(pady=10)
    
    ctk.CTkButton(btn_frame, text="✓ Да, закоммитить", command=do_commit, fg_color="green").pack(side="left", padx=5)
    ctk.CTkButton(btn_frame, text="✗ Отмена", command=dialog.destroy).pack(side="left", padx=5)

def full_deploy():
    # Проверка готовности
    branch = run("git branch --show-current")
    if branch != "dev":
        messagebox.showwarning("Внимание", f"Ты сейчас на ветке '{branch}'.\nПереключись на 'dev' перед деплоем.")
        return
    
    changes = run("git status --porcelain")
    if changes:
        messagebox.showwarning("Внимание", "Есть незакоммиченные изменения!\nСначала сохрани их через кнопку выше.")
        return
    
    if messagebox.askyesno("Деплой на сервер", "🚀 Выкатываем всё на БОЕВОЙ сервер?\n\nЭто обновит сайт photobooksgallery.am"):
        send_telegram("🚀 Запускаю деплой на боевой сервер...")
        
        # Merge dev → main
        run("git checkout main")
        merge_result = run("git merge dev")
        
        if "conflict" in merge_result.lower():
            messagebox.showerror("Ошибка", "Конфликт при merge!\nОбратись за помощью.")
            run("git checkout dev")
            return
        
        # Push to production
        push_result = run("git push production main", check=False)
        run("git checkout dev")  # Возврат на dev
        
        if "Error" not in push_result:
            send_telegram("✅ ДЕПЛОЙ ЗАВЕРШЁН!\nСайт обновлён")
            messagebox.showinfo("Готово", "Деплой прошёл успешно!\n\nПроверь сайт через 1-2 минуты")
        else:
            send_telegram(f"❌ Ошибка деплоя:\n{push_result}")
            messagebox.showerror("Ошибка", f"Деплой не удался:\n{push_result}")

def rollback_deploy():
    if messagebox.askyesno("Откат", "⚠️ Откатить сайт к предыдущей версии?\n\nЭто вернёт последний стабильный коммит."):
        send_telegram("⏪ Откатываю сайт к предыдущей версии...")
        
        # Получаем предыдущий коммит
        prev_commit = run("git log production/main~1 -1 --format=%H")
        
        if prev_commit and "Error" not in prev_commit:
            run("git checkout main")
            run(f"git reset --hard {prev_commit}")
            run("git push production main --force")
            run("git checkout dev")
            
            send_telegram("✅ Откат выполнен!\nСайт восстановлен")
            messagebox.showinfo("Готово", "Откат выполнен успешно!")
        else:
            messagebox.showerror("Ошибка", "Не удалось найти предыдущий коммит")

def quick_actions():
    send_telegram("📊 Статус проекта:\n" + check_status())

# ─────── Красивое окно ───────
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

app = ctk.CTk()
app.geometry("550x500")
app.title(f"🔧 Нянька проекта — {PROJECT_NAME}")

# Заголовок
header = ctk.CTkFrame(app, fg_color="transparent")
header.pack(pady=10, fill="x")
ctk.CTkLabel(header, text=f"📂 {PROJECT_NAME}", font=("Arial", 18, "bold")).pack()
ctk.CTkLabel(header, text="Система контроля версий и деплоя", font=("Arial", 11), text_color="gray").pack()

# Статус
status_frame = ctk.CTkFrame(app)
status_frame.pack(pady=10, padx=20, fill="both", expand=True)
ctk.CTkLabel(status_frame, text="📊 Текущий статус:", font=("Arial", 12, "bold")).pack(anchor="w", padx=10, pady=5)

status_label = ctk.CTkLabel(status_frame, text="Загрузка статуса…", justify="left", font=("Consolas", 10))
status_label.pack(pady=10, padx=15, fill="both", expand=True)

def update_status():
    status_label.configure(text=check_status())
    app.after(10000, update_status)

# Кнопки управления
buttons_frame = ctk.CTkFrame(app, fg_color="transparent")
buttons_frame.pack(pady=10, fill="x", padx=20)

ctk.CTkButton(buttons_frame, text="💾 Сохранить изменения (commit + push)", width=300, height=40,
              command=safe_commit_and_push, fg_color="#2563eb", hover_color="#1d4ed8").pack(pady=5)

ctk.CTkButton(buttons_frame, text="🚀 ДЕПЛОЙ НА БОЕВОЙ СЕРВЕР", width=300, height=50, 
              fg_color="#16a34a", hover_color="#15803d", font=("Arial", 14, "bold"), 
              command=full_deploy).pack(pady=8)

ctk.CTkButton(buttons_frame, text="⏪ Откатить к предыдущей версии", width=300, height=35,
              command=rollback_deploy, fg_color="#dc2626", hover_color="#b91c1c").pack(pady=5)

ctk.CTkButton(buttons_frame, text="📱 Отправить статус в Telegram", width=300,
              command=quick_actions, fg_color="#6b7280", hover_color="#4b5563").pack(pady=5)

# Footer
footer = ctk.CTkLabel(app, text="Автоматическое обновление каждые 10 секунд", 
                       font=("Arial", 9), text_color="gray")
footer.pack(pady=5)

send_telegram("🤖 Нянька запущена и следит за проектом")
update_status()
app.mainloop()