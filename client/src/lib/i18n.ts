import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      // SEO Meta Tags
      landingPageTitle: "PhotoBooksGallery - Создание фотокниг и фотосувениров в Армении",
      landingPageDescription: "Создавайте уникальные фотокниги и фотосувениры в PhotoBooksGallery. Онлайн редактор, высокое качество печати, быстрая доставка по Армении. Сохраните ваши воспоминания навсегда!",
      landingPageKeywords: "фотокниги, фотосувениры, печать фото, фоторамки, подарки, Армения, онлайн редактор, PhotoBooksGallery",
      
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
      photobook: "фотокнигу", // винительный падеж для "создал фотокнигу"
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
      selectProduct: "Выберите товар",
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
      
      // Contact Section
      contactTitle: "Свяжитесь с нами",
      contactSubtitle: "Готовы ответить на все ваши вопросы и помочь создать идеальную фотокнигу",
      contactDescription: "Выберите удобный способ связи. Мы работаем 24/7 и всегда рады помочь!",
      
      // Contact Methods
      whatsappTitle: "WhatsApp",
      whatsappDesc: "Быстрая связь в любое время",
      telegramTitle: "Telegram", 
      telegramDesc: "Мгновенные ответы на вопросы",
      instagramTitle: "Instagram",
      instagramDesc: "Следите за нашими новинками",
      facebookTitle: "Facebook Messenger",
      facebookDesc: "Общайтесь с нами в Facebook",
      emailTitle: "Электронная почта",
      emailDesc: "Подробные консультации по email",
      viberTitle: "Viber",
      viberDesc: "Удобная связь через Viber",
      skypeTitle: "Skype",
      skypeDesc: "Видеоконсультации онлайн",
      vkTitle: "ВКонтакте",
      vkDesc: "Сообщество и поддержка",
      
            
      // Contact Info
      phoneNumber: "+7 (999) 123-45-67",
      emailAddress: "info@photobook.ru", 
      workingHours: "Ежедневно 9:00-21:00",
      responseTime: "Отвечаем в течение 15 минут",
      
      // Contact Info Labels
      phoneLabel: "Телефон",
      emailLabel: "Email", 
      workingHoursLabel: "Время работы",
      responseTimeLabel: "Отклик",
      
      // Contact CTA
      contactCTATitle: "Готовы начать создание вашей фотокниги?",
      contactCTASubtitle: "Выберите любой способ связи и мы поможем вам прямо сейчас!",
      contactCTAButton: "Написать в WhatsApp",
      
      // About Page
      aboutPageTitle: "О нас - PhotoBooksGallery | Создаем незабываемые фотокниги",
      aboutPageDescription: "PhotoBooksGallery - создаем качественные фотокниги и фотосувениры с 2018 года. Онлайн редактор, быстрая печать фотографий.",
      aboutHeroTitle: "О нас",
      aboutHeroSubtitle: "Мы создаем воспоминания, которые останутся навсегда",
      aboutMissionTitle: "Наша миссия",
      aboutMissionText: "Помочь людям сохранить самые дорогие моменты жизни в красивых фотокнигах и сувенирах высочайшего качества.",
      aboutWhyChooseTitle: "Почему выбирают нас",
      onlineEditor: "Онлайн редактор",
      onlineEditorDesc: "Простой и удобный редактор для создания уникальных фотокниг",
      fastPrinting: "Быстрая печать",
      fastPrintingDesc: "Изготавливаем заказы в кратчайшие сроки с высоким качеством",
      quality: "Качество",
      qualityDesc: "Используем только лучшие материалы и современное оборудование",
      care: "Забота",
      careDesc: "Индивидуальный подход к каждому клиенту и заказу",
      aboutStoryTitle: "Наша история",
      aboutStoryText1: "Компания была основана в 2018 году с простой идеей - сделать создание фотокниг доступным каждому.",
      aboutStoryText2: "За годы работы мы помогли тысячам клиентов сохранить их самые ценные воспоминания.",
      aboutTeamTitle: "Наша команда",
      aboutTestimonialsTitle: "Отзывы клиентов",
      aboutCTATitle: "Готовы создать свою фотокнигу?",
      aboutCTASubtitle: "Начните прямо сейчас и сохраните ваши воспоминания навсегда",
      aboutCTAButton: "Создать фотокнигу",
      
      // Contacts Page
      contactsPageTitle: "Контакты - PhotoBooksGallery | Связаться с нами",
      contactsPageDescription: "Свяжитесь с нами любым удобным способом: WhatsApp, Telegram, Instagram, Facebook, Email. Работаем 24/7 и отвечаем в течение 15 минут.",
      
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
      termsOfService: "Условия использования",

      // Video functionality
      video: "Видео",
      uploadVideo: "Загрузить видео",
      videoUrl: "URL видео",
      videos: "Видео",
      videoUpload: "Загрузка видео",
      videoUploadDesc: "Загрузите видео для демонстрации товара",
      videoFormatError: "Поддерживаются только видео форматы MP4, WebM, MOV",
      videoSizeError: "Размер видео не должен превышать 100MB",
      videoUploadSuccess: "Видео успешно загружено",
      videoUploadFailed: "Не удалось загрузить видео",
      videoPlaybackError: "Ошибка воспроизведения видео",
      videoPreview: "Предпросмотр видео",
      videoThumbnail: "Миниатюра видео",
      videoProcessing: "Обработка видео...",

      // Trust Indicators (Блок социального доверия)
      booksCreated: "книг создано",
      booksSold: "довольных клиентов",
      recentPurchase: "недавно приобрел фотокнигу",
      qualityGuaranteeTitle: "Гарантия качества",
      qualityGuaranteeDesc: "100% возврат денег, если не понравится результат",
      freeShippingTitle: "Бесплатная доставка",
      freeShippingDesc: "При заказе от 3000 рублей",
      fastProductionTitle: "Быстрое изготовление", 
      fastProductionDesc: "Готовим заказ за 2-3 рабочих дня",

      // FAQ Section
      faqTitle: "Часто задаваемые вопросы",
      faqSubtitle: "Ответы на популярные вопросы о наших услугах",
      faqQuestion1: "Сколько времени занимает изготовление фотокниги?",
      faqAnswer1: "Стандартное время изготовления составляет 2-3 рабочих дня. Для срочных заказов доступна экспресс-услуга - изготовление за 24 часа.",
      faqQuestion2: "Какого качества получается печать?",
      faqAnswer2: "Мы используем профессиональное оборудование и премиальные материалы. Печать производится на плотной фотобумаге с разрешением 300 DPI.",
      faqQuestion3: "Можно ли изменить заказ после оформления?",
      faqAnswer3: "Изменения возможны в течение 2 часов после оформления заказа, пока он не поступил в производство. Свяжитесь с нашей поддержкой.",
      faqQuestion4: "Какие форматы фотографий поддерживаются?",
      faqAnswer4: "Поддерживаются форматы JPEG, PNG, TIFF. Рекомендуемое разрешение - от 1500x1500 пикселей для лучшего качества печати.",
      faqQuestion5: "Доставляете ли вы в другие страны?",
      faqAnswer5: "Сейчас мы доставляем только по территории России. Работаем над расширением географии доставки.",

      // Premium Services
      expressServiceTitle: "Фотокнига за один день",
      expressServiceSubtitle: "Эксклюзивная услуга для особых событий",
      expressServiceStep1: "Договор с фотографом",
      expressServiceStep1Desc: "Профессиональная съемка вашего события",
      expressServiceStep2: "Создание за 3-4 часа", 
      expressServiceStep2Desc: "Экспресс-обработка и дизайн фотокниги",
      expressServiceStep3: "Доставка в ресторан",
      expressServiceStep3Desc: "Готовая фотокнига прямо на ваше торжество",
      expressServicePrice: "от 15 000 ₽",
      expressServiceButton: "Заказать экспресс-услугу",

      arServiceTitle: "Оживающие фотографии",
      arServiceSubtitle: "Дополненная реальность в ваших фотокнигах",
      arServiceStep1: "Получите ссылку",
      arServiceStep1Desc: "QR-код для активации AR-эффектов",
      arServiceStep2: "Сканируйте фото", 
      arServiceStep2Desc: "Наведите камеру телефона на фотографию",
      arServiceStep3: "Фото оживает",
      arServiceStep3Desc: "Смотрите как фото превращается в видео",
      arServicePrice: "от 500 ₽ за фото",
      arServiceButton: "Узнать больше об AR",

      // Interactive Editor
      interactiveEditorTitle: "WOW-эффект: Мгновенное создание",
      interactiveEditorSubtitle: "Перетащите фото и получите готовую фотокнигу за секунды",
      interactiveEditorMainTitle: "Интерактивный редактор фотокниг",
      interactiveEditorDescription: "Перетащите фото и наблюдайте, как мгновенно создается уникальная фотокнига",
      interactiveEditorMagic: "Магия создания за секунды",
      interactiveEditorBadge1: "10 разворотов",
      interactiveEditorBadge2: "Мгновенно", 
      interactiveEditorBadge3: "Интерактивно",
      interactiveEditorHowTitle: "Как это работает?",
      interactiveEditorHowSubtitle: "Три простых шага до готовой фотокниги",
      
      // Steps
      editorStep1Title: "🖼️ Перетащите фотографии",
      editorStep1Badge: "Drag & Drop",
      editorStep1Description: "Просто перетащите свои любимые фото в область редактора. Поддерживаем любые форматы!",
      editorStep1Feature: "Мгновенная загрузка",
      
      editorStep2Title: "🎨 Автоматическое создание",
      editorStep2Badge: "AI Magic",
      editorStep2Description: "Наш ИИ мгновенно создает 10 красивых разворотов с профессиональной версткой",
      editorStep2Feature: "Обработка за 2-3 секунды",
      
      editorStep3Title: "📖 Просмотр и редактирование", 
      editorStep3Badge: "Preview",
      editorStep3Description: "Пролистайте готовые развороты, а затем перейдите в полный редактор для детальной настройки",
      editorStep3Feature: "Интерактивный просмотр",
      
      editorStep1: "Перетащите фотографии",
      editorStep1Desc: "Просто перетащите ваши любимые снимки",
      editorStep2: "10 разворотов за секунды",
      editorStep2Desc: "Алгоритм мгновенно создает красивую раскладку", 
      editorStep3: "Пролистайте и оцените",
      editorStep3Desc: "Посмотрите результат и внесите правки",
      editorStep4: "Зарегистрируйтесь",
      editorStep4Desc: "Сохраните проект и продолжите редактирование",
      tryEditorButton: "Попробовать редактор"
    }
  },
  hy: {
    translation: {
      // SEO Meta Tags
      landingPageTitle: "PhotoBooksGallery - Ֆոտոգրքերի և ֆոտոհուշարձանների ստեղծում Հայաստանում",
      landingPageDescription: "Ստեղծեք եզակի ֆոտոգրքեր և ֆոտոհուշարձաններ PhotoBooksGallery-ում: Օնլայն խմբագիր, բարձր որակի տպագրություն, արագ առաքում Հայաստանով: Պահպանեք ձեր հիշողությունները ընդմիշտ:",
      landingPageKeywords: "ֆոտոգրքեր, ֆոտոհուշարձաններ, ֆոտո տպագրություն, ֆոտոշրջանակներ, նվերներ, Հայաստան, օնլայն խմբագիր, PhotoBooksGallery",
      
      // Header
      catalog: "Կատալոգ",
      editor: "Խմբագիր",
      blog: "Բլոգ",
      about: "Մեր մասին",
      contact: "Կապ",
      cart: "Զամբյուղ",
      
      // Hero Section
      heroTitle: "Ստեղծեք ձեր երազանքի ֆոտոգիրքը",
      heroSubtitle: "Վերածեք ձեր թանկարժեք հիշողությունները գեղեցիկ ֆոտոգրքերի, շրջանակների և եզակի հուշարձանների: Մասնագիտական տպագրության որակ և արագ առաքում:",
      createPhotobook: "Ստեղծել ֆոտոգիրք",
      photobook: "ֆոտոգիրք", // винительный падеж
      viewExamples: "Դիտել օրինակները",
      
      // Categories
      categoriesTitle: "Մեր կատեգորիաները",
      categoriesSubtitle: "Ընտրեք կատարյալ եղանակը ձեր հիշողությունները պահպանելու համար",
      photobooks: "Ֆոտոգրքեր",
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
      editorTitle: "Ֆոտոգրքերի օնլայն խմբագիր",
      editorSubtitle: "Ստեղծեք եզակի ֆոտոգիրք մի քանի րոպեում մեր պարզ խմբագրիչի միջոցով",
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
      selectProduct: "Ընտրեք ապրանքը",
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
      readyToCreate: "Պատրա՞ստ եք ստեղծել ձեր ֆոտոգիրքը:",
      saveMemories: "Պահպանեք ձեր հիշողությունները գեղեցիկ ֆոտոգրքում: Սկսեք հենց հիմա և ստացեք 15% զեղչ առաջին պատվերի համար:",
      contactUs: "Կապ մեզ հետ",
      
      // Contact Section
      contactTitle: "Կապ մեզ հետ",
      contactSubtitle: "Պատրաստ ենք պատասխանել ձեր բոլոր հարցերին և օգնել ստեղծել կատարյալ ֆոտոգիրք",
      contactDescription: "Ընտրեք հարմար կապի եղանակը: Մենք աշխատում ենք 24/7 և միշտ ուրախ ենք օգնել:",
      
      // Contact Methods
      whatsappTitle: "WhatsApp",
      whatsappDesc: "Արագ կապ ցանկացած ժամանակ",
      telegramTitle: "Telegram",
      telegramDesc: "Ակնթարթային պատասխաններ",
      instagramTitle: "Instagram", 
      instagramDesc: "Հետևեք մեր նորություններին",
      facebookTitle: "Facebook Messenger",
      facebookDesc: "Շփվեք մեզ հետ Facebook-ում",
      emailTitle: "Էլ. փոստ",
      emailDesc: "Մանրամասն խորհրդատվություն",
      viberTitle: "Viber",
      viberDesc: "Հարմար կապ Viber-ի միջոցով",
      skypeTitle: "Skype", 
      skypeDesc: "Վիդեո խորհրդատվություն",
      vkTitle: "ВКонтакте",
      vkDesc: "Համայնք և աջակցություն",
      
      // Contact Info
      phoneNumber: "+7 (999) 123-45-67",
      emailAddress: "info@photobook.ru", 
      workingHours: "Ամեն օր 9:00-ից 21:00-ը",
      responseTime: "Պատասխանում ենք 15 րոպեի ընթացքում",
      
      // Contact Info Labels
      phoneLabel: "Հեռախոս",
      emailLabel: "Էլ. փոստ",
      workingHoursLabel: "Աշխատանքային ժամեր",
      responseTimeLabel: "Պատասխանի ժամանակ",
      
      // Contact CTA
      contactCTATitle: "Պատրա՞ստ եք սկսելու ձեր ֆոտոգրքի ստեղծումը:",
      contactCTASubtitle: "Ընտրեք կապի ցանկացած եղանակ և մենք կօգնենք ձեզ հենց հիմա:",
      contactCTAButton: "Գրել WhatsApp-ում",
      
      // Form actions
      cancel: "Չեղարկել",
      uploading: "Վերբեռնվում է...",
      sending: "Ուղարկվում է...",
      
      // Footer
      companyDescription: "Ստեղծում ենք որակավոր ֆոտոգրքեր և հիշատակարաններ ձեր արժեքավոր հիշողությունների պահպանության համար:",
      footerCategories: "Կատեգորիաներ",
      support: "Աջակցություն",
      contacts: "Կապեր",
      help: "Օգնություն",
      shipping: "Առաքում",
      returns: "Վերադարձում",
      qualityGuarantee: "Որակի երաշխիք",
      allRightsReserved: "Բոլոր իրավունքներն ապահովված են",
      privacyPolicy: "Գաղտնիության քաղաքականություն",
      termsOfService: "Օգտագործման պայմաններ",

      // About Page
      aboutPageTitle: "Մեր մասին - Memoria | Ստեղծում ենք անմոռանալի ֆոտոգրքեր և ֆոտոսուվենիրներ",
      aboutPageDescription: "Memoria - ստեղծում ենք որակյալ ֆոտոգրքեր և ֆոտոսուվենիրներ 2018 թվականից: Առցանց խմբագիր, արագ ֆոտոտպագրություն և առաքում ամբողջ երկրով:",
      aboutHeroTitle: "Պահպանում ենք ձեր հիշողությունները",
      aboutHeroSubtitle: "Ստեղծում ենք որակյալ ֆոտոգրքեր և ֆոտոսուվենիրներ հոգատարությամբ և մանրամասնությունների նկատմամբ սիրով",
      aboutMissionTitle: "Մեր առաքելությունը",
      aboutMissionText: "Մենք հավատում ենք, որ կյանքի յուրաքանչյուր պահ արժանի է պահպանման: 2018 թվականից մենք օգնում ենք մեր հաճախորդներին թվային լուսանկարները վերածելու շոշափելի հիշողությունների՝ որակյալ ֆոտոգրքերի և եզակի ֆոտոսուվենիրների միջոցով: Մեր առցանց ֆոտոգրքերի խմբագիրը դարձնում է ստեղծման գործընթացը պարզ և հաճելի:",
      aboutWhyChooseTitle: "Ինչու են մեզ ընտրում",
      aboutStoryTitle: "Մեր պատմությունը",
      aboutStoryText1: "Ամեն ինչ սկսվեց 2018 թվականին, երբ ընկերության հիմնադիրը հասկացավ, որ թվային լուսանկարները հազվադեպ են դիտվում, իսկ տպագրված նկարները պահվում են անկարգության մեջ:",
      aboutStoryText2: "Այսպես ծնվեց գեղեցիկ լուսանկարների գրքեր ստեղծելու գաղափարը, որոնք դառնում են ընտանեկան ժառանգություն: Այսօր մենք դարձել ենք պրոֆեսիոնալների թիմ, բայց պահպանել ենք սերը յուրաքանչյուր նախագծի նկատմամբ:",
      aboutTeamTitle: "Մեր թիմը",
      aboutTestimonialsTitle: "Հաճախորդների գնահատականներ",
      aboutCTATitle: "Ստեղծեք ձեր ֆոտոգիրքը հենց հիմա",
      aboutCTASubtitle: "Ձեր լուսանկարները վերածեք անմոռանալի հիշողությունների մեր առցանց խմբագրի միջոցով",
      aboutCTAButton: "Սկսել ստեղծումը",
      
      // Contacts Page
      contactsPageTitle: "Կապեր - Memoria | Կապվել մեզ հետ",
      contactsPageDescription: "Կապվեք մեզ հետ ցանկացած հարմար եղանակով: WhatsApp, Telegram, Instagram, Facebook, Email: Աշխատում ենք 24/7 և պատասխանում ենք 15 րոպեի ընթացքում:",
      
      // About Page Features
      onlineEditor: "Առցանց խմբագիր",
      onlineEditorDesc: "Ինտուիտիվ լուսանկարների գրքերի կոնստրուկտոր հազարավոր ձևանմուշներով",
      fastPrinting: "Արագ տպագրություն",
      fastPrintingDesc: "Լուսանկարների տպագրություն 24 ժամվա ընթացքում՝ առաքումով ամբողջ երկրով",
      quality: "Որակ",
      qualityDesc: "Պրեմիում թուղթ և ժամանակակից սարքավորումներ",
      care: "Հոգատարությամբ",
      careDesc: "Անհատական մոտեցում յուրաքանչյուր պատվերի նկատմամբ",

      // Video functionality
      video: "Տեսանյութ",
      uploadVideo: "Վերբեռնել տեսանյութ",
      videoUrl: "Տեսանյութի URL",
      videos: "Տեսանյութեր",
      videoUpload: "Տեսանյութի վերբեռնում",
      videoUploadDesc: "Վերբեռնեք տեսանյութ ապրանքը ցուցադրելու համար",
      videoFormatError: "Աջակցվում են միայն MP4, WebM, MOV տեսանյութերի ֆորմատներ",
      videoSizeError: "Տեսանյութի չափը չպետք է գերազանցի 100MB",
      videoUploadSuccess: "Տեսանյութը հաջողությամբ վերբեռնվեց",
      videoUploadFailed: "Չհաջողվեց վերբեռնել տեսանյութը",
      videoPlaybackError: "Տեսանյութի նվագարկման սխալ",
      videoPreview: "Տեսանյութի նախադիտում",
      videoThumbnail: "Տեսանյութի մանրապատկեր",
      videoProcessing: "Տեսանյութի մշակում...",

      // Trust Indicators (Блок социального доверия)
      booksCreated: "գիրք ստեղծված է",
      booksSold: "գոհ հաճախորդ",
      recentPurchase: "վերջերս ձեռք բերեց ֆոտոգիրք",
      qualityGuaranteeTitle: "Որակի երաշխիք",
      qualityGuaranteeDesc: "100% գումարի վերադարձ, եթե արդյունքը չի դուր գալիս",
      freeShippingTitle: "Անվճար առաքում",
      freeShippingDesc: "3000 ռուբլուց պատվեր կատարելիս",
      fastProductionTitle: "Արագ արտադրություն",
      fastProductionDesc: "Պատվերը պատրաստում ենք 2-3 աշխատանքային օրում",

      // FAQ Section
      faqTitle: "Հաճախակի տրվող հարցեր",
      faqSubtitle: "Պատասխաններ մեր ծառայությունների մասին հանրաճանաչ հարցերին",
      faqQuestion1: "Ինչքան ժամանակ է պահանջվում լուսանկարների գրքի պատրաստման համար:",
      faqAnswer1: "Ստանդարտ պատրաստման ժամանակը 2-3 աշխատանքային օր է: Արտակարգ պատվերների համար հասանելի է էքսպրես ծառայություն՝ 24 ժամում պատրաստում:",
      faqQuestion2: "Ինչ որակի տպագրություն է ստացվում:",
      faqAnswer2: "Մենք օգտագործում ենք մասնագիտական սարքավորումներ և պրեմիում նյութեր: Տպագրությունը կատարվում է հաստ ֆոտոթղթի վրա 300 DPI լուծաչով:",
      faqQuestion3: "Կարո՞ղ է փոխել պատվերը ձևակերպումից հետո:",
      faqAnswer3: "Փոփոխությունները հնարավոր են պատվերի ձևակերպումից հետո 2 ժամվա ընթացքում, մինչև այն արտադրություն չի մտնի: Կապվեք մեր աջակցության հետ:",
      faqQuestion4: "Ինչ ֆորմատի լուսանկարներ են աջակցվում:",
      faqAnswer4: "Աջակցվում են JPEG, PNG, TIFF ֆորմատները: Խորհուրդ է տրվում 1500x1500 պիքսելից բարձր լուծաչությունը տպագրության լավ որակի համար:",
      faqQuestion5: "Առաքու՞մ եք այլ երկրներ:",
      faqAnswer5: "Ներկայումս մենք առաքում ենք միայն Ռուսաստանի տարածքում: Աշխատում ենք առաքման աշխարհագրության ընդլայնման վրա:",

      // Premium Services
      expressServiceTitle: "Ֆոտոգիրք մեկ օրում",
      expressServiceSubtitle: "Էքսկլուզիվ ծառայություն հատուկ իրադարձությունների համար",
      expressServiceStep1: "Պայմանագիր լուսանկարչի հետ",
      expressServiceStep1Desc: "Ձեր իրադարձության մասնագիտական նկարահանում",
      expressServiceStep2: "Ստեղծում 3-4 ժամում",
      expressServiceStep2Desc: "Էքսպրես մշակում և ֆոտոգրքի դիզայն",
      expressServiceStep3: "Առաքում ռեստորան",
      expressServiceStep3Desc: "Պատրաստ ֆոտոգիրք ուղղակի ձեր տոնի վրա",
      expressServicePrice: "15 000 ₽-ից",
      expressServiceButton: "Պատվիրել էքսպրես ծառայություն",

      arServiceTitle: "Կենդանի լուսանկարներ",
      arServiceSubtitle: "Լրացված իրականություն ձեր ֆոտոգրքերում",
      arServiceStep1: "Ստացեք հղումը",
      arServiceStep1Desc: "QR կոդ AR էֆեկտների ակտիվացման համար",
      arServiceStep2: "Սկանավորեք լուսանկարը",
      arServiceStep2Desc: "Հեռախոսի տեսախցիկը ուղղեք լուսանկարի վրա",
      arServiceStep3: "Լուսանկարը կենդանանում է",
      arServiceStep3Desc: "Դիտեք, թե ինչպես է լուսանկարը վերածվում տեսանյութի",
      arServicePrice: "500 ₽-ից մեկ լուսանկարի համար",
      arServiceButton: "Իմանալ ավելին AR-ի մասին",

      // Interactive Editor
      interactiveEditorTitle: "WOW էֆեկտ: Ակնթարթային ստեղծում",
      interactiveEditorSubtitle: "Քաշեք լուսանկարը և ստացեք պատրաստ ֆոտոգիրք վայրկյանների մեջ",
      interactiveEditorMainTitle: "Ինտերակտիվ ֆոտոգրքերի խմբագիր",
      interactiveEditorDescription: "Քաշեք լուսանկարները և դիտեք, թե ինչպես է ակնթարթորեն ստեղծվում եզակի ֆոտոգիրք",
      interactiveEditorMagic: "Ստեղծման կախարդանք վայրկյանների մեջ",
      interactiveEditorBadge1: "10 բացում",
      interactiveEditorBadge2: "Ակնթարթորեն",
      interactiveEditorBadge3: "Ինտերակտիվ",
      interactiveEditorHowTitle: "Ինչպես է այն աշխատում?",
      interactiveEditorHowSubtitle: "Երեք պարզ քայլ մինչև պատրաստ ֆոտոգիրք",
      
      // Steps
      editorStep1Title: "🖼️ Քաշեք լուսանկարները",
      editorStep1Badge: "Drag & Drop",
      editorStep1Description: "Պարզապես քաշեք ձեր սիրված լուսանկարները խմբագրիչի տարածք: Աջակցում ենք ցանկացած ֆորմատ:",
      editorStep1Feature: "Ակնթարթային բեռնում",
      
      editorStep2Title: "🎨 Ավտոմատ ստեղծում",
      editorStep2Badge: "AI Magic", 
      editorStep2Description: "Մեր արհեստական բանականությունը ակնթարթորեն ստեղծում է 10 գեղեցիկ բացում մասնագիտական դասավորությամբ",
      editorStep2Feature: "Մշակում 2-3 վայրկյանում",
      
      editorStep3Title: "📖 Դիտում և խմբագրում",
      editorStep3Badge: "Preview",
      editorStep3Description: "Թերթեք պատրաստ բացումները, ապա անցեք ամբողջական խմբագիր մանրակրկիտ կարգավորման համար",
      editorStep3Feature: "Ինտերակտիվ դիտում",
      
      editorStep1: "Քաշեք լուսանկարները",
      editorStep1Desc: "Պարզապես քաշեք ձեր սիրված լուսանկարները",
      editorStep2: "10 բացում վայրկյանների մեջ",
      editorStep2Desc: "Ալգորիթմը ակնթարթորեն ստեղծում է գեղեցիկ դասավորություն",
      editorStep3: "Թերթեք և գնահատեք",
      editorStep3Desc: "Նայեք արդյունքը և կատարեք փոփոխություններ",
      editorStep4: "Գրանցվեք",
      editorStep4Desc: "Պահպանեք նախագիծը և շարունակեք խմբագրումը",
      tryEditorButton: "Փորձել խմբագիրը"
    }
  },
  en: {
    translation: {
      // SEO Meta Tags
      landingPageTitle: "PhotoBooksGallery - Custom Photobooks & Photo Gifts in Armenia",
      landingPageDescription: "Create unique photobooks and photo gifts at PhotoBooksGallery. Online editor, high-quality printing, fast delivery in Armenia. Preserve your memories forever!",
      landingPageKeywords: "photobooks, photo gifts, photo printing, photo frames, gifts, Armenia, online editor, PhotoBooksGallery",
      
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
      photobook: "photobook", // объект действия
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
      selectProduct: "Select Product",
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
      
      // Contact Section
      contactTitle: "Contact Us",
      contactSubtitle: "We're ready to answer all your questions and help create the perfect photobook",
      contactDescription: "Choose your preferred communication method. We work 24/7 and are always happy to help:",
      
      // Contact Methods
      whatsappTitle: "WhatsApp",
      whatsappDesc: "Quick contact anytime",
      telegramTitle: "Telegram",
      telegramDesc: "Instant responses",
      instagramTitle: "Instagram",
      instagramDesc: "Follow our latest updates",
      facebookTitle: "Facebook Messenger",
      facebookDesc: "Chat with us on Facebook",
      emailTitle: "Email",
      emailDesc: "Detailed consultation",
      viberTitle: "Viber",
      viberDesc: "Convenient contact via Viber",
      skypeTitle: "Skype",
      skypeDesc: "Video consultation",
      vkTitle: "VKontakte",
      vkDesc: "Community and support",
      
      // Contact Info
      phoneNumber: "+7 (999) 123-45-67",
      emailAddress: "info@photobook.ru",
      workingHours: "Daily 9:00 AM - 9:00 PM",
      responseTime: "We respond within 15 minutes",
      
      // Contact Info Labels
      phoneLabel: "Phone",
      emailLabel: "Email",
      workingHoursLabel: "Working Hours", 
      responseTimeLabel: "Response Time",
      
      // Contact CTA
      contactCTATitle: "Ready to start creating your photobook?",
      contactCTASubtitle: "Choose any contact method and we'll help you right now!",
      contactCTAButton: "Write on WhatsApp",
      
      // About Page
      aboutPageTitle: "About Us - Memoria | Creating Unforgettable Photobooks",
      aboutPageDescription: "Memoria - creating quality photobooks and photo souvenirs since 2018. Online editor, fast photo printing.",
      aboutHeroTitle: "About Us",
      aboutHeroSubtitle: "We create memories that will last forever",
      aboutMissionTitle: "Our Mission",
      aboutMissionText: "Help people preserve life's most precious moments in beautiful photobooks and high-quality souvenirs.",
      aboutWhyChooseTitle: "Why Choose Us",
      onlineEditor: "Online Editor",
      onlineEditorDesc: "Simple and convenient editor for creating unique photobooks",
      fastPrinting: "Fast Printing",
      fastPrintingDesc: "We fulfill orders in the shortest time with high quality",
      quality: "Quality", 
      qualityDesc: "We use only the best materials and modern equipment",
      care: "Care",
      careDesc: "Individual approach to each customer and order",
      aboutStoryTitle: "Our Story",
      aboutStoryText1: "The company was founded in 2018 with a simple idea - to make creating photobooks accessible to everyone.",
      aboutStoryText2: "Over the years, we have helped thousands of customers preserve their most valuable memories.",
      aboutTeamTitle: "Our Team",
      aboutTestimonialsTitle: "Customer Reviews",
      aboutCTATitle: "Ready to create your photobook?",
      aboutCTASubtitle: "Start right now and preserve your memories forever",
      aboutCTAButton: "Create Photobook",
      
      // Contacts Page
      contactsPageTitle: "Contacts - Memoria | Contact Us",
      contactsPageDescription: "Contact us in any convenient way: WhatsApp, Telegram, Instagram, Facebook, Email. We work 24/7 and respond within 15 minutes.",
      
      // Form actions
      cancel: "Cancel",
      uploading: "Uploading...",
      sending: "Sending...",
      
      // Footer
      companyDescription: "Creating quality photobooks and souvenirs to preserve your precious memories.",
      footerCategories: "Categories",
      support: "Support",
      contacts: "Contacts",
      help: "Help",
      shipping: "Shipping",
      returns: "Returns",
      qualityGuarantee: "Quality Guarantee",
      allRightsReserved: "All rights reserved",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",

      // Video functionality
      video: "Video",
      uploadVideo: "Upload Video",
      videoUrl: "Video URL",
      videos: "Videos",
      videoUpload: "Video Upload",
      videoUploadDesc: "Upload a video to showcase the product",
      videoFormatError: "Only MP4, WebM, MOV video formats are supported",
      videoSizeError: "Video size should not exceed 100MB",
      videoUploadSuccess: "Video uploaded successfully",
      videoUploadFailed: "Failed to upload video",
      videoPlaybackError: "Video playback error",
      videoPreview: "Video Preview",
      videoThumbnail: "Video Thumbnail",
      videoProcessing: "Video processing...",

      // Trust Indicators (Блок социального доверия)
      booksCreated: "books created",
      booksSold: "happy customers",
      recentPurchase: "recently purchased a photobook",
      qualityGuaranteeTitle: "Quality Guarantee",
      qualityGuaranteeDesc: "100% money back if you don't like the result",
      freeShippingTitle: "Free Shipping",
      freeShippingDesc: "On orders over 3000 rubles",
      fastProductionTitle: "Fast Production",
      fastProductionDesc: "We prepare your order in 2-3 business days",

      // FAQ Section
      faqTitle: "Frequently Asked Questions",
      faqSubtitle: "Answers to popular questions about our services",
      faqQuestion1: "How long does it take to create a photobook?",
      faqAnswer1: "Standard production time is 2-3 business days. For urgent orders, express service is available - production within 24 hours.",
      faqQuestion2: "What quality is the printing?",
      faqAnswer2: "We use professional equipment and premium materials. Printing is done on thick photo paper with 300 DPI resolution.",
      faqQuestion3: "Can I change my order after placing it?",
      faqAnswer3: "Changes are possible within 2 hours after placing the order, before it goes into production. Contact our support team.",
      faqQuestion4: "What photo formats are supported?",
      faqAnswer4: "JPEG, PNG, TIFF formats are supported. Recommended resolution is 1500x1500 pixels or higher for best print quality.",
      faqQuestion5: "Do you deliver to other countries?",
      faqAnswer5: "Currently we only deliver within Russia. We are working on expanding our delivery geography.",

      // Premium Services
      expressServiceTitle: "Photobook in One Day",
      expressServiceSubtitle: "Exclusive service for special events",
      expressServiceStep1: "Contract with photographer",
      expressServiceStep1Desc: "Professional shooting of your event",
      expressServiceStep2: "Creation in 3-4 hours",
      expressServiceStep2Desc: "Express processing and photobook design",
      expressServiceStep3: "Delivery to restaurant",
      expressServiceStep3Desc: "Ready photobook directly to your celebration",
      expressServicePrice: "from 15,000 ₽",
      expressServiceButton: "Order Express Service",

      arServiceTitle: "Living Photos",
      arServiceSubtitle: "Augmented reality in your photobooks",
      arServiceStep1: "Get the link",
      arServiceStep1Desc: "QR code to activate AR effects",
      arServiceStep2: "Scan the photo",
      arServiceStep2Desc: "Point your phone camera at the photograph",
      arServiceStep3: "Photo comes to life",
      arServiceStep3Desc: "Watch as the photo transforms into video",
      arServicePrice: "from 500 ₽ per photo",
      arServiceButton: "Learn more about AR",

      // Interactive Editor
      interactiveEditorTitle: "WOW Effect: Instant Creation",
      interactiveEditorSubtitle: "Drag photos and get a ready photobook in seconds",
      interactiveEditorMainTitle: "Interactive Photobook Editor",
      interactiveEditorDescription: "Drag photos and watch as a unique photobook is instantly created",
      interactiveEditorMagic: "Creation magic in seconds",
      interactiveEditorBadge1: "10 spreads",
      interactiveEditorBadge2: "Instantly",
      interactiveEditorBadge3: "Interactive",
      interactiveEditorHowTitle: "How does it work?",
      interactiveEditorHowSubtitle: "Three simple steps to a ready photobook",
      
      // Steps
      editorStep1Title: "🖼️ Drag photos",
      editorStep1Badge: "Drag & Drop",
      editorStep1Description: "Simply drag your favorite photos into the editor area. We support any formats!",
      editorStep1Feature: "Instant upload",
      
      editorStep2Title: "🎨 Automatic creation",
      editorStep2Badge: "AI Magic",
      editorStep2Description: "Our AI instantly creates 10 beautiful spreads with professional layout",
      editorStep2Feature: "Processing in 2-3 seconds",
      
      editorStep3Title: "📖 View and edit",
      editorStep3Badge: "Preview", 
      editorStep3Description: "Browse the ready spreads, then proceed to the full editor for detailed customization",
      editorStep3Feature: "Interactive preview",
      
      editorStep1: "Drag photos",
      editorStep1Desc: "Simply drag your favorite photos",
      editorStep2: "10 spreads in seconds",
      editorStep2Desc: "Algorithm instantly creates beautiful layout",
      editorStep3: "Browse and evaluate",
      editorStep3Desc: "View the result and make edits",
      editorStep4: "Register",
      editorStep4Desc: "Save the project and continue editing",
      tryEditorButton: "Try Editor"
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
