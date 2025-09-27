import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { getCategoryColors } from "@/lib/categoryColors";
import type { Category } from "@shared/schema";
import type { LocalizedText } from "@/types";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const { t, i18n } = useTranslation();
  
  const name = (category.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || 'Untitled';
  const description = (category.description as LocalizedText)?.[i18n.language as keyof LocalizedText] || '';
  
  // Получаем цветовую схему для категории
  const colors = getCategoryColors(category.slug);

  return (
    <Link href={`/catalog/${category.slug}`}>
      <Card className={`card-hover cursor-pointer border-0 bg-gradient-to-br ${colors.gradient} ${colors.hover} shadow-sm rounded-2xl overflow-hidden ${colors.border}`} data-testid={`card-category-${category.slug}`}>
        <CardContent className="p-0">
          <div className="relative overflow-hidden">
            <div className="aspect-square overflow-hidden">
              <img 
                src={category.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200'} 
                alt={name}
                className="w-full h-full object-cover"
                data-testid={`img-category-${category.slug}`}
                onError={(e) => {
                  console.log('Category image load error for:', category.imageUrl);
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200';
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            
            {/* Цветной бейдж категории */}
            <div className="absolute top-3 left-3">
              <Badge className={`${colors.badge} text-xs font-semibold`}>
                {name}
              </Badge>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="font-serif text-2xl font-bold mb-1 drop-shadow-lg" data-testid={`text-category-name-${category.slug}`}>
                {name}
              </h3>
              {description && (
                <p className="text-white/90 text-sm leading-relaxed drop-shadow" data-testid={`text-category-description-${category.slug}`}>
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <div className="p-6 text-center">
            <span className={`link-animate inline-flex items-center ${colors.accent} font-semibold text-lg`}>
              {t('viewAll')} 
              <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-300" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
