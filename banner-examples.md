# Примеры создания разных типов баннеров

## 1. Верхний баннер (Header Banner)
```json
{
  "name": "Летняя скидка",
  "type": "header",
  "title": {"ru": "Летняя скидка 30%", "en": "Summer Sale 30%"},
  "content": {"ru": "На все фотокниги до конца августа", "en": "On all photobooks until end of August"},
  "buttonText": {"ru": "Выбрать книгу", "en": "Choose Book"},
  "buttonLink": "/products",
  "backgroundColor": "#ff6b6b",
  "textColor": "#ffffff",
  "isActive": true,
  "startDate": "2025-09-19T00:00:00Z",
  "endDate": "2025-09-30T23:59:59Z",
  "targetPages": ["/", "/products"],
  "priority": 10
}
```

## 2. Полноэкранный баннер (Fullscreen Banner)
```json
{
  "name": "Welcome Banner",
  "type": "fullscreen",
  "title": {"ru": "Добро пожаловать в PhotoBooksGallery!", "en": "Welcome to PhotoBooksGallery!"},
  "content": {"ru": "Создайте уникальную фотокнигу своей мечты", "en": "Create your dream photobook"},
  "imageUrl": "/images/welcome-banner.jpg",
  "buttonText": {"ru": "Начать создание", "en": "Start Creating"},
  "buttonLink": "/constructor",
  "backgroundColor": "#ffffff",
  "textColor": "#333333",
  "isActive": true,
  "showDelay": 3000,
  "maxImpressions": 3,
  "targetPages": ["/"],
  "priority": 100
}
```

## 3. Боковой баннер (Sidebar Banner)
```json
{
  "name": "Бесплатная доставка",
  "type": "sidebar",
  "position": "right",
  "title": {"ru": "Бесплатная доставка", "en": "Free Shipping"},
  "content": {"ru": "При заказе от 5000 руб", "en": "On orders over $50"},
  "buttonText": {"ru": "Подробнее", "en": "Learn More"},
  "buttonLink": "/shipping",
  "backgroundColor": "#4ecdc4",
  "textColor": "#ffffff",
  "isActive": true,
  "targetPages": ["/products", "/cart"],
  "priority": 5
}
```

## 4. Встроенный баннер (Inline Banner)
```json
{
  "name": "Рекомендация товара",
  "type": "inline",
  "title": {"ru": "Популярный выбор", "en": "Popular Choice"},
  "content": {"ru": "Более 1000 клиентов выбрали этот формат", "en": "Over 1000 customers chose this format"},
  "imageUrl": "/images/popular-format.jpg",
  "buttonText": {"ru": "Выбрать", "en": "Select"},
  "buttonLink": "/products/album-20x15",
  "backgroundColor": "#ffeaa7",
  "textColor": "#333333",
  "isActive": true,
  "targetPages": ["/products"],
  "priority": 1
}
```

## Настройки таргетинга

### По страницам:
```json
"targetPages": ["/", "/products", "/products/*"]
```

### По пользователям:
```json
"targetUsers": "all" | "logged_in" | "guests" | "premium"
```

### Ограничения показов:
```json
"maxImpressions": 1000,    // Максимум показов
"maxClicks": 100,          // Максимум кликов
"showFrequency": "once_per_session" | "once_per_day" | "always"
```

### Временные рамки:
```json
"startDate": "2025-09-19T00:00:00Z",
"endDate": "2025-09-30T23:59:59Z"
```