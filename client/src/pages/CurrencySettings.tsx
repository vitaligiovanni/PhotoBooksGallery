import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Save, X } from 'lucide-react';
import type { Currency, ExchangeRate } from '@shared/schema';

export function CurrencySettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<string>('');

  // Fetch data
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery<Currency[]>({
    queryKey: ['/api/currencies'],
  });

  const { data: baseCurrency, isLoading: baseCurrencyLoading } = useQuery<Currency>({
    queryKey: ['/api/currencies/base'],
  });

  const { data: exchangeRates = [], isLoading: ratesLoading } = useQuery<ExchangeRate[]>({
    queryKey: ['/api/exchange-rates'],
  });

  // Mutations
  const updateBaseCurrencyMutation = useMutation({
    mutationFn: async (currencyId: string) => {
      await apiRequest('PUT', `/api/currencies/base`, { baseCurrencyId: currencyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/currencies/base'] });
      toast({
        title: 'Базовая валюта обновлена',
        description: 'Базовая валюта успешно изменена',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить базовую валюту',
        variant: 'destructive',
      });
    }
  });

  const updateExchangeRateMutation = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      await apiRequest('PUT', `/api/exchange-rates/${id}`, { rate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      setEditingRateId(null);
      setEditingRate('');
      toast({
        title: 'Курс обновлён',
        description: 'Курс валюты успешно обновлён',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить курс валюты',
        variant: 'destructive',
      });
    }
  });

  const handleBaseCurrencyChange = (currencyId: string) => {
    updateBaseCurrencyMutation.mutate(currencyId);
  };

  const startEditingRate = (rateId: string, currentRate: string) => {
    setEditingRateId(rateId);
    setEditingRate(currentRate);
  };

  const saveRate = (rateId: string) => {
    const rate = parseFloat(editingRate);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректный курс валюты',
        variant: 'destructive',
      });
      return;
    }

    updateExchangeRateMutation.mutate({ id: rateId, rate });
  };

  const cancelEdit = () => {
    setEditingRateId(null);
    setEditingRate('');
  };

  const getCurrencyName = (currencyId: string) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? `${currency.code} (${currency.symbol})` : currencyId;
  };

  if (currenciesLoading || baseCurrencyLoading || ratesLoading) {
    return <div className="p-6">Загрузка настроек валют...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Настройки валют</h1>
      </div>

      {/* Base Currency Setting */}
      <Card>
        <CardHeader>
          <CardTitle>Базовая валюта</CardTitle>
          <p className="text-sm text-muted-foreground">
            Валюта, в которой будут храниться цены товаров в базе данных
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="base-currency">Выберите базовую валюту</Label>
            <Select
              value={baseCurrency?.id || ''}
              onValueChange={handleBaseCurrencyChange}
              disabled={updateBaseCurrencyMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите базовую валюту">
                  {baseCurrency && (
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary">{baseCurrency.code}</Badge>
                      {baseCurrency.symbol}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{currency.code}</Badge>
                      <span>{currency.symbol}</span>
                      <span className="text-sm text-muted-foreground">
                        {(currency.name as any).ru || currency.code}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Курсы валют</CardTitle>
          <p className="text-sm text-muted-foreground">
            Управление курсами обмена валют относительно базовой валюты
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exchangeRates.map((rate) => (
              <div
                key={rate.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <strong>{getCurrencyName(rate.fromCurrencyId)}</strong>
                    <span className="text-muted-foreground"> → </span>
                    <strong>{getCurrencyName(rate.toCurrencyId)}</strong>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {editingRateId === rate.id ? (
                    <>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={editingRate}
                        onChange={(e) => setEditingRate(e.target.value)}
                        className="w-24"
                        placeholder="Курс"
                      />
                      <Button
                        size="sm"
                        onClick={() => saveRate(rate.id)}
                        disabled={updateExchangeRateMutation.isPending}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="min-w-[80px]">
                        {parseFloat(rate.rate).toFixed(4)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditingRate(rate.id, rate.rate)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {exchangeRates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Курсы валют не настроены
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}