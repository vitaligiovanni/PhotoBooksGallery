import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Currency, ExchangeRate, SupportedCurrency, formatCurrency } from '@shared/schema';

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
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery<Currency[]>({
    queryKey: ['/api/currencies'],
  });

  // Fetch base currency  
  const { data: baseCurrency, isLoading: baseCurrencyLoading } = useQuery<Currency>({
    queryKey: ['/api/currencies/base'],
  });

  // Fetch exchange rates
  const { data: exchangeRates = [], isLoading: exchangeRatesLoading } = useQuery<ExchangeRate[]>({
    queryKey: ['/api/exchange-rates'],
  });

  const isLoading = currenciesLoading || baseCurrencyLoading || exchangeRatesLoading;

  // Set default currency when currencies load
  useEffect(() => {
    if (currencies.length > 0) {
      // Check if current currency ID is valid
      const currentExists = currentCurrencyId && currencies.some(c => c.id === currentCurrencyId);
      
      if (!currentExists) {
        // Always prefer the base currency (AMD) as default for new users or if saved currency doesn't exist
        const defaultCurrency = baseCurrency || currencies.find(c => c.code === 'AMD') || currencies[0];
        setCurrentCurrencyId(defaultCurrency.id);
      }
    }
  }, [currencies, baseCurrency, currentCurrencyId]);

  // Save current currency to localStorage
  useEffect(() => {
    if (currentCurrencyId) {
      localStorage.setItem('current-currency', currentCurrencyId);
    }
  }, [currentCurrencyId]);

  const currentCurrency = currencies.find(c => c.id === currentCurrencyId);

  const setCurrentCurrency = (currencyId: string) => {
    setCurrentCurrencyId(currencyId);
  };

  const convertPrice = (amount: number, fromCurrencyId: string, toCurrencyId?: string): number => {
    const targetCurrencyId = toCurrencyId || currentCurrencyId;
    
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
    if (baseCurrency) {
      const fromBaseRate = exchangeRates.find(
        rate => rate.fromCurrencyId === baseCurrency.id && rate.toCurrencyId === fromCurrencyId
      );
      const toBaseRate = exchangeRates.find(
        rate => rate.fromCurrencyId === targetCurrencyId && rate.toCurrencyId === baseCurrency.id
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
    const currency = currencies.find(c => c.id === targetCurrencyId);
    
    if (!currency) {
      return amount.toString();
    }

    // Use the currency code for formatting
    return formatCurrency(amount, currency.code as SupportedCurrency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currencies,
        currentCurrency,
        baseCurrency,
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