import { storage } from './storage';
import { SUPPORTED_CURRENCIES } from '../../shared/schema';

export async function initializeCurrencies() {
  console.log('🔄 Инициализация валют...');
  
  try {
    // Проверяем, есть ли уже валюты в базе
    const existingCurrencies = await storage.getCurrencies();
    
    if (existingCurrencies.length > 0) {
      console.log(`✅ Валюты уже инициализированы (найдено ${existingCurrencies.length})`);
      return;
    }

    // Создаем валюты из предопределенного списка
    for (const currencyData of SUPPORTED_CURRENCIES) {
      const currency = await storage.createCurrency({
        code: currencyData.code,
        name: currencyData.name,
        symbol: currencyData.symbol,
        isBaseCurrency: currencyData.isBaseCurrency,
        isActive: true,
        sortOrder: currencyData.sortOrder,
      });
      
      console.log(`✅ Создана валюта: ${currencyData.code} (${currencyData.symbol})`);
    }

    // Создаем базовые курсы обмена
    const currencies = await storage.getCurrencies();
    const amd = currencies.find(c => c.code === 'AMD');
    const usd = currencies.find(c => c.code === 'USD');
    const rub = currencies.find(c => c.code === 'RUB');

    if (amd && usd && rub) {
      // AMD -> USD (примерный курс)
      await storage.createExchangeRate({
        fromCurrencyId: amd.id,
        toCurrencyId: usd.id,
        rate: '0.0026', // 1 AMD ≈ 0.0026 USD
        source: 'manual',
        isManual: true,
      });

      // USD -> AMD
      await storage.createExchangeRate({
        fromCurrencyId: usd.id,
        toCurrencyId: amd.id,
        rate: '385', // 1 USD ≈ 385 AMD
        source: 'manual',
        isManual: true,
      });

      // AMD -> RUB
      await storage.createExchangeRate({
        fromCurrencyId: amd.id,
        toCurrencyId: rub.id,
        rate: '0.25', // 1 AMD ≈ 0.25 RUB
        source: 'manual',
        isManual: true,
      });

      // RUB -> AMD
      await storage.createExchangeRate({
        fromCurrencyId: rub.id,
        toCurrencyId: amd.id,
        rate: '4', // 1 RUB ≈ 4 AMD
        source: 'manual',
        isManual: true,
      });

      // USD -> RUB
      await storage.createExchangeRate({
        fromCurrencyId: usd.id,
        toCurrencyId: rub.id,
        rate: '96', // 1 USD ≈ 96 RUB
        source: 'manual',
        isManual: true,
      });

      // RUB -> USD
      await storage.createExchangeRate({
        fromCurrencyId: rub.id,
        toCurrencyId: usd.id,
        rate: '0.0104', // 1 RUB ≈ 0.0104 USD
        source: 'manual',
        isManual: true,
      });

      console.log('✅ Созданы базовые курсы обмена валют');
    }

    console.log('🎉 Инициализация валют завершена успешно!');
  } catch (error) {
    console.error('❌ Ошибка инициализации валют:', error);
    throw error;
  }
}