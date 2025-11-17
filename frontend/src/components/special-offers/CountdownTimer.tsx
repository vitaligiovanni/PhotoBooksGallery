import { useState, useEffect } from "react";
import { Clock, Flame } from "lucide-react";

interface CountdownTimerProps {
  endDate: Date;
  onExpire?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  urgent?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({
  endDate,
  onExpire,
  className = "",
  size = "md",
  showLabels = true,
  urgent = false,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = endDate.getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
        setIsExpired(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        onExpire?.();
      }
    };

    // Вычисляем время сразу
    calculateTimeLeft();

    // Обновляем каждую секунду
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpire]);

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          container: "text-sm",
          number: "text-lg font-bold",
          label: "text-xs",
          separator: "mx-1",
        };
      case "lg":
        return {
          container: "text-base",
          number: "text-3xl font-bold",
          label: "text-sm",
          separator: "mx-2",
        };
      default: // md
        return {
          container: "text-base",
          number: "text-2xl font-bold",
          label: "text-xs",
          separator: "mx-1.5",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (isExpired) {
    return (
      <div className={`flex items-center gap-2 text-red-600 ${className}`}>
        <Clock className="h-4 w-4" />
        <span className="font-medium">Время вышло!</span>
      </div>
    );
  }

  const timeBlocks = [
    { value: timeLeft.days, label: "дней", short: "д" },
    { value: timeLeft.hours, label: "часов", short: "ч" },
    { value: timeLeft.minutes, label: "мин", short: "м" },
    { value: timeLeft.seconds, label: "сек", short: "с" },
  ].filter(block => block.value > 0 || block.label === "сек"); // Всегда показываем секунды

  return (
    <div className={`flex items-center gap-2 ${urgent ? 'text-red-600' : 'text-foreground'} ${className}`}>
      {urgent && <Flame className="h-4 w-4 animate-pulse" />}
      <Clock className={`h-4 w-4 ${urgent ? 'animate-pulse' : ''}`} />

      <div className={`flex items-center ${sizeClasses.container}`}>
        {timeBlocks.map((block, index) => (
          <div key={block.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <span className={`${sizeClasses.number} ${urgent ? 'text-red-600' : ''}`}>
                {formatNumber(block.value)}
              </span>
              {showLabels && (
                <span className={`${sizeClasses.label} text-muted-foreground uppercase tracking-wide`}>
                  {block.short}
                </span>
              )}
            </div>
            {index < timeBlocks.length - 1 && (
              <span className={`${sizeClasses.separator} text-muted-foreground font-bold`}>:</span>
            )}
          </div>
        ))}
      </div>

      {urgent && (
        <span className="text-sm font-medium text-red-600 animate-pulse">
          Срочно!
        </span>
      )}
    </div>
  );
}

// Компонент для специального предложения с таймером
interface SpecialOfferCountdownProps {
  title: string;
  description: string;
  discountPercent?: number;
  discountAmount?: string;
  endDate: Date;
  buttonText: string;
  buttonLink: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  onExpire?: () => void;
  className?: string;
}

export function SpecialOfferCountdown({
  title,
  description,
  discountPercent,
  discountAmount,
  endDate,
  buttonText,
  buttonLink,
  imageUrl,
  backgroundColor = "#ffffff",
  textColor = "#000000",
  onExpire,
  className = "",
}: SpecialOfferCountdownProps) {
  const [isExpired, setIsExpired] = useState(false);

  const handleExpire = () => {
    setIsExpired(true);
    onExpire?.();
  };

  const isUrgent = () => {
    const now = new Date();
    const timeLeft = endDate.getTime() - now.getTime();
    return timeLeft < 24 * 60 * 60 * 1000; // Менее 24 часов
  };

  if (isExpired) {
    return (
      <div
        className={`p-6 rounded-lg border-2 border-dashed border-gray-300 text-center ${className}`}
        style={{ backgroundColor, color: textColor }}
      >
        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Предложение завершено</h3>
        <p className="text-sm text-muted-foreground">
          Это специальное предложение больше недоступно
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg shadow-lg ${className}`}
      style={{ backgroundColor, color: textColor }}
    >
      {/* Фоновое изображение */}
      {imageUrl && (
        <div className="absolute inset-0">
          <img
            src={imageUrl}
            alt="Special offer background"
            className="w-full h-full object-cover opacity-10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="relative p-6">
        {/* Бейдж скидки */}
        {(discountPercent || discountAmount) && (
          <div className="absolute top-4 right-4">
            <div className="bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm">
              {discountPercent ? `-${discountPercent}%` : discountAmount}
            </div>
          </div>
        )}

        {/* Таймер */}
        <div className="mb-4">
          <CountdownTimer
            endDate={endDate}
            onExpire={handleExpire}
            urgent={isUrgent()}
            size="lg"
          />
        </div>

        {/* Контент */}
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm mb-4 opacity-90">{description}</p>

        {/* Кнопка */}
        <button
          onClick={() => window.location.href = buttonLink}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          {buttonText}
        </button>

        {/* Предупреждение об истечении */}
        {isUrgent() && (
          <p className="text-xs text-center mt-3 text-red-600 font-medium">
            ⏰ Осталось менее 24 часов!
          </p>
        )}
      </div>
    </div>
  );
}