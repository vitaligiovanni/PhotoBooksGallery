import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

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
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="w-4 h-4 text-muted-foreground" />
      <Select
        value={currentCurrency?.id || ''}
        onValueChange={handleCurrencyChange}
      >
        <SelectTrigger className="w-auto min-w-[120px] border-none shadow-none h-auto p-2">
          <SelectValue>
            {currentCurrency && (
              <span className="flex items-center gap-2">
                <span className="font-medium">{currentCurrency.symbol}</span>
                <span className="text-sm text-muted-foreground">
                  {currentCurrency.code}
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map((currency) => (
            <SelectItem key={currency.id} value={currency.id}>
              <div className="flex items-center gap-3">
                <span className="font-medium">{currency.symbol}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{currency.code}</span>
                  <span className="text-xs text-muted-foreground">
                    {/* Display currency name in current locale */}
                    {currency.name.ru || currency.code}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}