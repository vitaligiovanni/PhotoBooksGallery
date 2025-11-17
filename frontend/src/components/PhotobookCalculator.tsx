import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator,
  BookOpen,
  Ruler,
  Palette,
  Package,
  Info,
  Zap,

  ShoppingCart,

  Download,
  Bookmark,
  AlertCircle,
  CheckCircle2,
  
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';

interface PhotobookConfig {
  format: 'album' | 'book' | 'square';
  size: string;
  pages: number;
  copies: number;
  coverMaterial: string;
  paperType: string;
  binding: string;
  lamination: boolean;
  dustJacket: boolean;
  expressDelivery: boolean;
  giftBox: boolean;
}

interface PriceBreakdown {
  basePrice: number;
  additionalPages: number;
  coverUpgrade: number;
  paperUpgrade: number;
  bindingUpgrade: number;
  lamination: number;
  dustJacket: number;
  expressDelivery: number;
  giftBox: number;
  quantityDiscount: number;
  subtotal: number;
  total: number;
}

const formats = [
  { 
    id: 'album', 
    name: 'Альбом', 
    description: 'Классический формат с твердой обложкой',
    icon: '📖',
    minPages: 20,
    maxPages: 200
  },
  { 
    id: 'book', 
    name: 'Книга', 
    description: 'Современный формат в мягкой обложке',
    icon: '📚',
    minPages: 24,
    maxPages: 120
  },
  { 
    id: 'square', 
    name: 'Квадрат', 
    description: 'Стильный квадратный формат',
    icon: '⬜',
    minPages: 16,
    maxPages: 100
  }
];

const sizes = {
  album: [
    { id: 'A4', name: '21x29.7 см (A4)', basePrice: 2500 },
    { id: 'A3', name: '29.7x42 см (A3)', basePrice: 4500 },
    { id: '25x35', name: '25x35 см', basePrice: 3200 },
    { id: '30x30', name: '30x30 см', basePrice: 3800 }
  ],
  book: [
    { id: 'A5', name: '14.8x21 см (A5)', basePrice: 1800 },
    { id: 'A4', name: '21x29.7 см (A4)', basePrice: 2200 },
    { id: '20x20', name: '20x20 см', basePrice: 2000 }
  ],
  square: [
    { id: '15x15', name: '15x15 см', basePrice: 1500 },
    { id: '20x20', name: '20x20 см', basePrice: 2000 },
    { id: '25x25', name: '25x25 см', basePrice: 2800 },
    { id: '30x30', name: '30x30 см', basePrice: 3500 }
  ]
};

const coverMaterials = [
  { id: 'hard', name: 'Твердая', price: 0, description: 'Картонная основа с ламинацией' },
  { id: 'leather', name: 'Кожзам', price: 500, description: 'Премиальная кожзаменительная обложка' },
  { id: 'fabric', name: 'Ткань', price: 300, description: 'Тканевая обложка с тиснением' },
  { id: 'linen', name: 'Лён', price: 400, description: 'Натуральная льняная обложка' }
];

const paperTypes = [
  { id: 'standard', name: 'Стандартная', price: 0, weight: '150г/м²', description: 'Качественная матовая бумага' },
  { id: 'premium', name: 'Премиум', price: 15, weight: '200г/м²', description: 'Плотная глянцевая бумага' },
  { id: 'silk', name: 'Шёлк', price: 25, weight: '170г/м²', description: 'Полуматовая шелковистая бумага' },
  { id: 'pearl', name: 'Перламутр', price: 35, weight: '180г/м²', description: 'Бумага с перламутровым эффектом' }
];

const bindingTypes = [
  { id: 'perfect', name: 'Клеевое', price: 0, description: 'Стандартное клеевое скрепление' },
  { id: 'spiral', name: 'Спираль', price: 200, description: 'Металлическая спираль' },
  { id: 'thread', name: 'Нитки', price: 300, description: 'Прошивка нитками (премиум)' }
];

