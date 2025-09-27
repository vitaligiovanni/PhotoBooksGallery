# Создание GitHub репозитория - Инструкция

## Шаг 1: Создайте GitHub репозиторий

1. Откройте https://github.com/new в браузере
2. Заполните форму:
   - **Repository name**: `photobooksgallery`
   - **Description**: `PhotoBooks Gallery - система создания фотокниг и фото-сувениров`
   - **Visibility**: 🔒 **Private** (рекомендуется для коммерческого проекта)
   - **Initialize**: НЕ ставьте галочки (репозиторий уже готов локально)
3. Нажмите **"Create repository"**

## Шаг 2: Скопируйте URL репозитория

GitHub покажет страницу с инструкциями. Скопируйте HTTPS URL, например:
```
https://github.com/ваш-username/photobooksgallery.git
```

## Шаг 3: Выполните команды ниже

Замените `ваш-username` на ваш реальный username GitHub:

```powershell
# Добавляем удалённый репозиторий
git remote add origin https://github.com/ваш-username/photobooksgallery.git

# Отправляем код на GitHub
git push -u origin main
```

## Шаг 4: После успешного push

Выполните тестовый деплой:
```powershell
./scripts/git-deploy.ps1 -Message "Первый тестовый деплой через Git"
```

---

**Готово!** После выполнения этих шагов у вас будет настроен полный Git-деплой.