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
      startCreating: "Начать создание"
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
      startCreating: "Սկսել ստեղծումը"
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
      startCreating: "Start Creating"
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
