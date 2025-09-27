import { useState, useEffect } from 'react';
import { Banner } from '@shared/schema';

export function useBanners(targetPage?: string) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Не загружаем баннеры на админ-маршрутах
    const page = targetPage || (typeof window !== 'undefined' ? window.location.pathname : undefined);
    if (page && page.startsWith('/admin')) {
      setBanners([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchBanners = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (page) params.append('page', page);

        const response = await fetch(`/api/banners/active?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch banners');
        }

        const data = await response.json();
        setBanners(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching banners:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, [targetPage]);

  const trackImpression = async (banner: Banner) => {
    try {
      await fetch(`/api/banners/${banner.id}/impression`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: getSessionId(),
          pageUrl: window.location.href,
        }),
      });
    } catch (err) {
      console.error('Error tracking banner impression:', err);
    }
  };

  const trackClick = async (banner: Banner) => {
    try {
      await fetch(`/api/banners/${banner.id}/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: getSessionId(),
          pageUrl: window.location.href,
        }),
      });
    } catch (err) {
      console.error('Error tracking banner click:', err);
    }
  };

  return {
    banners,
    loading,
    error,
    trackImpression,
    trackClick,
  };
}

// Вспомогательная функция для получения session ID
function getSessionId(): string {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}