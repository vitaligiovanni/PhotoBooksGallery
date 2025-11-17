import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatsCounterProps {
  finalValue: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

function AnimatedCounter({ finalValue, duration = 2000, prefix = "", suffix = "" }: StatsCounterProps) {
  const [currentValue, setCurrentValue] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setCurrentValue(Math.floor(finalValue * easedProgress));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [finalValue, duration]);
  
  return (
    <span className="font-bold text-2xl">
      {prefix}{currentValue.toLocaleString()}{suffix}
    </span>
  );
}

export function CompanyStats() {
  const stats = [
    {
      icon: "📚",
      title: "Фотокниг создано",
      value: 15847,
      suffix: "+",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: "⭐",
      title: "Средний рейтинг",
      value: 4.9,
      prefix: "",
      suffix: "/5",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: "🏆",
      title: "Лет опыта",
      value: 7,
      suffix: "+",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: "🚚",
      title: "Городов доставки",
      value: 200,
      suffix: "+",
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="card-hover text-center border-0 bg-white shadow-md">
          <CardContent className="p-6">
            <div className="text-4xl mb-3">{stat.icon}</div>
            <div className={`bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              <AnimatedCounter 
                finalValue={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                duration={2500 + index * 200}
              />
            </div>
            <h4 className="font-semibold text-gray-700 mt-2">{stat.title}</h4>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function QualityBadges() {
  const badges = [
    { text: "Премиум качество", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
    { text: "Гарантия 100%", color: "bg-gradient-to-r from-green-500 to-blue-500" },
    { text: "Быстрая доставка", color: "bg-gradient-to-r from-orange-500 to-red-500" },
    { text: "Поддержка 24/7", color: "bg-gradient-to-r from-blue-500 to-purple-500" }
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {badges.map((badge, index) => (
        <Badge 
          key={index}
          className={`${badge.color} text-white px-4 py-2 text-sm font-semibold hover:scale-105 transition-transform duration-200`}
        >
          {badge.text}
        </Badge>
      ))}
    </div>
  );
}

interface ProcessStepProps {
  steps: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export function ProcessSteps({ steps }: ProcessStepProps) {
  const defaultSteps = [
    {
      icon: "🎨",
      title: "Выберите дизайн",
      description: "Из 50+ готовых шаблонов или создайте свой"
    },
    {
      icon: "📸",
      title: "Загрузите фото",
      description: "Мы автоматически улучшим качество"
    },
    {
      icon: "⚡",
      title: "Быстрое оформление",
      description: "AI поможет с раскладкой и композицией"
    },
    {
      icon: "🏭",
      title: "Печать и доставка",
      description: "3-5 дней изготовление + доставка курьером"
    }
  ];

  const stepsData = steps || defaultSteps;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {stepsData.map((step, index) => (
        <div key={index} className="text-center fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
          <div className="relative">
            {/* Connecting line */}
            {index < stepsData.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-primary to-primary/30 transform -translate-y-1/2 z-0" />
            )}
            
            {/* Step circle */}
            <div className="relative w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-lg z-10">
              {step.icon}
            </div>
          </div>
          
          <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
          <p className="text-sm text-gray-600">{step.description}</p>
        </div>
      ))}
    </div>
  );
}