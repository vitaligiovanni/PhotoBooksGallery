// src/pages/admin/banners.tsx
import React, { useState, useEffect } from 'react';
import { Banner } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function BannerAdminPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/banners');
      const data = await response.json();
      setBanners(data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBannerStatus = async (bannerId: string) => {
    try {
      const response = await fetch(`/api/banners/${bannerId}/toggle`, {
        method: 'PATCH',
      });

      if (response.ok) {
        fetchBanners(); // Перезагрузить список
      }
    } catch (error) {
      console.error('Error toggling banner status:', error);
    }
  };

  const deleteBanner = async (bannerId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот баннер?')) return;

    try {
      const response = await fetch(`/api/banners/${bannerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBanners(); // Перезагрузить список
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };

  const getStatusBadge = (banner: Banner) => {
    if (!banner.isActive) return <Badge variant="secondary">Неактивен</Badge>;
    if (banner.status === 'active') return <Badge variant="default">Активен</Badge>;
    if (banner.status === 'draft') return <Badge variant="outline">Черновик</Badge>;
    return <Badge variant="destructive">Приостановлен</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const types = {
      header: 'Верхний',
      fullscreen: 'Полноэкранный',
      sidebar: 'Боковой',
      inline: 'Встроенный',
      popup: 'Попап'
    };
    return types[type as keyof typeof types] || type;
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление баннерами</h1>
        <Button>Создать баннер</Button>
      </div>

      <div className="grid gap-4">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{banner.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(banner)}
                    <Badge variant="outline">{getTypeLabel(banner.type)}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleBannerStatus(banner.id)}
                  >
                    {banner.isActive ? 'Деактивировать' : 'Активировать'}
                  </Button>
                  <Button size="sm" variant="outline">
                    Редактировать
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteBanner(banner.id)}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Показы:</span> {banner.currentImpressions || 0}
                </div>
                <div>
                  <span className="font-medium">Клики:</span> {banner.currentClicks || 0}
                </div>
                <div>
                  <span className="font-medium">CTR:</span> {
                    banner.currentImpressions ?
                    ((banner.currentClicks || 0) / banner.currentImpressions * 100).toFixed(1) + '%' :
                    '0%'
                  }
                </div>
                <div>
                  <span className="font-medium">Приоритет:</span> {banner.priority}
                </div>
              </div>

              {banner.title && (
                <div className="mt-4">
                  <span className="font-medium">Заголовок:</span> {
                    typeof banner.title === 'string' ?
                    banner.title :
                    (banner.title as any).ru || Object.values(banner.title as any)[0]
                  }
                </div>
              )}

              {banner.endDate && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">До:</span> {new Date(banner.endDate).toLocaleDateString('ru-RU')}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}