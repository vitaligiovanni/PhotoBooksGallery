#!/usr/bin/env python3
import subprocess
import os
import requests
from datetime import datetime
import customtkinter as ctk
from tkinter import messagebox, scrolledtext
import tkinter as tk
from tkinter import ttk

# ─────── НАСТРОЙКИ (переменные только из окружения) ───────
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
PROJECT_NAME = os.path.basename(os.getcwd())
# Если токенов нет — уведомим и отключим отправку
if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
    print("[SECURITY] Telegram секреты не заданы. Создайте .env и перезапустите. Сообщения отправляться не будут.")
# ───────────────────────────────────────────────────────────

def send_telegram(text):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return  # защита: не отправляем если секреты отсутствуют
    try:
        requests.get(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            params={"chat_id": TELEGRAM_CHAT_ID, "text": f"Проект «{PROJECT_NAME}»\n\n{text}"},
            timeout=5
        )
    except Exception:
        pass

def run(cmd, check=False, timeout=30):
    try:
        result = subprocess.run(cmd, shell=True, text=True, capture_output=True, timeout=timeout)
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
        # Модальное окно прогресса
        progress_dialog = ctk.CTkToplevel(app)
        progress_dialog.title("🚀 Деплой — прогресс")
        progress_dialog.geometry("600x360")
        progress_dialog.grab_set()

        ctk.CTkLabel(progress_dialog, text="Деплой на боевой сервер", font=("Arial", 16, "bold")).pack(pady=8)
        step_label = ctk.CTkLabel(progress_dialog, text="Подготовка…", font=("Arial", 12))
        step_label.pack(pady=4)

        # Индикатор прогресса: полоска + процент
        bar_frame = ctk.CTkFrame(progress_dialog)
        bar_frame.pack(pady=6, padx=16, fill="x")
        progress_bar = ttk.Progressbar(bar_frame, mode="determinate")
        progress_bar.pack(fill="x", padx=6, pady=6)
        percent_label = ctk.CTkLabel(bar_frame, text="0%", font=("Arial", 11))
        percent_label.pack()

        # Лог операций
        log_box = scrolledtext.ScrolledText(progress_dialog, width=70, height=12, font=("Consolas", 10))
        log_box.pack(padx=16, pady=8, fill="both", expand=True)

        def set_progress(p, text=None):
            value = max(0, min(100, int(p)))
            progress_bar['value'] = value
            percent_label.configure(text=f"{value}%")
            if text:
                step_label.configure(text=text)
            progress_dialog.update_idletasks()

        def log(msg):
            ts = datetime.now().strftime('%H:%M:%S')
            log_box.insert('end', f"[{ts}] {msg}\n")
            log_box.see('end')

        # Ход деплоя
        try:
            send_telegram("🚀 Запускаю деплой на боевой сервер…")
            set_progress(5, "Переключаюсь на ветку main…")
            log("git checkout main")
            run("git checkout main")

            set_progress(20, "Обновляю main из dev (merge)…")
            log("git merge dev")
            merge_result = run("git merge dev")
            if "conflict" in merge_result.lower():
                log("❌ Конфликт при merge")
                messagebox.showerror("Ошибка", "Конфликт при merge!\nНужна ручная помощь.")
                run("git checkout dev")
                progress_dialog.destroy()
                return

            set_progress(40, "Отправляю в production…")
            log("git push production main")
            push_result = run("git push production main", check=False, timeout=600)
            if push_result.startswith("Error"):
                log("❌ Ошибка push: " + push_result)
                send_telegram(f"❌ Ошибка деплоя: {push_result}")
                messagebox.showerror("Ошибка", f"Деплой не удался:\n{push_result}")
                run("git checkout dev")
                progress_dialog.destroy()
                return

            set_progress(80, "Возвращаюсь на dev…")
            log("git checkout dev")
            run("git checkout dev")

            set_progress(100, "Готово! Деплой завершён")
            log("✅ Деплой завершён успешно")
            send_telegram("✅ ДЕПЛОЙ ЗАВЕРШЁН! Сайт обновлён")
            messagebox.showinfo("Готово", "Деплой прошёл успешно!\nПроверь сайт через 1–2 минуты")
        finally:
            # Закрыть окно прогресса после завершения/ошибки
            try:
                progress_dialog.destroy()
            except:
                pass

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