import React, { useState, useEffect } from 'react';
import { Banner } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BannerManagerProps {
  banners: Banner[];
  onBannerClick: (banner: Banner) => void;
  onBannerClose: (banner: Banner) => void;
  onBannerImpression: (banner: Banner) => void;
}

export function BannerManager({
  banners,
  onBannerClick,
  onBannerClose,
  onBannerImpression
}: BannerManagerProps) {
  const [visibleBanners, setVisibleBanners] = useState<Banner[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Фильтруем активные баннеры и исключаем закрытые
    const activeBanners = banners.filter(banner =>
      banner.isActive &&
      banner.status === 'active' &&
      !dismissedBanners.has(banner.id) &&
      (!banner.maxImpressions || (banner.currentImpressions ?? 0) < banner.maxImpressions)
    );

    setVisibleBanners(activeBanners);

    // Отмечаем показы баннеров на следующем тике, чтобы избежать артефактов мерцания
    if (activeBanners.length > 0) {
      queueMicrotask(() => {
        activeBanners.forEach(banner => {
          onBannerImpression(banner);
        });
      });
    }
  }, [banners, dismissedBanners, onBannerImpression]);

  const handleClose = (banner: Banner) => {
    setDismissedBanners(prev => new Set(Array.from(prev).concat(banner.id)));
    onBannerClose(banner);
  };

  const handleClick = (banner: Banner) => {
    onBannerClick(banner);
    if (banner.buttonLink) {
      window.location.href = banner.buttonLink;
    }
  };

  const renderBanner = (banner: Banner) => {
    const style = {
      backgroundColor: banner.backgroundColor || '#ffffff',
      color: banner.textColor || '#000000',
      ...(banner.size && typeof banner.size === 'object' && 'width' in banner.size && 'height' in banner.size ? {
        width: `${(banner.size as any).width}px`,
        height: `${(banner.size as any).height}px`
      } : {})
    };

    const getLocalizedContent = (field: string, lang: string = 'ru') => {
      const fieldValue = banner[field as keyof Banner];
      if (typeof fieldValue === 'string') return fieldValue;
      if (fieldValue && typeof fieldValue === 'object') return (fieldValue as any)[lang] || (fieldValue as any).ru || '';
      return '';
    };

    const title = getLocalizedContent('title');
    const content = getLocalizedContent('content');
    const buttonText = getLocalizedContent('buttonText');

    switch (banner.type) {
      case 'popup':
        return (
          <div
            key={banner.id}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <div
              className="mx-4 w-full max-w-md rounded-lg shadow-xl p-6 relative"
              style={style}
            >
              <button
                onClick={() => handleClose(banner)}
                className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
              {banner.imageUrl && (
                <img
                  src={banner.imageUrl}
                  alt={title}
                  className="w-full h-32 object-cover rounded mb-4"
                />
              )}
              {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
              {content && <p className="text-sm opacity-90 mb-4">{content}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleClose(banner)}>
                  Закрыть
                </Button>
                {buttonText && (
                  <Button onClick={() => handleClick(banner)}>
                    {buttonText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      case 'header':
        return (
          <div
            key={banner.id}
            className="fixed top-0 left-0 right-0 z-[90] shadow-lg"
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
                    onClick={() => handleClick(banner)}
                    style={{ backgroundColor: banner.backgroundColor || '#000000', color: banner.textColor || '#ffffff' }}
                  >
                    {buttonText}
                  </Button>
                )}
                <button
                  onClick={() => handleClose(banner)}
                  className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'fullscreen':
        return (
          <div
            key={banner.id}
            className="fixed inset-0 z-[100] flex items-center justify-center"
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
                    <Button onClick={() => handleClick(banner)}>
                      {buttonText}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleClose(banner)}
                  >
                    Закрыть
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'sidebar':
        const isLeft = banner.position === 'left';
        return (
          <div
            key={banner.id}
            className={`fixed top-1/2 -translate-y-1/2 z-[80] shadow-lg ${
              isLeft ? 'left-0' : 'right-0'
            }`}
            style={style}
          >
            <div className="p-4 max-w-xs">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  {title && <div className="font-semibold text-sm mb-1">{title}</div>}
                  {content && <div className="text-xs opacity-90">{content}</div>}
                </div>
                <button
                  onClick={() => handleClose(banner)}
                  className="p-1 hover:bg-black hover:bg-opacity-10 rounded ml-2"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {buttonText && (
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleClick(banner)}
                >
                  {buttonText}
                </Button>
              )}
            </div>
          </div>
        );

      case 'inline':
        return (
          <div
            key={banner.id}
            className="w-full p-4 rounded-lg shadow-md mb-4"
            style={style}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {banner.imageUrl && (
                  <img
                    src={banner.imageUrl}
                    alt={title}
                    className="h-12 mr-4 inline-block"
                  />
                )}
                <div className="inline-block">
                  {title && <div className="font-semibold">{title}</div>}
                  {content && <div className="text-sm opacity-90">{content}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {buttonText && (
                  <Button size="sm" onClick={() => handleClick(banner)}>
                    {buttonText}
                  </Button>
                )}
                <button
                  onClick={() => handleClose(banner)}
                  className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {visibleBanners.map(renderBanner)}
    </>
  );
}