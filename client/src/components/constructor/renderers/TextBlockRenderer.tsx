import React from 'react';
import { Block } from '@shared/schema';

interface TextBlockRendererProps {
  block: Block;
}

export function TextBlockRenderer({ block }: TextBlockRendererProps) {
  const content = block.content as any || {};

  // Get localized content
  const getLocalizedContent = (field: string, lang: string = 'ru') => {
    const fieldValue = content[field];
    if (typeof fieldValue === 'string') return fieldValue;
    if (fieldValue && typeof fieldValue === 'object') return fieldValue[lang] || fieldValue.ru || '';
    return '';
  };

  const textContent = getLocalizedContent('content');
  const alignment = content.alignment || 'left';

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  };

  if (!textContent) {
    return (
      <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        <p>Текст не задан</p>
      </div>
    );
  }

  return (
    <div
      className={`prose prose-lg max-w-none ${alignmentClasses[alignment as keyof typeof alignmentClasses]}`}
      dangerouslySetInnerHTML={{ __html: textContent }}
    />
  );
}