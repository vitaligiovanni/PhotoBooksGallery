export function formatPrice(price: number, currency = '₽'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price) + ' ' + currency;
}