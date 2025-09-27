import { useState, useEffect } from "react";
import { X, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  buttonText: string;
  buttonLink: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
}

export function WelcomePopup({
  isOpen,
  onClose,
  title,
  content,
  buttonText,
  buttonLink,
  imageUrl,
  backgroundColor = "#ffffff",
  textColor = "#000000",
}: WelcomePopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Небольшая задержка для анимации
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Ждем завершения анимации
  };

  const handleButtonClick = () => {
    window.location.href = buttonLink;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? "bg-black/50" : "bg-transparent"
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

            {/* Image */}
            {imageUrl && (
              <div className="relative h-32 overflow-hidden rounded-t-lg">
                <img
                  src={imageUrl}
                  alt="Welcome popup"
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
                <Gift className="h-5 w-5 text-yellow-500" />
                <h3 className="text-xl font-bold">{title}</h3>
              </div>

              <p className="text-sm mb-4 leading-relaxed">{content}</p>

              <Button
                onClick={handleButtonClick}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3"
              >
                {buttonText}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Нажмите ESC или кликните вне окна для закрытия
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}