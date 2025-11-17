import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calculator, 
  Palette, 
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
// import { useTranslation } from 'react-i18next'; // Unused - commented out

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'calculator' | 'constructor' | 'catalog') => void;
}

export function NewOrderModal({ isOpen, onClose, onSelectOption }: NewOrderModalProps) {
  // const { t } = useTranslation(); // Unused - commented out

  const options = [
    {
      id: 'calculator' as const,
      icon: Calculator,
      emoji: '📊',
      title: 'Рассчитать стоимость',
      description: 'Калькулятор фотокниг с детальным расчетом цены по параметрам',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      features: ['Точный расчет', 'Разные форматы', 'Материалы на выбор']
    },
    {
      id: 'constructor' as const,
      icon: Palette,
      emoji: '🎨',
      title: 'Создать дизайн',
      description: 'Конструктор для создания уникального дизайна фотокниги',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      iconColor: 'text-purple-600',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      features: ['Редактор дизайна', 'Шаблоны', 'Персонализация']
    },
    {
      id: 'catalog' as const,
      icon: ShoppingBag,
      emoji: '📋',
      title: 'Заказать готовое',
      description: 'Каталог готовых фотокниг и альбомов для быстрого заказа',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-600 hover:bg-green-700',
      features: ['Готовые варианты', 'Быстрый заказ', 'Проверенное качество']
    }
  ];

  const handleOptionSelect = (optionId: 'calculator' | 'constructor' | 'catalog') => {
    onSelectOption(optionId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Создать новый заказ
            <Sparkles className="w-6 h-6 text-amber-500" />
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600 mt-2">
            Выберите как вы хотите создать свою фотокнигу
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Card 
                key={option.id}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${option.color}`}
                onClick={() => handleOptionSelect(option.id)}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-md mb-3">
                      <div className="text-3xl">
                        {option.emoji}
                      </div>
                    </div>
                    <Icon className={`w-8 h-8 mx-auto ${option.iconColor}`} />
                  </div>

                  <h3 className="text-xl font-bold mb-2 text-gray-800">
                    {option.title}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    {option.description}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-center justify-center text-sm text-gray-600">
                        <Zap className="w-4 h-4 text-amber-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${option.buttonColor} text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-lg`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionSelect(option.id);
                    }}
                  >
                    Выбрать
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-gray-700">Совет</span>
            </div>
            <p className="text-sm text-gray-600">
              Не знаете что выбрать? Начните с <strong>калькулятора</strong> чтобы узнать стоимость, 
              затем перейдите к <strong>конструктору</strong> для создания дизайна!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewOrderModal;