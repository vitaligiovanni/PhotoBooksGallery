# CRM Товары - Исправления проблем продакшена

## 🎯 Обнаруженные проблемы

### Проблема 1: Пустой dropdown категорий
- **Симптом:** В выпадающем списке категорий ничего не видно
- **Причина:** Неправильная обработка структуры `category.name` объекта
- **Файл:** `client/src/components/admin/managers/ProductsManager.tsx`
- **Строка:** 412

### Проблема 2: Принудительное окно видео
- **Симптом:** При нажатии "Create product" активируется окно для вставки ссылки на видео
- **Причина:** Конфликт между `videoUrl` полем и загрузчиком видео
- **Файл:** `client/src/components/admin/managers/ProductsManager.tsx`
- **Строки:** 614-660

### Проблема 3: Товары не создаются
- **Симптом:** Форма отправляется, но товар не сохраняется в БД
- **Причина:** Ошибки валидации и проблемы с обязательными полями
- **Файл:** `server/routers/ecommerce-router.ts`
- **Строки:** 92-132

### Проблема 4: Проблемы с загрузкой файлов
- **Симптом:** Медиа файлы не загружаются корректно
- **Причина:** Неправильная конфигурация путей на продакшене
- **Файл:** `client/src/components/ObjectUploader.tsx`

## 🔧 Исправления

### Исправление 1: Робастный dropdown категорий
```tsx
// Добавить fallback для категорий и лучшую обработку ошибок
{categories && categories.length > 0 ? (
  categories.map((category) => {
    const categoryName = category.name 
      ? (typeof category.name === 'object' ? category.name.ru : category.name)
      : category.slug || category.id;
    
    return (
      <SelectItem key={category.id} value={category.id}>
        {categoryName}
      </SelectItem>
    );
  })
) : (
  <SelectItem value="no-categories" disabled>
    Категории не загружены
  </SelectItem>
)}
```

### Исправление 2: Разделение логики видео
```tsx
// Сделать поле videoUrl опциональным и не конфликтующим
<FormField
  control={productForm.control}
  name="videoUrl"
  render={({ field }) => (
    <FormItem>
      <FormLabel>URL основного видео (опционально)</FormLabel>
      <FormControl>
        <Input {...field} placeholder="https://example.com/video.mp4" />
      </FormControl>
      <FormDescription>
        Или используйте загрузчик файлов ниже
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Исправление 3: Улучшенная валидация товаров
```typescript
// Добавить более детальную валидацию и логирование ошибок
router.post('/products', mockAuth, requireAdmin, async (req: any, res) => {
  try {
    console.log('Creating product with data:', JSON.stringify(req.body, null, 2));
    
    const productData = insertProductSchema.parse(req.body);
    
    // Проверка обязательных полей
    if (!productData.categoryId || productData.categoryId === "") {
      return res.status(400).json({ 
        message: "Выберите категорию для товара",
        field: "categoryId" 
      });
    }
    
    // Проверка существования категории
    const categories = await storage.getCategories();
    const categoryExists = categories.find(c => c.id === productData.categoryId);
    if (!categoryExists) {
      return res.status(400).json({ 
        message: "Выбранная категория не существует",
        field: "categoryId" 
      });
    }
    
    const product = await storage.createProduct(productData);
    console.log('Product created successfully:', product.id);
    res.status(201).json(product);
  } catch (error) {
    console.error("Detailed error creating product:", error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Ошибка валидации данных",
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: "Failed to create product" });
  }
});
```

### Исправление 4: Надежная загрузка файлов
```tsx
// Добавить fallback для загрузки и лучшую обработку ошибок
const handleUpload = async (files: FileList) => {
  if (!files.length) return;

  const fileArray = Array.from(files).slice(0, maxNumberOfFiles);
  
  // Проверка поддержки uploading API
  try {
    const testResponse = await fetch('/api/local-upload', {
      method: 'HEAD'
    });
    
    if (!testResponse.ok) {
      throw new Error('Upload API недоступен');
    }
  } catch (error) {
    console.error('Upload API недоступен, используем fallback');
    alert('Загрузка файлов временно недоступна. Используйте поле URL.');
    return;
  }
  
  // Остальная логика загрузки...
};
```

## 📁 Файлы для обновления

1. `client/src/components/admin/managers/ProductsManager.tsx` - основные исправления UI
2. `server/routers/ecommerce-router.ts` - исправления API валидации  
3. `client/src/components/ObjectUploader.tsx` - исправления загрузки файлов
4. `server/routers/middleware.ts` - улучшение авторизации (опционально)

## 🚀 Стратегия деплоя

1. **Безопасность:** Сначала создать бэкап БД
2. **Поэтапность:** Обновить только проблемные файлы
3. **Тестирование:** Проверить каждую функцию после деплоя
4. **Откат:** При проблемах - быстрый rollback к предыдущей версии