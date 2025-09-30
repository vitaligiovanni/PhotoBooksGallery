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
      <SelectTrigger className={`w-12 h-9 px-2 justify-center border-border ${className || ''}`} data-testid="select-currency" aria-label="Change currency">
        <SelectValue>
          {currentCurrency && (
            <span className="text-sm font-semibold tracking-tight">{currentCurrency.symbol}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[140px]">
        {currencies.map(currency => (
          <SelectItem key={currency.id} value={currency.id} data-testid={`option-currency-${currency.code}`}>
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold w-6 text-center">{currency.symbol}</span>
              <span className="text-xs text-muted-foreground">{currency.code}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}