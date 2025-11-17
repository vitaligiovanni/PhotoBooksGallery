import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Currency, ExchangeRate } from '@shared/schema';
import { SupportedCurrency, formatCurrency } from '@shared/public';

interface CurrencyContextType {
  currencies: Currency[];
  currentCurrency: Currency | undefined;
  baseCurrency: Currency | undefined;
  exchangeRates: ExchangeRate[];
  setCurrentCurrency: (currencyId: string) => void;
  convertPrice: (amount: number, fromCurrencyId: string, toCurrencyId?: string) => number;
  formatPrice: (amount: number, currencyId?: string) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currentCurrencyId, setCurrentCurrencyId] = useState<string>(() => {
    // Try to get from localStorage, default to empty (will be set when base currency loads)
    const saved = localStorage.getItem('current-currency');
    return saved || '';
  });

  // Fetch currencies
  const { data: currencies = [], isLoading: currenciesLoading, error: currenciesError } = useQuery<Currency[]>({
    queryKey: ['/api/currencies'],
    retry: 1,
  });

  // Fetch base currency  
  const { data: baseCurrency, isLoading: baseCurrencyLoading, error: baseCurrencyError } = useQuery<Currency>({
    queryKey: ['/api/currencies/base'],
    retry: 1,
  });

  // Fetch exchange rates
  const { data: exchangeRates = [], isLoading: exchangeRatesLoading, error: exchangeRatesError } = useQuery<ExchangeRate[]>({
    queryKey: ['/api/exchange-rates'],
    retry: 1,
  });

  // Log errors for debugging
  if (currenciesError) {
    console.error('Currency loading error:', currenciesError);
  }
  if (baseCurrencyError) {
    console.error('Base currency loading error:', baseCurrencyError);
  }
  if (exchangeRatesError) {
    console.error('Exchange rates loading error:', exchangeRatesError);
  }

  // Fallback: если API недоступен, создаем валюты по умолчанию из статических данных
  const fallbackCurrencies = React.useMemo(() => {
    if (currencies.length > 0) return currencies;
    
    // Если API не работает, используем статические данные из schema
    return [
      {
        id: 'amd-fallback',
        code: 'AMD' as const,
        name: { ru: 'Армянский драм', hy: 'Հայկական դրամ', en: 'Armenian Dram' },
        symbol: '֏',
        isBaseCurrency: true,
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'usd-fallback',
        code: 'USD' as const,
        name: { ru: 'Доллар США', hy: 'ԱՄՆ դոլար', en: 'US Dollar' },
        symbol: '$',
        isBaseCurrency: false,
        isActive: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rub-fallback',
        code: 'RUB' as const,
        name: { ru: 'Российский рубль', hy: 'Ռուսական ռուբլի', en: 'Russian Ruble' },
        symbol: '₽',
        isBaseCurrency: false,
        isActive: true,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ] as Currency[];
  }, [currencies]);

  // Set base currency as current if not set
  useEffect(() => {
    if (baseCurrency && !currentCurrencyId) {
      setCurrentCurrencyId(baseCurrency.id);
    }
  }, [baseCurrency, currentCurrencyId]);

  const isLoading = currenciesLoading || baseCurrencyLoading || exchangeRatesLoading;

  // Set default currency when currencies load
  useEffect(() => {
    const workingCurrencies = currencies.length > 0 ? currencies : fallbackCurrencies;
    
    if (workingCurrencies.length > 0) {
      // Check if current currency ID is valid
      const currentExists = currentCurrencyId && workingCurrencies.some(c => c.id === currentCurrencyId);
      
      if (!currentExists) {
        // Always prefer the base currency (AMD) as default for new users or if saved currency doesn't exist
        const workingBaseCurrency = baseCurrency || workingCurrencies.find(c => c.isBaseCurrency);
        const defaultCurrency = workingBaseCurrency || workingCurrencies.find(c => c.code === 'AMD') || workingCurrencies[0];
        if (defaultCurrency) {
          setCurrentCurrencyId(defaultCurrency.id);
        }
      }
    }
  }, [currencies, baseCurrency, currentCurrencyId, fallbackCurrencies]);

  // Save current currency to localStorage
  useEffect(() => {
    if (currentCurrencyId) {
      localStorage.setItem('current-currency', currentCurrencyId);
    }
  }, [currentCurrencyId]);

  // Используем fallback валюты если основные недоступны
  const activeCurrencies = currencies.length > 0 ? currencies : fallbackCurrencies;
  const activeBaseCurrency = baseCurrency || fallbackCurrencies.find(c => c.isBaseCurrency);

  const currentCurrency = activeCurrencies.find(c => c.id === currentCurrencyId);

  const setCurrentCurrency = (currencyId: string) => {
    setCurrentCurrencyId(currencyId);
  };

  const convertPrice = (amount: number, fromCurrencyId: string, toCurrencyId?: string): number => {
    const targetCurrencyId = toCurrencyId || currentCurrencyId;
    
    // If currencies not loaded or IDs are empty, return original amount
    if (!fromCurrencyId || !targetCurrencyId || activeCurrencies.length === 0) {
      return amount;
    }
    
    // If same currency, no conversion needed
    if (fromCurrencyId === targetCurrencyId) {
      return amount;
    }

    // Find exchange rate
    const exchangeRate = exchangeRates.find(
      rate => rate.fromCurrencyId === fromCurrencyId && rate.toCurrencyId === targetCurrencyId
    );

    if (exchangeRate) {
      return amount * parseFloat(exchangeRate.rate);
    }

    // If no direct rate, try reverse rate
    const reverseRate = exchangeRates.find(
      rate => rate.fromCurrencyId === targetCurrencyId && rate.toCurrencyId === fromCurrencyId
    );

    if (reverseRate) {
      return amount / parseFloat(reverseRate.rate);
    }

    // If no rate found, try conversion through base currency
    if (activeBaseCurrency) {
      const fromBaseRate = exchangeRates.find(
        rate => rate.fromCurrencyId === activeBaseCurrency.id && rate.toCurrencyId === fromCurrencyId
      );
      const toBaseRate = exchangeRates.find(
        rate => rate.fromCurrencyId === targetCurrencyId && rate.toCurrencyId === activeBaseCurrency.id
      );

      if (fromBaseRate && toBaseRate) {
        // Convert to base currency first, then to target currency
        const baseAmount = amount / parseFloat(fromBaseRate.rate);
        return baseAmount * parseFloat(toBaseRate.rate);
      }
    }

    console.warn(`No exchange rate found for ${fromCurrencyId} to ${targetCurrencyId}`);
    return amount; // Return original amount if no rate found
  };

  const formatPrice = (amount: number, currencyId?: string): string => {
    const targetCurrencyId = currencyId || currentCurrencyId;
    const currency = activeCurrencies.find(c => c.id === targetCurrencyId);
    
    if (!currency) {
      return amount.toString();
    }

    // Use the currency code for formatting
    return formatCurrency(amount, currency.code as SupportedCurrency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currencies: activeCurrencies,
        currentCurrency,
        baseCurrency: activeBaseCurrency,
        exchangeRates,
        setCurrentCurrency,
        convertPrice,
        formatPrice,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}