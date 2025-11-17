import React from 'react';
import { Block } from '@shared/schema';

interface ImageBlockRendererProps {
  block: Block;
}

export function ImageBlockRenderer({ block }: ImageBlockRendererProps) {
  const content = block.content as any || {};

  const imageUrl = content.imageUrl;
  const altText = content.altText || '';
  const caption = content.caption || '';
  const alignment = content.alignment || 'center';

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center mx-auto',
    right: 'text-right ml-auto'
  };

  if (!imageUrl) {
    return (
      <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        <p>Изображение не задано</p>
      </div>
    );
  }

  return (
    <figure className={`my-8 ${alignmentClasses[alignment as keyof typeof alignmentClasses]}`}>
      <img
        src={imageUrl}
        alt={altText}
        className="max-w-full h-auto rounded-lg shadow-lg"
        loading="lazy"
      />
      {caption && (
        <figcaption className="mt-4 text-sm text-gray-600 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}