import React from 'react';
import { Block } from '@shared/schema';

interface HeroBlockRendererProps {
  block: Block;
}

export function HeroBlockRenderer({ block }: HeroBlockRendererProps) {
  const content = block.content as any || {};

  // Get localized content
  const getLocalizedContent = (field: string, lang: string = 'ru') => {
    const fieldValue = content[field];
    if (typeof fieldValue === 'string') return fieldValue;
    if (fieldValue && typeof fieldValue === 'object') return fieldValue[lang] || fieldValue.ru || '';
    return '';
  };

  const title = getLocalizedContent('title');
  const subtitle = getLocalizedContent('subtitle');
  const buttonText = getLocalizedContent('buttonText');
  const buttonLink = content.buttonLink || '/';
  const backgroundImage = content.backgroundImage;
  const alignment = content.alignment || 'center';
  const overlayOpacity = content.overlayOpacity || 0.5;
  const textColor = content.textColor || '#ffffff';

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  return (
    <section
      className={`relative min-h-[60vh] flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 ${alignmentClasses[alignment as keyof typeof alignmentClasses]}`}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {title && (
            <h1
              className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
              style={{ color: textColor }}
            >
              {title}
            </h1>
          )}

          {subtitle && (
            <p
              className="text-xl md:text-2xl mb-8 opacity-90"
              style={{ color: textColor }}
            >
              {subtitle}
            </p>
          )}

          {buttonText && (
            <a
              href={buttonLink}
              className="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}