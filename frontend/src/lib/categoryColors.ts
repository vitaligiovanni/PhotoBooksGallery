// Система цветов для категорий товаров
export const CATEGORY_COLORS = {
  // Свадебные фотокниги
  wedding: {
    gradient: 'from-pink-50 to-rose-50',
    border: 'border-pink-200',
    accent: 'text-pink-600',
    badge: 'bg-pink-500 text-white',
    hover: 'hover:from-pink-100 hover:to-rose-100',
  },
  
  // Путешествия
  travel: {
    gradient: 'from-blue-50 to-cyan-50',
    border: 'border-blue-200', 
    accent: 'text-blue-600',
    badge: 'bg-blue-500 text-white',
    hover: 'hover:from-blue-100 hover:to-cyan-100',
  },
  
  // Семейные
  family: {
    gradient: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    accent: 'text-green-600',
    badge: 'bg-green-500 text-white',
    hover: 'hover:from-green-100 hover:to-emerald-100',
  },
  
  // Подарочные
  gift: {
    gradient: 'from-amber-50 to-yellow-50',
    border: 'border-amber-200',
    accent: 'text-amber-600',
    badge: 'bg-amber-500 text-white',
    hover: 'hover:from-amber-100 hover:to-yellow-100',
  },
  
  // Классические/корпоративные
  classic: {
    gradient: 'from-gray-50 to-slate-50',
    border: 'border-gray-200',
    accent: 'text-gray-600',
    badge: 'bg-gray-500 text-white',
    hover: 'hover:from-gray-100 hover:to-slate-100',
  },
  
  // Детские
  kids: {
    gradient: 'from-purple-50 to-violet-50',
    border: 'border-purple-200',
    accent: 'text-purple-600',
    badge: 'bg-purple-500 text-white',
    hover: 'hover:from-purple-100 hover:to-violet-100',
  },
  
  // По умолчанию
  default: {
    gradient: 'from-white to-gray-50',
    border: 'border-gray-200',
    accent: 'text-gray-600',
    badge: 'bg-gray-500 text-white',
    hover: 'hover:from-gray-50 hover:to-gray-100',
  }
} as const;

// Определение категории по slug или названию
export function getCategoryColorBySlug(slug: string): keyof typeof CATEGORY_COLORS {
  const slugLower = slug.toLowerCase();
  
  if (slugLower.includes('wedding') || slugLower.includes('свадеб') || slugLower.includes('свадьб')) {
    return 'wedding';
  }
  if (slugLower.includes('travel') || slugLower.includes('путешеств') || slugLower.includes('туризм')) {
    return 'travel';
  }
  if (slugLower.includes('family') || slugLower.includes('семей') || slugLower.includes('семья')) {
    return 'family';
  }
  if (slugLower.includes('gift') || slugLower.includes('подарок') || slugLower.includes('подарочн')) {
    return 'gift';
  }
  if (slugLower.includes('kid') || slugLower.includes('детск') || slugLower.includes('ребенок')) {
    return 'kids';
  }
  if (slugLower.includes('classic') || slugLower.includes('корпорат') || slugLower.includes('бизнес')) {
    return 'classic';
  }
  
  return 'default';
}

// Получение цветовой схемы для категории
export function getCategoryColors(slug: string) {
  const colorKey = getCategoryColorBySlug(slug);
  return CATEGORY_COLORS[colorKey];
}

// Типы для TypeScript
export type CategoryColorKey = keyof typeof CATEGORY_COLORS;
export type CategoryColorScheme = typeof CATEGORY_COLORS[CategoryColorKey];