# 🚀 Быстрый старт: Система баннеров PhotoBooksGallery

## 1. Добавление баннеров в приложение

### Простая интеграция (рекомендуется)
```tsx
// В вашем главном компоненте App.tsx или layout
import { BannerManager } from '@/components/banners';
import { useBanners } from '@/hooks/useBanners';

function App() {
  const { banners, trackImpression, trackClick } = useBanners();

  return (
    <>
      <BannerManager
        banners={banners}
        onBannerClick={(banner) => {
          trackClick(banner);
          // Дополнительная логика
        }}
        onBannerClose={(banner) => {
          console.log('Banner closed:', banner.name);
        }}
        onBannerImpression={trackImpression}
      />
      {/* Ваш основной контент */}
    </>
  );
}
```

### Расширенная интеграция
```tsx
// С таргетингом по страницам
const { banners } = useBanners('/products'); // Только баннеры для страницы товаров
```

## 2. Создание баннеров через API

### Верхний баннер со скидкой
```bash
curl -X POST http://localhost:5000/api/banners \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Летняя скидка",
    "type": "header",
    "title": {"ru": "Скидка 30% на все!"},
    "content": {"ru": "До конца августа"},
    "buttonText": {"ru": "Купить"},
    "buttonLink": "/products",
    "backgroundColor": "#ff6b6b",
    "textColor": "#ffffff",
    "isActive": true,
    "startDate": "2025-09-19T00:00:00Z",
    "endDate": "2025-09-30T23:59:59Z",
    "targetPages": ["/", "/products"],
    "priority": 10
  }'
```

### Полноэкранный welcome баннер
```bash
curl -X POST http://localhost:5000/api/banners \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Banner",
    "type": "fullscreen",
    "title": {"ru": "Добро пожаловать!"},
    "content": {"ru": "Создайте свою фотокнигу"},
    "imageUrl": "/images/welcome.jpg",
    "buttonText": {"ru": "Начать"},
    "buttonLink": "/constructor",
    "isActive": true,
    "showDelay": 2000,
    "maxImpressions": 1,
    "targetPages": ["/"]
  }'
```

## 3. Управление баннерами

### Просмотр всех баннеров
```bash
curl http://localhost:5000/api/banners
```

### Активация/деактивация
```bash
curl -X PATCH http://localhost:5000/api/banners/{id}/toggle
```

### Просмотр статистики
```bash
curl http://localhost:5000/api/banners/{id}/stats
```

## 4. Типы баннеров

| Тип | Описание | Использование |
|-----|----------|---------------|
| `header` | Верхний sticky баннер | Навигационная панель |
| `fullscreen` | Полноэкранный оверлей | Welcome экраны, акции |
| `sidebar` | Боковой баннер | Рекомендации, доп. контент |
| `inline` | Встроенный баннер | Между контентом |

## 5. Аналитика и метрики

- **Показы (Impressions)**: сколько раз баннер был отображен
- **Клики (Clicks)**: количество кликов по баннеру
- **CTR (Click-Through Rate)**: процент кликов от показов
- **Конверсия**: процент достигнутых целей

## 6. Лучшие практики

### Производительность
- Используйте `maxImpressions` для ограничения нагрузки
- Настройте `showFrequency` для предотвращения спама

### UX/UI
- Не переусердствуйте с количеством баннеров
- Используйте контрастные цвета
- Добавляйте возможность закрытия

### Аналитика
- Отслеживайте CTR выше 1-2%
- Тестируйте разные позиции и тексты
- Анализируйте конверсию по целям

## 7. Отладка

### Проверка работы
```bash
# Посмотреть активные баннеры для страницы
curl "http://localhost:5000/api/banners/active?page=/products"

# Проверить логи сервера
tail -f server.log
```

### Возможные проблемы
- Баннеры не показываются → проверить `isActive` и даты
- Низкий CTR → проверить таргетинг и дизайн
- Конфликты → проверить `priority` и `targetPages`

---

🎯 **Готово к использованию!** Система автоматически управляет показом, аналитикой и таргетингом баннеров.