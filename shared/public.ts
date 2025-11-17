import { z } from "zod";

// Photobook format types and constants
export type PhotobookFormat = "album" | "book" | "square";

export interface PhotobookSize {
  width: number;
  height: number;
  label: string;
}

export const PHOTOBOOK_SIZES: Record<PhotobookFormat, PhotobookSize[]> = {
  album: [
    { width: 20, height: 15, label: "20×15 см" },
    { width: 30, height: 20, label: "30×20 см" },
    { width: 35, height: 25, label: "35×25 см" },
    { width: 40, height: 30, label: "40×30 см" },
  ],
  book: [
    { width: 15, height: 20, label: "15×20 см" },
    { width: 20, height: 30, label: "20×30 см" },
    { width: 35, height: 25, label: "35×25 см" },
    { width: 30, height: 40, label: "30×40 см" },
  ],
  square: [
    { width: 20, height: 20, label: "20×20 см" },
    { width: 25, height: 25, label: "25×25 см" },
    { width: 30, height: 30, label: "30×30 см" },
  ],
};

export const PHOTOBOOK_FORMAT_LABELS: Record<PhotobookFormat, string> = {
  album: "Альбомный",
  book: "Книжный",
  square: "Квадратный",
};

// Helper function to calculate additional spread price (10% of base price)
export const calculateAdditionalSpreadPrice = (basePrice: number): number => {
  return Math.round(basePrice * 0.1);
};

// Helper function to format size as string
export const formatPhotobookSize = (size: PhotobookSize): string => {
  return `${size.width}x${size.height}`;
};

// AR (Augmented Reality) pricing and settings
export const AR_ADDON_PRICE = {
  AMD: 2000,  // 2000 драм
  USD: 5,     // $5
  RUB: 500,   // 500 руб
};

export const formatARPrice = (currencyCode: string): string => {
  const price = AR_ADDON_PRICE[currencyCode as keyof typeof AR_ADDON_PRICE] || AR_ADDON_PRICE.AMD;
  return `${price}`;
};

// Color theme definitions
export interface ColorTheme {
  name: string;
  label: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
  };
}

// Currency definitions and helpers
export const SUPPORTED_CURRENCIES = [
  {
    code: 'AMD' as const,
    name: { ru: 'Армянский драм', hy: 'Հայկական դրամ', en: 'Armenian Dram' },
    symbol: '֏',
    isBaseCurrency: true,
    sortOrder: 1,
  },
  {
    code: 'USD' as const,
    name: { ru: 'Доллар США', hy: 'ԱՄՆ դոլար', en: 'US Dollar' },
    symbol: '$',
    isBaseCurrency: false,
    sortOrder: 2,
  },
  {
    code: 'RUB' as const,
    name: { ru: 'Российский рубль', hy: 'Ռուսական ռուբլի', en: 'Russian Ruble' },
    symbol: '₽',
    isBaseCurrency: false,
    sortOrder: 3,
  },
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]['code'];

