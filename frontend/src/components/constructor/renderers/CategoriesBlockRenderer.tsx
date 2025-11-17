import React from 'react';
import { Block } from '@shared/schema';

interface Category {
  id: string;
  name: { ru: string; en: string; hy: string };
  imageUrl?: string;
  link: string;
  description?: { ru: string; en: string; hy: string };
}

interface CategoriesBlockRendererProps {
  block: Block;
}

export function CategoriesBlockRenderer({ block }: CategoriesBlockRendererProps) {
  const content = block.content as any || {};

  // Get localized content
  const getLocalizedContent = (field: string, lang: string = 'ru') => {
    const fieldValue = content[field];
    if (typeof fieldValue === 'string') return fieldValue;
    if (fieldValue && typeof fieldValue === 'object') return fieldValue[lang] || fieldValue.ru || '';
    return '';
  };

  const title = getLocalizedContent('title');
  const categories = content.categories || [];
  const columns = content.columns || 3;
  const showDescription = content.showDescription !== false;

  // Determine grid classes based on number of columns
  const getGridClasses = (cols: number) => {
    switch (cols) {
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  if (!categories || categories.length === 0) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <p className="text-gray-500">Категории не настроены</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="container mx-auto">
        {title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {title}
            </h2>
            <div className="w-24 h-1 bg-blue-600 mx-auto"></div>
          </div>
        )}

        <div className={`grid ${getGridClasses(columns)} gap-8`}>
          {categories.map((category: Category) => {
            const categoryName = getLocalizedContent('name', 'ru') || category.name?.ru || 'Категория';
            const categoryDescription = showDescription ? (getLocalizedContent('description', 'ru') || category.description?.ru) : null;
            const categoryLink = category.link || '#';

            return (
              <div
                key={category.id}
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
              >
                <a href={categoryLink} className="block h-full">
                  {/* Image */}
                  {category.imageUrl && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={category.imageUrl}
                        alt={categoryName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {categoryName}
                    </h3>

                    {categoryDescription && (
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {categoryDescription}
                      </p>
                    )}

                    {/* Arrow indicator */}
                    <div className="flex items-center text-blue-600 font-medium">
                      <span>Посмотреть</span>
                      <svg
                        className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}