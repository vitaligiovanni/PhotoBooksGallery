import React from 'react';
import { Block } from '@shared/schema';

interface ButtonBlockRendererProps {
  block: Block;
}

export function ButtonBlockRenderer({ block }: ButtonBlockRendererProps) {
  const content = block.content as any || {};

  // Get localized content
  const getLocalizedContent = (field: string, lang: string = 'ru') => {
    const fieldValue = content[field];
    if (typeof fieldValue === 'string') return fieldValue;
    if (fieldValue && typeof fieldValue === 'object') return fieldValue[lang] || fieldValue.ru || '';
    return '';
  };

  const buttonText = getLocalizedContent('buttonText') || 'Кнопка';
  const buttonLink = content.buttonLink || '#';
  const buttonVariant = content.buttonVariant || 'primary';
  const buttonSize = content.buttonSize || 'medium';
  const buttonColor = content.buttonColor || '#3b82f6';
  const alignment = content.alignment || 'center';

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white',
    ghost: 'text-blue-600 hover:bg-blue-100'
  };

  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg'
  };

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  return (
    <div className={`my-8 ${alignmentClasses[alignment as keyof typeof alignmentClasses]}`}>
      <a
        href={buttonLink}
        className={`inline-block rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
          variantClasses[buttonVariant as keyof typeof variantClasses] || variantClasses.primary
        } ${
          sizeClasses[buttonSize as keyof typeof sizeClasses] || sizeClasses.medium
        }`}
        style={buttonVariant === 'custom' ? { backgroundColor: buttonColor } : undefined}
      >
        {buttonText}
      </a>
    </div>
  );
}