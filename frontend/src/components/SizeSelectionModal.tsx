import { useState } from 'react';
// import { useTranslation } from 'react-i18next'; // Unused - commented out
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Square, Image, Sparkles } from "lucide-react";
import { useCurrency } from '@/contexts/CurrencyContext';
import { PHOTOBOOK_FORMAT_LABELS, type PhotobookFormat } from '@shared/public';

interface PhotobookConfig {
  format: PhotobookFormat;
  size: { width: number; height: number; label: string };
  spreads: number;
  basePrice: number;
}

interface SizeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (config: PhotobookConfig) => void;
}

export function SizeSelectionModal({ isOpen, onClose, onSelect }: SizeSelectionModalProps) {
  const { formatPrice } = useCurrency();
  // const { t } = useTranslation(); // Unused - commented out
  const [selectedFormat, setSelectedFormat] = useState<PhotobookFormat>('album');

  // Доступные конфигурации фотокниг
  const photobookConfigs: PhotobookConfig[] = [
    // Альбомные (горизонтальные)
    { format: 'album', size: { width: 20, height: 15, label: "20×15 см" }, spreads: 10, basePrice: 2500 },
    { format: 'album', size: { width: 30, height: 20, label: "30×20 см" }, spreads: 10, basePrice: 3500 },
    { format: 'album', size: { width: 35, height: 25, label: "35×25 см" }, spreads: 10, basePrice: 4500 },
    { format: 'album', size: { width: 40, height: 30, label: "40×30 см" }, spreads: 10, basePrice: 6000 },
    
    // Книжные (вертикальные)
    { format: 'book', size: { width: 15, height: 20, label: "15×20 см" }, spreads: 10, basePrice: 2500 },
    { format: 'book', size: { width: 20, height: 30, label: "20×30 см" }, spreads: 10, basePrice: 3500 },
    { format: 'book', size: { width: 25, height: 35, label: "25×35 см" }, spreads: 10, basePrice: 4500 },
    { format: 'book', size: { width: 30, height: 40, label: "30×40 см" }, spreads: 10, basePrice: 6000 },
    
    // Квадратные
    { format: 'square', size: { width: 20, height: 20, label: "20×20 см" }, spreads: 10, basePrice: 3000 },
    { format: 'square', size: { width: 25, height: 25, label: "25×25 см" }, spreads: 10, basePrice: 4000 },
    { format: 'square', size: { width: 30, height: 30, label: "30×30 см" }, spreads: 10, basePrice: 5500 },
  ];

  const formatIcons = {
    album: Image,
    book: BookOpen,
    square: Square,
  };

  const filteredConfigs = photobookConfigs.filter(config => config.format === selectedFormat);

  const handleSelect = (config: PhotobookConfig) => {
    onSelect(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Выберите размер и ориентацию фотокниги
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Выберите формат, который лучше всего подойдет для ваших фотографий
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор формата */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Ориентация фотокниги</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['album', 'book', 'square'] as PhotobookFormat[]).map((format) => {
                const Icon = formatIcons[format];
                const isSelected = selectedFormat === format;
                
                return (
                  <Card 
                    key={format}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedFormat(format)}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <h4 className="font-semibold">
                        {PHOTOBOOK_FORMAT_LABELS[format]}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {format === 'album' && 'Горизонтальная'}
                        {format === 'book' && 'Вертикальная'}
                        {format === 'square' && 'Квадратная'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Выбор размера */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              Размер ({PHOTOBOOK_FORMAT_LABELS[selectedFormat].toLowerCase()})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredConfigs.map((config, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                  onClick={() => handleSelect(config)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{config.size.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {config.spreads} разворотов (20 страниц)
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {formatPrice(config.basePrice)}
                      </Badge>
                    </div>

                    {/* Превью размера */}
                    <div className="flex justify-center mb-4">
                      <div 
                        className="border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center text-xs text-muted-foreground"
                        style={{
                          width: `${Math.max(60, config.size.width * 2)}px`,
                          height: `${Math.max(40, config.size.height * 2)}px`,
                          aspectRatio: `${config.size.width}/${config.size.height}`,
                        }}
                      >
                        {config.size.label}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Формат:</span>
                        <span>{PHOTOBOOK_FORMAT_LABELS[config.format]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Разворотов:</span>
                        <span>{config.spreads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Страниц:</span>
                        <span>{config.spreads * 2}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full mt-4" 
                      onClick={() => handleSelect(config)}
                    >
                      Выбрать этот размер
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💡 Рекомендации по выбору размера:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Альбомная</strong> - идеально для пейзажей и групповых фото</li>
              <li>• <strong>Книжная</strong> - подходит для портретов и вертикальных кадров</li>
              <li>• <strong>Квадратная</strong> - универсальный формат для Instagram-фото</li>
              <li>• Большие размеры лучше передают детали и подходят для подарков</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
