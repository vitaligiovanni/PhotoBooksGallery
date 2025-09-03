import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { Category } from "@shared/schema";
import type { LocalizedText } from "@/types";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const { t, i18n } = useTranslation();
  
  const name = (category.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || 'Untitled';
  const description = (category.description as LocalizedText)?.[i18n.language as keyof LocalizedText] || '';

  return (
    <Link href={`/catalog/${category.slug}`}>
      <Card className="category-card group cursor-pointer border-0 bg-gradient-to-br from-white via-white to-primary/5 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] rounded-2xl overflow-hidden" data-testid={`card-category-${category.slug}`}>
        <CardContent className="p-0">
          <div className="relative overflow-hidden">
            <div className="aspect-square overflow-hidden">
              <img 
                src={category.imageUrl 
                  ? (category.imageUrl.startsWith('/objects/') 
                      ? category.imageUrl 
                      : category.imageUrl.startsWith('https://storage.googleapis.com/') 
                        ? (() => {
                            // Преобразуем Google Storage URL в локальный путь
                            try {
                              const url = new URL(category.imageUrl);
                              const pathParts = url.pathname.split('/');
                              const privateIndex = pathParts.findIndex(part => part === '.private');
                              if (privateIndex !== -1 && privateIndex < pathParts.length - 2) {
                                const entityId = pathParts.slice(privateIndex + 2).join('/');
                                return `/objects/${entityId}`;
                              }
                              return category.imageUrl;
                            } catch {
                              return category.imageUrl;
                            }
                          })()
                        : category.imageUrl)
                  : 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200'
                } 
                alt={name}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                data-testid={`img-category-${category.slug}`}
                onError={(e) => {
                  console.log('Category image load error for:', category.imageUrl);
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200';
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
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
          
          <div className="p-6 text-center bg-gradient-to-b from-white to-gray-50/50">
            <span className="inline-flex items-center text-primary font-semibold text-lg group-hover:text-primary/80 transition-colors duration-300">
              {t('viewAll')} 
              <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
