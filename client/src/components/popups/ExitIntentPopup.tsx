import { useState, useEffect, useCallback } from "react";
import { X, Heart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExitIntentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  buttonText: string;
  buttonLink: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  urgencyText?: string;
}

export function ExitIntentPopup({
  isOpen,
  onClose,
  title,
  content,
  buttonText,
  buttonLink,
  imageUrl,
  backgroundColor = "#ffffff",
  textColor = "#000000",
  urgencyText = "Не упустите шанс!",
}: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mouseY, setMouseY] = useState(0);

  // Обработчик движения мыши для отслеживания exit intent
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMouseY(e.clientY);
  }, []);

  // Обработчик движения мыши к верхней части экрана
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Если мышь ушла вверх или влево/вправо в верхней части экрана
    if (e.clientY <= 0 || (e.clientY < 50 && (e.clientX < 50 || e.clientX > window.innerWidth - 50))) {
      // Показываем попап только если он еще не был показан в этой сессии
      const hasShownExitIntent = sessionStorage.getItem('exitIntentShown');
      if (!hasShownExitIntent && !isOpen) {
        // Имитируем открытие попапа (в реальном приложении здесь будет логика из родительского компонента)
        console.log('Exit intent detected - would show popup');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Помечаем что попап был показан в этой сессии
      sessionStorage.setItem('exitIntentShown', 'true');
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Добавляем обработчики событий при монтировании
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleButtonClick = () => {
    window.location.href = buttonLink;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? "bg-black/70" : "bg-transparent"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative max-w-md w-full transition-all duration-300 transform ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor, color: textColor }}
      >
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-0">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              style={{ color: textColor }}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Urgency banner */}
            <div className="bg-red-500 text-white text-center py-2 px-4 rounded-t-lg">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">{urgencyText}</span>
              </div>
            </div>

            {/* Image */}
            {imageUrl && (
              <div className="relative h-32 overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Exit intent popup"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-red-500" />
                <h3 className="text-xl font-bold">{title}</h3>
              </div>

              <p className="text-sm mb-4 leading-relaxed">{content}</p>

              <Button
                onClick={handleButtonClick}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3"
              >
                {buttonText}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Только сегодня! Не упустите возможность
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}