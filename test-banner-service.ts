import { BannerService } from './server/bannerService.ts';

async function testBannerService() {
  try {
    console.log('🔍 Тестируем BannerService.getActiveBanners...');
  // Second argument should be string | undefined; avoid passing null
  const banners = await BannerService.getActiveBanners('/', undefined);
    console.log('📊 Найдено баннеров:', banners.length);

    if (banners.length > 0) {
      banners.forEach((banner, index) => {
        console.log(`🎯 Баннер ${index + 1}:`, {
          id: banner.id,
          name: banner.name,
          type: banner.type,
          isActive: banner.isActive,
          status: banner.status,
          startDate: banner.startDate,
          endDate: banner.endDate,
          targetPages: banner.targetPages
        });
      });
    } else {
      console.log('❌ Активных баннеров не найдено');
    }
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    console.error('❌ Ошибка:', err?.message ?? String(error));
    console.error('Stack:', err?.stack);
  }
}

testBannerService();