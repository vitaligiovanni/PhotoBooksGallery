import React from 'react';
import { Block } from '@shared/schema';

interface GalleryBlockRendererProps {
  block: Block;
}

export function GalleryBlockRenderer({ block }: GalleryBlockRendererProps) {
  const content = block.content as any || {};

  const images = content.images || [];
  const columns = content.columns || 3;

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  if (!images || images.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        <p>Изображения не заданы</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${gridClasses[columns as keyof typeof gridClasses] || gridClasses[3]}`}>
      {images.map((image: any, index: number) => (
        <div key={index} className="group relative overflow-hidden rounded-lg">
          <img
            src={typeof image === 'string' ? image : image.url}
            alt={typeof image === 'object' ? image.alt || '' : `Gallery image ${index + 1}`}
            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300" />
        </div>
      ))}
    </div>
  );
}