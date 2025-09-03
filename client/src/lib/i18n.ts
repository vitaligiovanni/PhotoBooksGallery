import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      // Header
      catalog: "Каталог",
      editor: "Редактор",
      blog: "Блог",
      about: "О нас",
      contact: "Контакты",
      cart: "Корзина",
      
      // Hero Section
      heroTitle: "Создайте фотокнигу своей мечты",
      heroSubtitle: "Превратите ваши драгоценные воспоминания в красивые фотокниги, рамки и уникальные сувениры. Профессиональное качество печати и быстрая доставка.",
      createPhotobook: "Создать фотокнигу",
      viewExamples: "Смотреть примеры",
      
      // Categories
      categoriesTitle: "Наши категории",
      categoriesSubtitle: "Выберите идеальный способ сохранить ваши воспоминания",
      photobooks: "Фотокниги",
      photoframes: "Фоторамки",
      giftBoxes: "Подарочные коробки",
      photoSouvenirs: "Фото-сувениры",
      viewAll: "Смотреть все",
      
      // Products
      popularProducts: "Популярные товары",
      addToCart: "В корзину",
      
      // Cart
      checkout: "Оформить заказ",
      total: "Итого",
      
      // Common
      price: "Цена",
      size: "Размер",
      name: "Имя",
      email: "Email",
      phone: "Телефон",
      address: "Адрес",
      submit: "Отправить",
      cancel: "Отмена",
      save: "Сохранить",
      delete: "Удалить",
      edit: "Редактировать",
      
      // Auth
      login: "Войти",
      logout: "Выйти",
      register: "Регистрация",
      
      // Admin
      adminPanel: "Панель администратора",
      manageProducts: "Управление товарами",
      manageOrders: "Управление заказами",
      manageUsers: "Управление пользователями",
      
      // Editor
      editorTitle: "Онлайн-редактор фотокниг",
      uploadPhotos: "Загрузите фотографии",
      autoLayout: "Автоматическая раскладка",
      personalize: "Персонализация",
      startCreating: "Начать создание",
      
      // Theme & UI
      themeChanged: "Тема изменена",
      error: "Ошибка",
      failedToChangeTheme: "Не удалось изменить тему",
      onlyImages: "Можно загружать только изображения",
      uploadError: "Ошибка загрузки файла",
      primaryColor: "Основной цвет",
      accentColor: "Акцентный цвет",
      secondaryColor: "Вторичный цвет",
      saving: "Сохранение...",
      
      // Currency Settings
      baseCurrencyUpdated: "Базовая валюта обновлена",
      baseCurrencySuccess: "Базовая валюта успешно изменена",
      failedToUpdateBaseCurrency: "Не удалось обновить базовую валюту",
      exchangeRateUpdated: "Курс обновлён",
      exchangeRateSuccess: "Курс валюты успешно обновлён",
      failedToUpdateRate: "Не удалось обновить курс валюты",
      invalidRate: "Введите корректный курс валюты",
      selectBaseCurrency: "Выберите базовую валюту",
      rate: "Курс",
      
      // Admin Panel
      categories: "Категории",
      products: "Товары",
      orders: "Заказы",
      customers: "Клиенты",
      reviews: "Отзывы",
      currencies: "Валюты",
      analytics: "Аналитика",
      
      // Product Details
      manufacturing: "Изготовление",
      delivery: "Доставка",
      days: "дн.",
      buyNow: "Купить сейчас",
      freeShipping: "бесплатно от",
      
      // Sorting
      sortBy: "Сортировать по",
      priceLow: "Цена: по возрастанию",
      priceHigh: "Цена: по убыванию",
      
      // Loading states
      loading: "Загрузка...",
      loadingAdminPanel: "Загрузка админ панели...",
      loadingSettings: "Загрузка настроек валют...",
      
      // Price labels
      priceMinimum: "Цена (за минимальное количество разворотов)",
      priceAdditional: "Цена за доп. разворот (автоматически: 10%)",
      
      // Product status
      inStock: "В наличии",
      outOfStock: "Нет в наличии",
      addToWishlist: "Добавить в избранное",
      
      // Filters and search
      filters: "Фильтры",
      search: "Поиск",
      searchPlaceholder: "Найти товар...",
      sorting: "Сортировка",
      
      // Admin panel UI
      crmPanel: "CRM Панель",
      administrator: "Администратор",
      sectionInDevelopment: "Раздел в разработке",
      sectionComingSoon: "Этот раздел скоро будет доступен"
    }
  },
  hy: {
    translation: {
      // Header
      catalog: "Կատալոգ",
      editor: "Խմբագիր",
      blog: "Բլոգ",
      about: "Մեր մասին",
      contact: "Կապ",
      cart: "Զամբյուղ",
      
      // Hero Section
      heroTitle: "Ստեղծեք ձեր երազանքի լուսանկարների գիրքը",
      heroSubtitle: "Վերածեք ձեր թանկարժեք հիշողությունները գեղեցիկ լուսանկարների գրքերի, շրջանակների և եզակի հուշարձանների: Մասնագիտական տպագրության որակ և արագ առաքում:",
      createPhotobook: "Ստեղծել լուսանկարների գիրք",
      viewExamples: "Դիտել օրինակները",
      
      // Categories
      categoriesTitle: "Մեր կատեգորիաները",
      categoriesSubtitle: "Ընտրեք կատարյալ եղանակը ձեր հիշողությունները պահպանելու համար",
      photobooks: "Լուսանկարների գրքեր",
      photoframes: "Լուսանկարների շրջանակներ",
      giftBoxes: "Նվերային տուփեր",
      photoSouvenirs: "Լուսանկարային հուշարձաններ",
      viewAll: "Տեսնել բոլորը",
      
      // Products
      popularProducts: "Հանրաճանաչ ապրանքներ",
      addToCart: "Ավելացնել զամբյուղում",
      
      // Cart
      checkout: "Պատվիրել",
      total: "Ընդամենը",
      
      // Common
      price: "Գին",
      size: "Չափ",
      name: "Անուն",
      email: "Էլ. փոստ",
      phone: "Հեռախոս",
      address: "Հասցե",
      submit: "Ուղարկել",
      cancel: "Չեղարկել",
      save: "Պահպանել",
      delete: "Ջնջել",
      edit: "Խմբագրել",
      
      // Auth
      login: "Մուտք",
      logout: "Ելք",
      register: "Գրանցում",
      
      // Admin
      adminPanel: "Ադմինիստրատորի վահանակ",
      manageProducts: "Ապրանքների կառավարում",
      manageOrders: "Պատվերների կառավարում",
      manageUsers: "Օգտատերերի կառավարում",
      
      // Editor
      editorTitle: "Լուսանկարների գրքերի օնլայն խմբագիր",
      uploadPhotos: "Վերբեռնեք լուսանկարները",
      autoLayout: "Ավտոմատ դասավորություն",
      personalize: "Անհատականացում",
      startCreating: "Սկսել ստեղծումը",
      
      // Theme & UI
      themeChanged: "Թեման փոխվեց",
      error: "Սխալ",
      failedToChangeTheme: "Չհաջողվեց փոխել թեման",
      onlyImages: "Միայն նկարներ կարելի է վերբեռնել",
      uploadError: "Ֆայլի վերբեռնման սխալ",
      primaryColor: "Հիմնական գույն",
      accentColor: "Շեշտակի գույն",
      secondaryColor: "Երկրորդային գույն",
      saving: "Պահպանվում է...",
      
      // Currency Settings
      baseCurrencyUpdated: "Հիմնական արժույթը թարմացվեց",
      baseCurrencySuccess: "Հիմնական արժույթը հաջողությամբ փոխվեց",
      failedToUpdateBaseCurrency: "Չհաջողվեց թարմացնել հիմնական արժույթը",
      exchangeRateUpdated: "Փոխարժեքը թարմացվեց",
      exchangeRateSuccess: "Արժույթի փոխարժեքը հաջողությամբ թարմացվեց",
      failedToUpdateRate: "Չհաջողվեց թարմացնել փոխարժեքը",
      invalidRate: "Մուտքագրեք ճիշտ փոխարժեք",
      selectBaseCurrency: "Ընտրեք հիմնական արժույթ",
      rate: "Փոխարժեք",
      
      // Admin Panel
      categories: "Կատեգորիաներ",
      products: "Ապրանքներ",
      orders: "Պատվերներ",
      customers: "Հաճախորդներ",
      reviews: "Գնահատականներ",
      currencies: "Արժույթներ",
      analytics: "Վերլուծություն",
      
      // Product Details
      manufacturing: "Արտադրություն",
      delivery: "Առաքում",
      days: "օր",
      buyNow: "Գնել հիմա",
      freeShipping: "անվճար",
      
      // Sorting
      sortBy: "Դասակարգել ըստ",
      priceLow: "Գին: աճող",
      priceHigh: "Գին: նվազող",
      
      // Loading states
      loading: "Բեռնվում է...",
      loadingAdminPanel: "Ադմինիստրատորի վահանակը բեռնվում է...",
      loadingSettings: "Արժույթի կարգավորումները բեռնվում են...",
      
      // Price labels
      priceMinimum: "Գին (նվազագույն էջերի քանակի համար)",
      priceAdditional: "Լրացուցիչ էջի գին (ավտոմատ՝ 10%)",
      
      // Product status
      inStock: "Պահեստում կա",
      outOfStock: "Պահեստում չկա",
      addToWishlist: "Ավելացնել ցանկությունների մեջ",
      
      // Filters and search
      filters: "Զտիչներ",
      search: "Որոնել",
      searchPlaceholder: "Գտնել ապրանք...",
      sorting: "Դասակարգում",
      
      // Admin panel UI
      crmPanel: "CRM վահանակ",
      administrator: "Ադմինիստրատոր",
      sectionInDevelopment: "Բաժինը զարգացման փուլում է",
      sectionComingSoon: "Այս բաժինը շուտով հասանելի կլինի"
    }
  },
  en: {
    translation: {
      // Header
      catalog: "Catalog",
      editor: "Editor",
      blog: "Blog",
      about: "About",
      contact: "Contact",
      cart: "Cart",
      
      // Hero Section
      heroTitle: "Create Your Dream Photobook",
      heroSubtitle: "Turn your precious memories into beautiful photobooks, frames and unique souvenirs. Professional print quality and fast delivery.",
      createPhotobook: "Create Photobook",
      viewExamples: "View Examples",
      
      // Categories
      categoriesTitle: "Our Categories",
      categoriesSubtitle: "Choose the perfect way to preserve your memories",
      photobooks: "Photobooks",
      photoframes: "Photo Frames",
      giftBoxes: "Gift Boxes",
      photoSouvenirs: "Photo Souvenirs",
      viewAll: "View All",
      
      // Products
      popularProducts: "Popular Products",
      addToCart: "Add to Cart",
      
      // Cart
      checkout: "Checkout",
      total: "Total",
      
      // Common
      price: "Price",
      size: "Size",
      name: "Name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      submit: "Submit",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      
      // Auth
      login: "Login",
      logout: "Logout",
      register: "Register",
      
      // Admin
      adminPanel: "Admin Panel",
      manageProducts: "Manage Products",
      manageOrders: "Manage Orders",
      manageUsers: "Manage Users",
      
      // Editor
      editorTitle: "Online Photobook Editor",
      uploadPhotos: "Upload Photos",
      autoLayout: "Auto Layout",
      personalize: "Personalize",
      startCreating: "Start Creating",
      
      // Theme & UI
      themeChanged: "Theme Changed",
      error: "Error",
      failedToChangeTheme: "Failed to change theme",
      onlyImages: "Only images can be uploaded",
      uploadError: "File upload error",
      primaryColor: "Primary Color",
      accentColor: "Accent Color",
      secondaryColor: "Secondary Color",
      saving: "Saving...",
      
      // Currency Settings
      baseCurrencyUpdated: "Base Currency Updated",
      baseCurrencySuccess: "Base currency successfully changed",
      failedToUpdateBaseCurrency: "Failed to update base currency",
      exchangeRateUpdated: "Exchange Rate Updated",
      exchangeRateSuccess: "Currency exchange rate successfully updated",
      failedToUpdateRate: "Failed to update exchange rate",
      invalidRate: "Enter a valid exchange rate",
      selectBaseCurrency: "Select base currency",
      rate: "Rate",
      
      // Admin Panel
      categories: "Categories",
      products: "Products",
      orders: "Orders",
      customers: "Customers",
      reviews: "Reviews",
      currencies: "Currencies",
      analytics: "Analytics",
      
      // Product Details
      manufacturing: "Manufacturing",
      delivery: "Delivery",
      days: "days",
      buyNow: "Buy Now",
      freeShipping: "free from",
      
      // Sorting
      sortBy: "Sort by",
      priceLow: "Price: Low to High",
      priceHigh: "Price: High to Low",
      
      // Loading states
      loading: "Loading...",
      loadingAdminPanel: "Loading admin panel...",
      loadingSettings: "Loading currency settings...",
      
      // Price labels
      priceMinimum: "Price (for minimum page count)",
      priceAdditional: "Additional page price (auto: 10%)",
      
      // Product status
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      addToWishlist: "Add to Wishlist",
      
      // Filters and search
      filters: "Filters",
      search: "Search",
      searchPlaceholder: "Find product...",
      sorting: "Sorting",
      
      // Admin panel UI
      crmPanel: "CRM Panel",
      administrator: "Administrator",
      sectionInDevelopment: "Section in Development",
      sectionComingSoon: "This section will be available soon"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ru',
    fallbackLng: 'ru',
    
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
