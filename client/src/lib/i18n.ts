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
      editorSubtitle: "Создайте уникальную фотокнигу за несколько минут с помощью нашего простого редактора",
      uploadPhotos: "Загрузите фотографии",
      uploadPhotosDesc: "Перетащите ваши любимые фото или выберите их из галереи",
      autoLayout: "Автоматическая раскладка",
      autoLayoutDesc: "Наш алгоритм создаст красивую раскладку на 10 разворотов",
      personalize: "Персонализация",
      personalizeDesc: "Добавьте текст, измените порядок фото и настройте дизайн",
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
      sectionComingSoon: "Этот раздел скоро будет доступен",
      
      // Landing page elements
      clientChoice: "Выбор наших клиентов",
      dragPhotosHere: "Перетащите фото сюда",
      releasePhotosHere: "Отпустите фото здесь",
      selectFiles: "Выбрать файлы",
      whyChooseUs: "Почему выбирают нас",
      qualityAndService: "Качество и сервис на высшем уровне",
      premiumQuality: "Премиум качество",
      professionalPrint: "Профессиональная печать на лучших материалах",
      fastDelivery: "Быстрая доставка",
      fastDeliveryDesc: "Доставим ваш заказ в течение 3-5 рабочих дней",
      easyEditor: "Легкий редактор",
      easyEditorDesc: "Интуитивный интерфейс для создания фотокниг",
      support247: "Поддержка 24/7",
      support247Desc: "Всегда готовы помочь с вашими вопросами",
      
      // Reviews section
      customerReviews: "Отзывы клиентов",
      whatClientsSay: "Что говорят о нас наши клиенты",
      leaveReview: "Оставить отзыв",
      yourName: "Ваше имя",
      enterYourName: "Введите ваше имя",
      emailOptional: "Email (необязательно)",
      gender: "Пол",
      male: "Мужской",
      female: "Женский",
      profilePhotoOptional: "Фото профиля (необязательно)",
      uploadPhoto: "Загрузить фото",
      rating: "Оценка",
      yourReview: "Ваш отзыв",
      reviewPlaceholder: "Расскажите о вашем опыте использования наших услуг...",
      submitReview: "Отправить отзыв",
      
      // Call to Action
      readyToCreate: "Готовы создать свою фотокнигу?",
      saveMemories: "Сохраните ваши воспоминания в красивой фотокниге. Начните прямо сейчас и получите скидку 15% на первый заказ!",
      contactUs: "Связаться с нами",
      
      // Form actions
      cancel: "Отмена",
      uploading: "Загружается...",
      sending: "Отправляем...",
      
      // Footer
      companyDescription: "Создаем качественные фотокниги и сувениры для сохранения ваших драгоценных воспоминаний.",
      footerCategories: "Категории",
      support: "Поддержка",
      contacts: "Контакты",
      help: "Помощь",
      shipping: "Доставка",
      returns: "Возврат",
      qualityGuarantee: "Гарантия качества",
      allRightsReserved: "Все права защищены",
      privacyPolicy: "Политика конфиденциальности",
      termsOfService: "Условия использования"
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
      editorSubtitle: "Ստեղծեք եզակի լուսանկարների գիրք մի քանի րոպեում մեր պարզ խմբագրիչի միջոցով",
      uploadPhotos: "Վերբեռնեք լուսանկարները",
      uploadPhotosDesc: "Քաշեք ձեր սիրված լուսանկարները կամ ընտրեք դրանք պատկերասրահից",
      autoLayout: "Ավտոմատ դասավորություն",
      autoLayoutDesc: "Մեր ալգորիթմը կստեղծի գեղեցիկ դասավորություն 10 բացումների վրա",
      personalize: "Անհատականացում",
      personalizeDesc: "Ավելացրեք տեքստ, փոխեք լուսանկարների կարգը և կարգավորեք դիզայնը",
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
      sectionComingSoon: "Այս բաժինը շուտով հասանելի կլինի",
      
      // Landing page elements
      clientChoice: "Մեր հաճախորդների ընտրությունը",
      dragPhotosHere: "Քաշեք լուսանկարները այստեղ",
      releasePhotosHere: "Թողեք լուսանկարները այստեղ",
      selectFiles: "Ընտրել ֆայլեր",
      whyChooseUs: "Ինչու են մեզ ընտրում",
      qualityAndService: "Որակ և սպասարկություն բարձրագույն մակարդակով",
      premiumQuality: "Պրեմիում որակ",
      professionalPrint: "Մասնագիտական տպագրություն լավագույն նյութերով",
      fastDelivery: "Արագ առաքում",
      fastDeliveryDesc: "Կառաքենք ձեր պատվերը 3-5 աշխատանքային օրվա ընթացքում",
      easyEditor: "Հեշտ խմբագիր",
      easyEditorDesc: "Ինտուիտիվ ինտերֆեյս լուսանկարների գրքեր ստեղծելու համար",
      support247: "Աջակցություն 24/7",
      support247Desc: "Միշտ պատրաստ ենք օգնել ձեր հարցերում",
      
      // Reviews section
      customerReviews: "Հաճախորդների գնահատականներ",
      whatClientsSay: "Ինչ են ասում մեր մասին մեր հաճախորդները",
      leaveReview: "Թողնել գնահատական",
      yourName: "Ձեր անունը",
      enterYourName: "Մուտքագրեք ձեր անունը",
      emailOptional: "Էլ. փոստ (ոչ պարտադիր)",
      gender: "Սեռ",
      male: "Տղամարդ",
      female: "Կին",
      profilePhotoOptional: "Պրոֆիլի նկար (ոչ պարտադիր)",
      uploadPhoto: "Վերբեռնել նկար",
      rating: "Գնահատական",
      yourReview: "Ձեր գնահատականը",
      reviewPlaceholder: "Պատմեք մեր ծառայություններից օգտվելու ձեր փորձի մասին...",
      submitReview: "Ուղարկել գնահատականը",
      
      // Call to Action
      readyToCreate: "Պատրա՞ստ եք ստեղծել ձեր լուսանկարների գիրքը:",
      saveMemories: "Պահպանեք ձեր հիշողությունները գեղեցիկ լուսանկարների գրքում: Սկսեք հենց հիմա և ստացեք 15% զեղչ առաջին պատվերի համար:",
      contactUs: "Կապ մեզ հետ",
      
      // Form actions
      cancel: "Չեղարկել",
      uploading: "Վերբեռնվում է...",
      sending: "Ուղարկվում է...",
      
      // Footer
      companyDescription: "Ստեղծում ենք որակավոր լուսանկարների գրքեր և հիշատակարաններ ձեր արժեքավոր հիշողությունների պահպանության համար:",
      footerCategories: "Կատեգորիաներ",
      support: "Աջակցություն",
      contacts: "Կապեր",
      help: "Օգնություն",
      shipping: "Առաքում",
      returns: "Վերադարձում",
      qualityGuarantee: "Որակի երաշխիք",
      allRightsReserved: "Բոլոր իրավունքներն ապահովված են",
      privacyPolicy: "Գաղտնիության քաղաքականություն",
      termsOfService: "Օգտագоրծման պայմաններ"
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
      editorSubtitle: "Create a unique photobook in minutes with our simple editor",
      uploadPhotos: "Upload Photos",
      uploadPhotosDesc: "Drag your favorite photos or select them from the gallery",
      autoLayout: "Auto Layout",
      autoLayoutDesc: "Our algorithm will create a beautiful layout on 10 spreads",
      personalize: "Personalize",
      personalizeDesc: "Add text, change photo order and customize design",
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
      sectionComingSoon: "This section will be available soon",
      
      // Landing page elements
      clientChoice: "Our clients' choice",
      dragPhotosHere: "Drag photos here",
      releasePhotosHere: "Release photos here",
      selectFiles: "Select Files",
      whyChooseUs: "Why Choose Us",
      qualityAndService: "Quality and service at the highest level",
      premiumQuality: "Premium Quality",
      professionalPrint: "Professional printing on the best materials",
      fastDelivery: "Fast Delivery",
      fastDeliveryDesc: "We'll deliver your order within 3-5 business days",
      easyEditor: "Easy Editor",
      easyEditorDesc: "Intuitive interface for creating photobooks",
      support247: "24/7 Support",
      support247Desc: "Always ready to help with your questions",
      
      // Reviews section
      customerReviews: "Customer Reviews",
      whatClientsSay: "What our clients say about us",
      leaveReview: "Leave Review",
      yourName: "Your Name",
      enterYourName: "Enter your name",
      emailOptional: "Email (optional)",
      gender: "Gender",
      male: "Male",
      female: "Female",
      profilePhotoOptional: "Profile photo (optional)",
      uploadPhoto: "Upload Photo",
      rating: "Rating",
      yourReview: "Your Review",
      reviewPlaceholder: "Tell us about your experience using our services...",
      submitReview: "Submit Review",
      
      // Call to Action
      readyToCreate: "Ready to create your photobook?",
      saveMemories: "Save your memories in a beautiful photobook. Start now and get 15% off your first order!",
      contactUs: "Contact Us",
      
      // Form actions
      cancel: "Cancel",
      uploading: "Uploading...",
      sending: "Sending...",
      
      // Footer
      companyDescription: "Creating quality photobooks and souvenirs to preserve your precious memories.",
      categories: "Categories",
      support: "Support",
      contacts: "Contacts",
      help: "Help",
      shipping: "Shipping",
      returns: "Returns",
      qualityGuarantee: "Quality Guarantee",
      allRightsReserved: "All rights reserved",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service"
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
