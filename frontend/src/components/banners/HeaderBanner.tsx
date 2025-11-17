import React from 'react';
import { Banner } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface HeaderBannerProps {
  banner: Banner;
  onClick: (banner: Banner) => void;
  onClose: (banner: Banner) => void;
}

export function HeaderBanner({ banner, onClick, onClose }: HeaderBannerProps) {
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
      className="fixed top-0 left-0 right-0 z-50 shadow-lg"
      style={style}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex-1">
          {banner.imageUrl && (
            <img
              src={banner.imageUrl}
              alt={title}
              className="h-8 mr-4 inline-block"
            />
          )}
          <div className="inline-block">
            {title && <div className="font-semibold text-sm">{title}</div>}
            {content && <div className="text-xs opacity-90">{content}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {buttonText && (
            <Button
              size="sm"
              onClick={() => onClick(banner)}
              style={{
                backgroundColor: banner.textColor || '#000000',
                color: banner.backgroundColor || '#ffffff'
              }}
            >
              {buttonText}
            </Button>
          )}
          <button
            onClick={() => onClose(banner)}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}