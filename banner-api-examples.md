# Примеры API запросов для управления баннерами

## Получение активных баннеров (для фронтенда)
GET /api/banners/active?page=/products

## Создание нового баннера (админка)
POST /api/banners
{
  "name": "Специальное предложение",
  "type": "header",
  "title": {"ru": "Скидка 20%", "en": "20% Discount"},
  "content": {"ru": "На все фотокниги", "en": "On all photobooks"},
  "buttonText": {"ru": "Купить", "en": "Buy"},
  "buttonLink": "/products",
  "backgroundColor": "#ff6b6b",
  "textColor": "#ffffff",
  "isActive": true,
  "startDate": "2025-09-19T00:00:00Z",
  "endDate": "2025-09-30T23:59:59Z",
  "targetPages": ["/", "/products"],
  "priority": 10
}

## Получение всех баннеров (админка)
GET /api/banners

## Обновление баннера
PUT /api/banners/{id}
{
  "isActive": false
}

## Удаление баннера
DELETE /api/banners/{id}

## Переключение статуса баннера
PATCH /api/banners/{id}/toggle

## Получение статистики баннера
GET /api/banners/{id}/stats