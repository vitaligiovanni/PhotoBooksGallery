import 'dotenv/config';
import { BannerService } from './server/bannerService';

async function main() {
  try {
    const now = new Date();
    const banner = await BannerService.createBanner({
      name: `E2E Test Banner / ${now.toISOString()}`,
      type: 'header' as any,
      title: { ru: 'E2E Баннер', en: 'E2E Banner', hy: 'E2E Բաններ' } as any,
      content: { ru: 'Проверка показа на главной', en: 'Homepage check', hy: 'Գլխավոր ստուգում' } as any,
      imageUrl: '',
      buttonText: { ru: 'Открыть', en: 'Open', hy: 'Բացել' } as any,
      buttonLink: '/',
      backgroundColor: '#111827',
      textColor: '#ffffff',
      position: 'top',
      size: null as any,
      priority: 999,
      isActive: true,
      status: 'active' as any,
      startDate: null as any,
      endDate: null as any,
      targetPages: ['/', '/home'],
      targetUsers: 'all',
      maxImpressions: null as any,
      maxClicks: null as any,
    } as any);

    const actives = await BannerService.getActiveBanners('/')
    const found = actives.find(b => b.id === banner.id) || actives[0];

    console.log('Active banners for /:', actives.map(b => ({ id: b.id, name: b.name, isActive: b.isActive, status: b.status, targetPages: b.targetPages })));
    if (found) {
      console.log('OK: Active banner present. Example:', { id: found.id, name: found.name });
      process.exit(0);
    } else {
      console.error('FAIL: No active banners for / after seeding.');
      process.exit(1);
    }
  } catch (e) {
    console.error('Error in test-banners-api:', e);
    process.exit(1);
  }
}

main();
