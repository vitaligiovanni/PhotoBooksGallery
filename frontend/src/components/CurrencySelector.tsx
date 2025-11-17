import { useCurrency } from '@/contexts/CurrencyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CurrencySelectorProps {
  className?: string;
}

export function CurrencySelector({ className }: CurrencySelectorProps) {
  const { currencies, currentCurrency, setCurrentCurrency, isLoading } = useCurrency();

  if (isLoading || currencies.length === 0) {
    return null;
  }

  const handleCurrencyChange = (currencyId: string) => {
    setCurrentCurrency(currencyId);
  };

  return (
    <Select value={currentCurrency?.id || ''} onValueChange={handleCurrencyChange}>
      <SelectTrigger className={`w-10 h-9 px-1 justify-center border-border ${className || ''}`} data-testid="select-currency" aria-label="Change currency">
        <SelectValue>
          {currentCurrency && (
            <span className="text-base font-semibold leading-none">{currentCurrency.symbol}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-0 px-0 py-1">
        {currencies.map(currency => (
          <SelectItem
            key={currency.id}
            value={currency.id}
            data-testid={`option-currency-${currency.code}`}
            className="px-0 py-1 flex items-center justify-center"
          >
            <span className="text-base font-semibold leading-none">{currency.symbol}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}