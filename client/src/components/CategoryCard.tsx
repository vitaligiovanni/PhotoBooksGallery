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
      <Card className="category-card cursor-pointer border border-border hover:border-primary transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white/90 to-white/70 hover:from-white hover:to-white/90" data-testid={`card-category-${category.slug}`}>
        <CardContent className="p-6 text-center">
          <div className="aspect-square overflow-hidden rounded-lg mb-4">
            <img 
              src={category.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200'} 
              alt={name}
              className="w-full h-full object-cover"
              data-testid={`img-category-${category.slug}`}
            />
          </div>
          
          <h3 className="font-serif text-xl font-semibold text-foreground mb-2" data-testid={`text-category-name-${category.slug}`}>
            {name}
          </h3>
          
          {description && (
            <p className="text-muted-foreground text-sm mb-4" data-testid={`text-category-description-${category.slug}`}>
              {description}
            </p>
          )}
          
          <span className="inline-flex items-center text-primary font-medium">
            {t('viewAll')} <ArrowRight className="ml-2 h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
