import { useMemo, useState } from 'react';
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
import { Pencil, Save, X, Trash2, Plus, Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { Currency, ExchangeRate } from '@shared/schema';

export function CurrencySettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<string>('');

  // Local state for creating currency
  const [newCurrencyCode, setNewCurrencyCode] = useState<string>('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState<string>('');
  const [creatingRate, setCreatingRate] = useState<{ from?: string; to?: string; rate?: string }>({});

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
      queryClient.invalidateQueries({ queryKey: ['/api/currencies'] });
      toast({
        title: t('baseCurrencyUpdated'),
        description: t('baseCurrencySuccess'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToUpdateBaseCurrency'),
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
        title: t('exchangeRateUpdated'),
        description: t('exchangeRateSuccess'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToUpdateRate'),
        variant: 'destructive',
      });
    }
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Currency> }) => {
      await apiRequest('PUT', `/api/admin/currencies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/currencies'] });
      toast({ title: 'Валюта обновлена', description: 'Настройки валюты сохранены' });
    },
    onError: (err: any) => {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось обновить валюту', variant: 'destructive' });
    }
  });

  const createCurrencyMutation = useMutation({
    mutationFn: async (payload: Pick<Currency, 'code' | 'symbol' | 'name' | 'sortOrder' | 'isActive'> & { isBaseCurrency?: boolean }) => {
      await apiRequest('POST', `/api/admin/currencies`, payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/currencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/currencies/base'] });
      setNewCurrencyCode('');
      setNewCurrencySymbol('');
      toast({ title: 'Валюта добавлена', description: 'Новая валюта успешно создана' });
    },
    onError: (err: any) => {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось создать валюту', variant: 'destructive' });
    }
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/currencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/currencies'] });
      toast({ title: 'Удалено', description: 'Валюта удалена' });
    },
    onError: (err: any) => {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось удалить валюту', variant: 'destructive' });
    }
  });

  const createRateMutation = useMutation({
    mutationFn: async (payload: { fromCurrencyId: string; toCurrencyId: string; rate: number }) => {
      await apiRequest('POST', `/api/admin/exchange-rates`, { ...payload, source: 'manual', isManual: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      setCreatingRate({});
      toast({ title: 'Курс добавлен', description: 'Обменный курс создан' });
    },
    onError: (err: any) => {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось создать курс', variant: 'destructive' });
    }
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/exchange-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      toast({ title: 'Удалено', description: 'Курс удален' });
    },
    onError: (err: any) => {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось удалить курс', variant: 'destructive' });
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
        title: t('error'),
        description: t('invalidRate'),
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

  // Helpers
  const baseCurrencyId = baseCurrency?.id;
  const existingCodes = useMemo(() => new Set(currencies.map(c => c.code)), [currencies]);
  const selectableCodes = (['AMD', 'USD', 'RUB'] as const).filter(code => !existingCodes.has(code));

  const canDeleteCurrency = (c: Currency) => {
    if (c.id === baseCurrencyId) return false;
    const usedInRates = exchangeRates.some(r => r.fromCurrencyId === c.id || r.toCurrencyId === c.id);
    return !usedInRates;
  };

  if (currenciesLoading || baseCurrencyLoading || ratesLoading) {
    return <div className="p-6">Загрузка настроек валют...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Настройки валют</h1>
      </div>

      {/* Currencies list and management */}
      <Card>
        <CardHeader>
          <CardTitle>Валюты</CardTitle>
          <p className="text-sm text-muted-foreground">Активируйте нужные валюты, выберите базовую и при необходимости добавьте отсутствующие</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Create currency */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-3 p-4 border rounded-lg">
              <div className="flex-1">
                <Label>Код валюты</Label>
                <Select value={newCurrencyCode} onValueChange={(v) => {
                  setNewCurrencyCode(v);
                  // Suggest symbol
                  if (v === 'USD') setNewCurrencySymbol('$');
                  else if (v === 'RUB') setNewCurrencySymbol('₽');
                  else if (v === 'AMD') setNewCurrencySymbol('֏');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectableCodes.length ? 'Выберите код' : 'Все валюты добавлены'} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableCodes.map((code) => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Символ</Label>
                <Input value={newCurrencySymbol} onChange={(e) => setNewCurrencySymbol(e.target.value)} placeholder="$, ₽, ֏" />
              </div>
              <Button
                onClick={() => {
                  if (!newCurrencyCode) return;
                  const payload = {
                    code: newCurrencyCode as any,
                    symbol: newCurrencySymbol || (newCurrencyCode === 'USD' ? '$' : newCurrencyCode === 'RUB' ? '₽' : '֏'),
                    name: newCurrencyCode === 'USD'
                      ? { ru: 'Доллар США', hy: 'ԱՄՆ դոլար', en: 'US Dollar' }
                      : newCurrencyCode === 'RUB'
                      ? { ru: 'Российский рубль', hy: 'Ռուսական ռուբլի', en: 'Russian Ruble' }
                      : { ru: 'Армянский драм', hy: 'Հայկական դրամ', en: 'Armenian Dram' },
                    sortOrder: newCurrencyCode === 'AMD' ? 1 : newCurrencyCode === 'USD' ? 2 : 3,
                    isActive: true,
                  };
                  createCurrencyMutation.mutate(payload as any);
                }}
                disabled={!newCurrencyCode || createCurrencyMutation.isPending || selectableCodes.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" /> Добавить валюту
              </Button>
            </div>

            {/* Currencies table */}
            <div className="space-y-2">
              {currencies.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">Нет валют. Добавьте хотя бы одну валюту.</div>
              )}
              {currencies.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{c.code}</Badge>
                    <span className="text-lg">{c.symbol}</span>
                    <span className="text-sm text-muted-foreground">{(c.name as any).ru || c.code}</span>
                    {c.id === baseCurrencyId && (
                      <Badge className="ml-2" variant="outline"><Star className="w-3 h-3 mr-1" /> Базовая</Badge>
                    )}
                    {!c.isActive && <Badge variant="destructive">Отключена</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Активна</span>
                      <Switch
                        checked={!!c.isActive}
                        onCheckedChange={(val) => {
                          if (c.id === baseCurrencyId && !val) {
                            toast({ title: 'Нельзя отключить базовую валюту', variant: 'destructive' });
                            return;
                          }
                          updateCurrencyMutation.mutate({ id: c.id, data: { isActive: val } });
                        }}
                      />
                    </div>
                    {c.id !== baseCurrencyId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBaseCurrencyChange(c.id)}
                        disabled={updateBaseCurrencyMutation.isPending}
                      >
                        Сделать базовой
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (!canDeleteCurrency(c)) {
                          toast({ title: 'Удаление невозможно', description: 'Нельзя удалить базовую валюту или валюту с активными курсами', variant: 'destructive' });
                          return;
                        }
                        if (window.confirm(`Удалить валюту ${c.code}?`)) {
                          deleteCurrencyMutation.mutate(c.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
                <SelectValue placeholder={t('selectBaseCurrency')}>
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
            {/* Create new rate */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-3 p-4 border rounded-lg">
              <div className="flex-1">
                <Label>Из валюты</Label>
                <Select value={creatingRate.from} onValueChange={(v) => setCreatingRate(prev => ({ ...prev, from: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите валюту" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code} {c.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>В валюту</Label>
                <Select value={creatingRate.to} onValueChange={(v) => setCreatingRate(prev => ({ ...prev, to: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите валюту" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code} {c.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Курс</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={creatingRate.rate || ''}
                  onChange={(e) => setCreatingRate(prev => ({ ...prev, rate: e.target.value }))}
                  placeholder="1.0000"
                />
              </div>
              <Button
                onClick={() => {
                  if (!creatingRate.from || !creatingRate.to || !creatingRate.rate) return;
                  if (creatingRate.from === creatingRate.to) {
                    toast({ title: 'Некорректная пара', description: 'Валюты должны отличаться', variant: 'destructive' });
                    return;
                  }
                  const alreadyExists = exchangeRates.some(r => r.fromCurrencyId === creatingRate.from && r.toCurrencyId === creatingRate.to);
                  if (alreadyExists) {
                    toast({ title: 'Курс уже существует', description: 'Для этой пары уже есть курс', variant: 'destructive' });
                    return;
                  }
                  const rateNum = parseFloat(creatingRate.rate);
                  if (!rateNum || rateNum <= 0) {
                    toast({ title: 'Некорректный курс', description: 'Введите положительное число', variant: 'destructive' });
                    return;
                  }
                  createRateMutation.mutate({ fromCurrencyId: creatingRate.from, toCurrencyId: creatingRate.to, rate: rateNum });
                }}
                disabled={createRateMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" /> Добавить курс
              </Button>
            </div>

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
                        placeholder={t('rate')}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (window.confirm('Удалить этот курс?')) {
                            deleteRateMutation.mutate(rate.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
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