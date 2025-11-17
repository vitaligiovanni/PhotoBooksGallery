import { useCurrency } from '@/contexts/CurrencyContext';

interface PriceDisplayProps {
  price: number;
  fromCurrencyId: string;
  originalPrice?: number;
  className?: string;
  showOriginal?: boolean;
}

export function PriceDisplay({ 
  price, 
  fromCurrencyId, 
  originalPrice, 
  className = "", 
  showOriginal = true 
}: PriceDisplayProps) {
  const { convertPrice, formatPrice, currentCurrency } = useCurrency();

  if (!currentCurrency) {
    return <span className={className}>{price}</span>;
  }

  // Convert prices to current currency
  const convertedPrice = convertPrice(price, fromCurrencyId, currentCurrency.id);
  const convertedOriginalPrice = originalPrice 
    ? convertPrice(originalPrice, fromCurrencyId, currentCurrency.id)
    : undefined;

  const hasDiscount = convertedOriginalPrice && convertedOriginalPrice > convertedPrice;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-lg font-bold text-primary">
        {formatPrice(convertedPrice, currentCurrency.id)}
      </span>
      
      {hasDiscount && showOriginal && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(convertedOriginalPrice, currentCurrency.id)}
          </span>
          <span className="text-sm text-green-600 font-medium">
            -{Math.round(((convertedOriginalPrice - convertedPrice) / convertedOriginalPrice) * 100)}%
          </span>
        </>
      )}
    </div>
  );
}