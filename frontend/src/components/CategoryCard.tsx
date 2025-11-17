import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { useLocation } from "wouter";
import { getCategoryColors } from "@/lib/categoryColors";
import type { Category } from "@shared/schema";
import type { LocalizedText } from "@/types";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  
  // Улучшенная логика получения локализованного названия
  const getLocalizedText = (textField: any, fallbackLang = 'ru') => {
    if (!textField) return '';
    
    // Если это строка, возвращаем как есть
    if (typeof textField === 'string') return textField;
    
    // Пытаемся получить перевод для текущего языка
    if (textField[i18n.language]) return textField[i18n.language];
    
    // Пытаемся получить из поля translations
    if (textField.translations && textField.translations[i18n.language]) {
      return textField.translations[i18n.language].name || textField.translations[i18n.language];
    }
    
    // Fallback к русскому языку
    if (textField[fallbackLang]) return textField[fallbackLang];
    
    // Если есть translations с русским
    if (textField.translations && textField.translations[fallbackLang]) {
      return textField.translations[fallbackLang].name || textField.translations[fallbackLang];
    }
    
    return '';
  };
  
  // Получаем название и описание с улучшенной логикой
  let name = getLocalizedText(category.name);
  
  // Если название пустое, пробуем получить из translations напрямую
  if (!name && category.translations) {
    const langTranslation = (category.translations as any)[i18n.language];
    if (langTranslation && typeof langTranslation === 'object') {
      name = langTranslation.name || '';
    }
  }
  
  // Последний fallback
  if (!name) {
    name = 'Untitled';
  }
  

  
  // Проверяем, является ли это подкатегорией
  const isSubcategory = Boolean(category.parentId);
  
  // Получаем цветовую схему для категории
  const colors = getCategoryColors(category.slug);

  // Определяем правильный URL в зависимости от типа категории
  const categoryUrl = isSubcategory 
    ? `/catalog?subcategory=${category.slug}`
    : `/catalog?category=${category.slug}`;

  const handleNavigate = (e: React.MouseEvent) => {
    try {
      // Если клик пришелся на интерактивный элемент внутри - пропускаем
      const tag = (e.target as HTMLElement).tagName;
      if (["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      e.preventDefault();
      console.log('[CategoryCard] navigate click', { id: category.id, slug: category.slug, isSubcategory, categoryUrl });
      navigate(categoryUrl);
    } catch (err) {
      console.error('[CategoryCard] navigation error', err);
    }
  };

  return (
      <Card 
        role="button"
        tabIndex={0}
        onClick={handleNavigate}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavigate(e as any); } }}
        aria-label={`Open category ${name}`}
        className={`category-card group relative card-hover cursor-pointer border-0 bg-gradient-to-br ${colors.gradient} ${colors.hover} shadow-sm rounded-2xl overflow-hidden ${colors.border} transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`} 
        data-testid={`card-category-${category.slug}`}
        data-category-id={category.id}
        data-category-slug={category.slug}
        data-subcategory={isSubcategory ? 'true' : 'false'}
        data-url={categoryUrl}
      >
        <CardContent className="p-0">
          <div className="relative overflow-hidden">
            <div className="aspect-square overflow-hidden">
              <img 
                src={(category as any).coverImage || category.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200'} 
                alt={name}
                className="w-full h-full object-cover"
                data-testid={`img-category-${category.slug}`}
                onError={(e) => {
                  console.log('Category image load error for:', (category as any).coverImage || category.imageUrl);
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200';
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            
            {/* Цветной бейдж категории */}
            <div className="absolute top-3 left-3">
              <Badge className={`${colors.badge} text-xs font-semibold`}>
                {isSubcategory ? "📂 " : ""}{name}
              </Badge>
            </div>
            
          </div>
          
          <div className="p-6 text-center pointer-events-none select-none">
            <h3 className="font-serif text-xl font-bold mb-2 text-foreground" data-testid={`text-category-name-${category.slug}`}>
              {name}
            </h3>
          </div>
        </CardContent>
        {/* Hidden debug overlay (toggle-able via CSS if needed) */}
        <span className="sr-only">{categoryUrl}</span>
      </Card>
  );
}
