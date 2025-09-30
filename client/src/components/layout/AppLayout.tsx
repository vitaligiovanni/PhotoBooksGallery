// src/components/layout/AppLayout.tsx
import React from 'react';
import { lazy, Suspense } from 'react';
import { useLocation } from 'wouter';
const BannerManager = lazy(() => import('@/components/banners').then(m => ({ default: m.BannerManager })));
import { useBanners } from '@/hooks/useBanners';
import type { Banner } from '@shared/schema';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Подписываемся на изменения маршрута через wouter, чтобы корректно скрывать баннеры в админке
  const [location] = useLocation();
  const currentPath = location || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const isAdmin = currentPath.startsWith('/admin');

  // Передаем актуальный путь, чтобы перезапрашивать баннеры при смене маршрута
  const { banners, loading, error, trackImpression, trackClick } = useBanners(currentPath);

  const handleBannerImpression = (banner: Banner) => {
    console.log('Banner impression:', banner.name);
    trackImpression(banner);
  };

  const handleBannerClick = (banner: Banner) => {
    console.log('Banner click:', banner.name);
    trackClick(banner);
    // Дополнительная логика (например, аналитика)
  };

  const handleBannerClose = (banner: Banner) => {
    console.log('Banner closed:', banner.name);
    // Можно отправить событие в аналитику
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      {/* Баннеры: показываем, если уже есть что показать (не скрываем во время повторной загрузки) */}
      {!isAdmin && banners.length > 0 && (
        <Suspense fallback={null}>
          <BannerManager
            banners={banners}
            onBannerClick={handleBannerClick}
            onBannerClose={handleBannerClose}
            onBannerImpression={handleBannerImpression}
          />
        </Suspense>
      )}

      {/* Основной контент */}
      <main className="w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}