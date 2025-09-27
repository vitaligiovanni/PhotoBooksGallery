import React from 'react';
import { Banner } from '@shared/schema';
import { Button } from '@/components/ui/button';

interface FullscreenBannerProps {
  banner: Banner;
  onClick: (banner: Banner) => void;
  onClose: (banner: Banner) => void;
}

export function FullscreenBanner({ banner, onClick, onClose }: FullscreenBannerProps) {
  const getLocalizedContent = (field: string, lang: string = 'ru') => {
    const fieldValue = banner[field as keyof Banner];
    if (typeof fieldValue === 'string') return fieldValue;
    if (fieldValue && typeof fieldValue === 'object') return (fieldValue as any)[lang] || (fieldValue as any).ru || '';
    return '';
  };

  const title = getLocalizedContent('title');
  const content = getLocalizedContent('content');
  const buttonText = getLocalizedContent('buttonText');

  const style = {
    backgroundColor: banner.backgroundColor || '#ffffff',
    color: banner.textColor || '#000000',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
    >
      <div
        className="max-w-md mx-4 p-6 rounded-lg shadow-xl"
        style={style}
      >
        <div className="text-center">
          {banner.imageUrl && (
            <img
              src={banner.imageUrl}
              alt={title}
              className="w-full h-32 object-cover rounded mb-4"
            />
          )}
          {title && <h3 className="text-xl font-bold mb-2">{title}</h3>}
          {content && <p className="mb-4 opacity-90">{content}</p>}
          <div className="flex gap-2 justify-center">
            {buttonText && (
              <Button onClick={() => onClick(banner)}>
                {buttonText}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onClose(banner)}
            >
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}