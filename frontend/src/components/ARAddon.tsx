import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Info, Sparkles, Camera, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AR_ADDON_PRICE } from '@shared/public';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@shared/public';

interface ARAddonProps {
  productId: string;
  productName: string;
  onARToggle?: (enabled: boolean) => void;
  defaultChecked?: boolean;
}

export function ARAddon({ productId, productName, onARToggle, defaultChecked = false }: ARAddonProps) {
  const [arEnabled, setAREnabled] = useState(defaultChecked);
  const { currentCurrency } = useCurrency();
  
  const currencyCode = (currentCurrency?.id || 'AMD') as 'AMD' | 'USD' | 'RUB';
  const arPrice = AR_ADDON_PRICE[currencyCode] || AR_ADDON_PRICE.AMD;
  const formattedPrice = formatCurrency(arPrice, currencyCode);

  const handleToggle = (checked: boolean) => {
    setAREnabled(checked);
    onARToggle?.(checked);
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">AR-эффект</h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                Новинка
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Оживите ваши фотографии! При наведении камеры телефона на фотографию будет
              проигрываться видео.
            </p>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Camera className="w-4 h-4 text-purple-500" />
                <span>Распознавание фото</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Video className="w-4 h-4 text-purple-500" />
                <span>Видео поверх</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`ar-addon-${productId}`}
                  checked={arEnabled}
                  onCheckedChange={handleToggle}
                />
                <label
                  htmlFor={`ar-addon-${productId}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Добавить AR-эффект
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-purple-600">
                  +{formattedPrice}
                </span>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Как работает AR-эффект?
                      </DialogTitle>
                      <DialogDescription className="text-left space-y-4 pt-4">
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">
                            🎬 Что это такое?
                          </h4>
                          <p>
                            AR (дополненная реальность) позволяет оживить фотографии в вашей
                            фотокниге. Когда вы наводите камеру телефона на фотографию, поверх неё
                            автоматически проигрывается видео!
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-foreground mb-2">
                            📱 Как использовать?
                          </h4>
                          <ol className="list-decimal list-inside space-y-2">
                            <li>После получения фотокниги вы получите QR-код на email</li>
                            <li>Отсканируйте QR-код телефоном</li>
                            <li>Разрешите доступ к камере</li>
                            <li>Наведите камеру на фотографию в книге</li>
                            <li>Видео автоматически появится поверх фото!</li>
                          </ol>
                        </div>

                        <div>
                          <h4 className="font-semibold text-foreground mb-2">
                            ✨ Важные детали:
                          </h4>
                          <ul className="list-disc list-inside space-y-2">
                            <li>
                              <strong>Фотография остаётся обычной</strong> — никаких QR-кодов на
                              самой фотографии!
                            </li>
                            <li>
                              <strong>Работает на любом телефоне</strong> с камерой (iOS, Android)
                            </li>
                            <li>
                              <strong>Не требует установки приложений</strong> — всё через браузер
                            </li>
                            <li>
                              <strong>Вы загружаете видео</strong> при оформлении заказа (до 30
                              секунд)
                            </li>
                          </ul>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-purple-500" />
                            Идеи для использования:
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Свадебное видео поверх фотографии молодожёнов</li>
                            <li>Первые шаги малыша на странице детского альбома</li>
                            <li>Поздравление от друзей на странице юбилея</li>
                            <li>Видео с путешествия на фото достопримечательности</li>
                            <li>Выступление на сцене в выпускном альбоме</li>
                          </ul>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {arEnabled && (
          <div className="mt-4 p-3 bg-purple-100 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800">
              ✅ AR-эффект будет добавлен. После оформления заказа вы сможете загрузить фото и
              видео для создания AR на странице{' '}
              <a href="/create-ar" className="underline font-semibold">
                Создать AR
              </a>
              .
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