export function PhotobookCalculator() {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [config, setConfig] = useState<PhotobookConfig>({
    format: 'album',
    size: 'A4',
    pages: 40,
    copies: 1,
    coverMaterial: 'hard',
    paperType: 'standard',
    binding: 'perfect',
    lamination: true,
    dustJacket: false,
    expressDelivery: false,
    giftBox: false
  });

  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown>({
    basePrice: 0,
    additionalPages: 0,
    coverUpgrade: 0,
    paperUpgrade: 0,
    bindingUpgrade: 0,
    lamination: 0,
    dustJacket: 0,
    expressDelivery: 0,
    giftBox: 0,
    quantityDiscount: 0,
    subtotal: 0,
    total: 0
  });

  const currentFormat = formats.find(f => f.id === config.format);
  const currentSizes = sizes[config.format as keyof typeof sizes];
  const currentSize = currentSizes?.find(s => s.id === config.size);

  // Расчет стоимости
  useEffect(() => {
    if (!currentSize || !currentFormat) return;

    const basePrice = currentSize.basePrice;
    const minPages = currentFormat.minPages;
    
    // Дополнительные страницы
    const extraPages = Math.max(0, config.pages - minPages);
    const additionalPages = extraPages * 25; // 25₽ за страницу
    
    // Обложка
    const coverMaterial = coverMaterials.find(c => c.id === config.coverMaterial);
    const coverUpgrade = coverMaterial?.price || 0;
    
    // Бумага (цена за страницу)
    const paperType = paperTypes.find(p => p.id === config.paperType);
    const paperUpgrade = (paperType?.price || 0) * config.pages;
    
    // Переплет
    const bindingType = bindingTypes.find(b => b.id === config.binding);
    const bindingUpgrade = bindingType?.price || 0;
    
    // Дополнительные опции
    const lamination = config.lamination ? 200 : 0;
    const dustJacket = config.dustJacket ? 300 : 0;
    const expressDelivery = config.expressDelivery ? 500 : 0;
    const giftBox = config.giftBox ? 250 : 0;
    
    // Скидка за количество
    let quantityDiscount = 0;
    if (config.copies >= 5) quantityDiscount = 0.15; // 15%
    else if (config.copies >= 3) quantityDiscount = 0.10; // 10%
    else if (config.copies >= 2) quantityDiscount = 0.05; // 5%
    
    const subtotalPerCopy = basePrice + additionalPages + coverUpgrade + paperUpgrade + bindingUpgrade + lamination + dustJacket;
    const subtotal = subtotalPerCopy * config.copies;
    const discountAmount = subtotal * quantityDiscount;
    const total = subtotal - discountAmount + expressDelivery + giftBox;

    setPriceBreakdown({
      basePrice,
      additionalPages,
      coverUpgrade,
      paperUpgrade,
      bindingUpgrade,
      lamination,
      dustJacket,
      expressDelivery,
      giftBox,
      quantityDiscount: discountAmount,
      subtotal,
      total
    });
  }, [config, currentSize, currentFormat]);

  const handleAddToCart = () => {
    // Создаем минимальный продукт для корзины на основе текущей конфигурации  
    const product = {
      id: `photobook_${Date.now()}`, // Уникальный ID
      name: `Фотокнига ${config.format} ${config.size}`,
      price: priceBreakdown.total.toString(),
      originalPrice: priceBreakdown.total.toString(),
      imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80',
      // Add minimal required fields to satisfy type checking
      description: null,
      isActive: true,
      sortOrder: null,
      createdAt: null,
      currencyId: null,
      discountPercentage: null,
      inStock: null,
      stockQuantity: null,
      isOnSale: false,
      allowCustomization: true,
      minCustomPrice: null,
      minCustomPriceCurrencyId: null,
      isReadyMade: false, // Фотокнига требует редактирования
      images: null,
      videoUrl: null,
      videos: null,
      categoryId: null,
      options: null
    } as any; // Use 'as any' to bypass strict type checking for this custom product

    const options = {
      format: config.format,
      size: config.size,
      pages: config.pages,
      copies: config.copies,
      coverMaterial: config.coverMaterial,
      paperType: config.paperType,
      binding: config.binding,
      lamination: config.lamination,
      dustJacket: config.dustJacket,
      expressDelivery: config.expressDelivery,
      giftBox: config.giftBox
    };

    addToCart(product, 1, options);
    
    // Показываем уведомление об успешном добавлении
    toast({
      title: t('productAddedToCart') || 'Товар добавлен в корзину',
      description: `${product.name} - ${formatPrice(priceBreakdown.total)}`,
      duration: 3000,
    });
  };

  const handleFormatChange = (format: string) => {
    const newFormat = format as PhotobookConfig['format'];
    const newSizes = sizes[newFormat];
    const foundFormat = formats.find(f => f.id === newFormat);
    
    setConfig(prev => ({
      ...prev,
      format: newFormat,
      size: newSizes[0].id,
      pages: Math.max(foundFormat?.minPages || 20, Math.min(prev.pages, foundFormat?.maxPages || 100))
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {t('format')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {formats.map((format) => (
                  <div
                    key={format.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      config.format === format.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFormatChange(format.id)}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{format.icon}</div>
                      <h3 className="font-semibold">{format.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        {format.minPages}-{format.maxPages} страниц
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Size and Pages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Размер и количество страниц
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Размер</Label>
                <Select value={config.size} onValueChange={(value) => setConfig(prev => ({ ...prev, size: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSizes?.map((size) => (
                      <SelectItem key={size.id} value={size.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{size.name}</span>
                          <span className="ml-4 text-sm text-gray-500">
                            от {formatPrice(size.basePrice)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-medium">
                    Количество страниц: {config.pages}
                  </Label>
                  <Badge variant="outline">
                    Мин: {currentFormat?.minPages}, Макс: {currentFormat?.maxPages}
                  </Badge>
                </div>
                <Slider
                  value={[config.pages]}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, pages: value[0] }))}
                  min={currentFormat?.minPages || 20}
                  max={currentFormat?.maxPages || 100}
                  step={4}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{currentFormat?.minPages}</span>
                  <span>{currentFormat?.maxPages}</span>
                </div>
                {config.pages > (currentFormat?.minPages || 20) && (
                  <Alert className="mt-3">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Дополнительно {config.pages - (currentFormat?.minPages || 20)} страниц × 25₽ = {formatPrice((config.pages - (currentFormat?.minPages || 20)) * 25)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Количество экземпляров</Label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfig(prev => ({ ...prev, copies: Math.max(1, prev.copies - 1) }))}
                    disabled={config.copies <= 1}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={config.copies}
                    onChange={(e) => setConfig(prev => ({ ...prev, copies: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-20 text-center"
                    min={1}
                    max={50}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfig(prev => ({ ...prev, copies: Math.min(50, prev.copies + 1) }))}
                    disabled={config.copies >= 50}
                  >
                    +
                  </Button>
                </div>
                {config.copies >= 2 && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Скидка {config.copies >= 5 ? '15%' : config.copies >= 3 ? '10%' : '5%'} за количество!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Материалы и опции
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="cover" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="cover">Обложка</TabsTrigger>
                  <TabsTrigger value="pages">Страницы</TabsTrigger>
                  <TabsTrigger value="binding">Переплет</TabsTrigger>
                </TabsList>

                <TabsContent value="cover" className="space-y-4">
                  {coverMaterials.map((material) => (
                    <div
                      key={material.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        config.coverMaterial === material.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setConfig(prev => ({ ...prev, coverMaterial: material.id }))}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{material.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {material.price > 0 ? `+${formatPrice(material.price)}` : 'Базовая'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="pages" className="space-y-4">
                  {paperTypes.map((paper) => (
                    <div
                      key={paper.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        config.paperType === paper.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setConfig(prev => ({ ...prev, paperType: paper.id }))}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{paper.name}</h4>
                          <p className="text-sm text-gray-600">{paper.weight}</p>
                          <p className="text-sm text-gray-600 mt-1">{paper.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {paper.price > 0 ? `+${formatPrice(paper.price * config.pages)}` : 'Базовая'}
                          </div>
                          {paper.price > 0 && (
                            <div className="text-xs text-gray-500">
                              {formatPrice(paper.price)} за стр.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="binding" className="space-y-4">
                  {bindingTypes.map((binding) => (
                    <div
                      key={binding.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        config.binding === binding.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setConfig(prev => ({ ...prev, binding: binding.id }))}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{binding.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{binding.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {binding.price > 0 ? `+${formatPrice(binding.price)}` : 'Базовый'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Дополнительные опции
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Ламинация обложки</h4>
                  <p className="text-sm text-gray-600">Защитная пленка на обложке</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">+{formatPrice(200)}</span>
                  <Switch
                    checked={config.lamination}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, lamination: checked }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Суперобложка</h4>
                  <p className="text-sm text-gray-600">Съемная обложка поверх основной</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">+{formatPrice(300)}</span>
                  <Switch
                    checked={config.dustJacket}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, dustJacket: checked }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Экспресс-доставка
                  </h4>
                  <p className="text-sm text-gray-600">Изготовление за 3 дня вместо 7</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">+{formatPrice(500)}</span>
                  <Switch
                    checked={config.expressDelivery}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, expressDelivery: checked }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-500" />
                    Подарочная коробка
                  </h4>
                  <p className="text-sm text-gray-600">Красивая упаковка для подарка</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">+{formatPrice(250)}</span>
                  <Switch
                    checked={config.giftBox}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, giftBox: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Summary */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Расчет стоимости
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Базовая стоимость</span>
                  <span className="font-medium">{formatPrice(priceBreakdown.basePrice)}</span>
                </div>

                {priceBreakdown.additionalPages > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Дополнительные страницы</span>
                    <span>+{formatPrice(priceBreakdown.additionalPages)}</span>
                  </div>
                )}

                {priceBreakdown.coverUpgrade > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Улучшение обложки</span>
                    <span>+{formatPrice(priceBreakdown.coverUpgrade)}</span>
                  </div>
                )}

                {priceBreakdown.paperUpgrade > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Премиум бумага</span>
                    <span>+{formatPrice(priceBreakdown.paperUpgrade)}</span>
                  </div>
                )}

                {priceBreakdown.bindingUpgrade > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Улучшенный переплет</span>
                    <span>+{formatPrice(priceBreakdown.bindingUpgrade)}</span>
                  </div>
                )}

                {priceBreakdown.lamination > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Ламинация</span>
                    <span>+{formatPrice(priceBreakdown.lamination)}</span>
                  </div>
                )}

                {priceBreakdown.dustJacket > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Суперобложка</span>
                    <span>+{formatPrice(priceBreakdown.dustJacket)}</span>
                  </div>
                )}

                {config.copies > 1 && (
                  <div className="flex justify-between text-sm">
                    <span>× {config.copies} экземпляра</span>
                    <span>{formatPrice(priceBreakdown.subtotal)}</span>
                  </div>
                )}

                {priceBreakdown.quantityDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Скидка за количество</span>
                    <span>-{formatPrice(priceBreakdown.quantityDiscount)}</span>
                  </div>
                )}

                {priceBreakdown.expressDelivery > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Экспресс-доставка</span>
                    <span>+{formatPrice(priceBreakdown.expressDelivery)}</span>
                  </div>
                )}

                {priceBreakdown.giftBox > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Подарочная коробка</span>
                    <span>+{formatPrice(priceBreakdown.giftBox)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Итого:</span>
                <span className="text-blue-600">{formatPrice(priceBreakdown.total)}</span>
              </div>

              <div className="text-xs text-gray-500 text-center">
                * Цены указаны в российских рублях
              </div>

              <div className="space-y-2 pt-4">
                <Button className="w-full" size="lg" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {t('addToCartCalculator') || 'Добавить в корзину'}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Сохранить
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Скачать
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Информация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Время изготовления:</span>
                  <span className="font-medium">
                    {config.expressDelivery ? '3-4' : '7-10'} дней
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Доставка:</span>
                  <span className="font-medium">1-3 дня</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Гарантия:</span>
                  <span className="font-medium">1 год</span>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Окончательная цена может варьироваться в зависимости от сложности макета и дополнительных требований.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}