export const formatCurrency = (amount: number | string, currencyCode: SupportedCurrency, locale: string = 'en'): string => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  if (!currency) return `${amount}`;
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${amount}`;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: currencyCode === 'USD' ? 2 : 0,
    maximumFractionDigits: currencyCode === 'USD' ? 2 : 0,
  }).format(numAmount);
  return `${formatted} ${currency.symbol}`;
};

export const BUILT_IN_THEMES: Record<string, ColorTheme> = {
  default: {
    name: "default",
    label: "По умолчанию",
    description: "Стандартная цветовая схема PhotoBooksGallery",
    colors: {
      primary: "hsl(222.2, 84%, 4.9%)",
      secondary: "hsl(210, 40%, 96%)",
      accent: "hsl(210, 40%, 94%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(0, 0%, 98%)",
      text: "hsl(222.2, 84%, 4.9%)",
      textMuted: "hsl(215.4, 16.3%, 46.9%)",
      border: "hsl(214.3, 31.8%, 91.4%)",
    },
  },
  premium: {
    name: "premium",
    label: "Премиум",
    description: "Editorial: ivory, graphite, gold",
    colors: {
      primary: "#1C1C1C",
      secondary: "#153E35",
      accent: "#C9A227",
      background: "#F6F3EE",
      surface: "#FFFFFF",
      text: "#1C1C1C",
      textMuted: "#8C8C8C",
      border: "#E6E1D9",
    },
  },
  ocean: {
    name: "ocean",
    label: "Океан",
    description: "Прохладные морские оттенки",
    colors: {
      primary: "hsl(200, 95%, 25%)",
      secondary: "hsl(200, 50%, 95%)",
      accent: "hsl(190, 70%, 88%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(195, 20%, 98%)",
      text: "hsl(200, 95%, 25%)",
      textMuted: "hsl(200, 30%, 50%)",
      border: "hsl(200, 20%, 85%)",
    },
  },
  sunset: {
    name: "sunset",
    label: "Закат",
    description: "Теплые оранжевые и красные тона",
    colors: {
      primary: "hsl(15, 85%, 40%)",
      secondary: "hsl(25, 60%, 95%)",
      accent: "hsl(35, 80%, 90%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(25, 30%, 98%)",
      text: "hsl(15, 85%, 30%)",
      textMuted: "hsl(20, 40%, 55%)",
      border: "hsl(25, 30%, 85%)",
    },
  },
  forest: {
    name: "forest",
    label: "Лес",
    description: "Природные зеленые оттенки",
    colors: {
      primary: "hsl(140, 50%, 30%)",
      secondary: "hsl(120, 40%, 95%)",
      accent: "hsl(130, 60%, 90%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(120, 20%, 98%)",
      text: "hsl(140, 50%, 25%)",
      textMuted: "hsl(130, 25%, 50%)",
      border: "hsl(120, 20%, 85%)",
    },
  },
  purple: {
    name: "purple",
    label: "Фиолетовый",
    description: "Элегантные фиолетовые тона",
    colors: {
      primary: "hsl(270, 60%, 40%)",
      secondary: "hsl(280, 40%, 95%)",
      accent: "hsl(275, 70%, 90%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(280, 20%, 98%)",
      text: "hsl(270, 60%, 35%)",
      textMuted: "hsl(275, 30%, 55%)",
      border: "hsl(280, 20%, 85%)",
    },
  },
  cosmic: {
    name: "cosmic",
    label: "Космос",
    description: "Темная космическая тема со звездными акцентами",
    colors: {
      primary: "hsl(250, 80%, 60%)",
      secondary: "hsl(220, 20%, 15%)",
      accent: "hsl(280, 100%, 70%)",
      background: "hsl(220, 25%, 8%)",
      surface: "hsl(220, 20%, 12%)",
      text: "hsl(0, 0%, 95%)",
      textMuted: "hsl(220, 15%, 65%)",
      border: "hsl(220, 20%, 25%)",
    },
  },
  rainbow: {
    name: "rainbow",
    label: "Радуга",
    description: "Яркие многоцветные акценты",
    colors: {
      primary: "hsl(340, 85%, 55%)",
      secondary: "hsl(60, 85%, 95%)",
      accent: "hsl(180, 85%, 85%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(60, 20%, 98%)",
      text: "hsl(340, 85%, 25%)",
      textMuted: "hsl(220, 15%, 45%)",
      border: "hsl(180, 30%, 80%)",
    },
  },
};

// A lightweight product insert schema for frontend forms (no Drizzle dependency)
export const insertProductFormSchema = z.object({
  name: z.object({
    ru: z.string().optional(),
    hy: z.string().optional(),
    en: z.string().optional(),
  }).optional(),
  description: z.object({
    ru: z.string().optional(),
    hy: z.string().optional(),
    en: z.string().optional(),
  }).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  currencyId: z.string().optional(),
  price: z.union([z.string(), z.number()]).transform((val) => String(val)),
  originalPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  inStock: z.boolean().optional(),
  stockQuantity: z.number().min(0).optional(),
  isOnSale: z.boolean().optional(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  videoUrl: z.string().refine((val) => {
    if (!val || val === "") return true;
    if (val.startsWith("/")) return true;
    try { new URL(val); return true; } catch { return false; }
  }, "Некорректный URL видео или путь к файлу").nullable().optional(),
  videos: z.array(z.string()).optional(),
  photobookFormat: z.string().optional(),
  photobookSize: z.string().optional(),
  minSpreads: z.number().min(1).optional(),
  additionalSpreadPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  additionalSpreadCurrencyId: z.string().optional(),
  paperType: z.string().optional(),
  coverMaterial: z.string().optional(),
  bindingType: z.string().optional(),
  productionTime: z.number().min(1).optional(),
  shippingTime: z.number().min(1).optional(),
  weight: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  allowCustomization: z.boolean().optional(),
  isReadyMade: z.boolean().optional(),
  minCustomPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  minCustomPriceCurrencyId: z.string().optional(),
  costPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  costCurrencyId: z.string().optional(),
  materialCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  laborCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  overheadCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  shippingCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  otherCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  expectedProfitMargin: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "30" : String(val)).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  hashtags: z.object({
    ru: z.array(z.string()).optional(),
    hy: z.array(z.string()).optional(),
    en: z.array(z.string()).optional(),
  }).optional(),
  specialPages: z.array(z.enum(['graduation-albums', 'premium-gifts', 'one-day-books'])).optional(),
});

export type InsertProductForm = z.infer<typeof insertProductFormSchema>;
