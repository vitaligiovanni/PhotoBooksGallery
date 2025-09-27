import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface LiveCounterProps {
  initialCount?: number;
  incrementInterval?: number;
}

export function LiveCounter({ initialCount = 12847, incrementInterval = 45000 }: LiveCounterProps) {
  const { t } = useTranslation();
  const [count, setCount] = useState(initialCount);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3 + 1));
    }, incrementInterval);
    
    return () => clearInterval(interval);
  }, [incrementInterval]);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 fade-in">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('booksCreated')}</p>
            <p className="font-bold text-xl text-blue-600">
              {count.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentPurchase {
  name: string;
  city: string;
  product: string;
  timeAgo: string;
  gender: 'male' | 'female';
  isExpress?: boolean;
}

export function RecentPurchases() {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentLanguage = i18n.language;
  
  // Функция для получения правильного глагола в зависимости от рода и языка
  const getCreatedVerb = (gender: 'male' | 'female', language: string): string => {
    if (language === 'ru') {
      return gender === 'male' ? 'Создал' : 'Создала';
    } else if (language === 'hy') {
      return gender === 'male' ? 'Ստեղծեց' : 'Ստեղծեց'; // В армянском глагол не изменяется по роду
    } else { // English
      return 'Created'; // В английском глагол не изменяется по роду
    }
  };
  
  // Адаптивные данные по языкам
  const getPurchasesByLanguage = (): RecentPurchase[] => {
    if (currentLanguage === 'hy') {
      // Армянские имена и данные
      return [
        // Экспресс заказы
        { name: "Նարեկ", city: "Երևան", product: "կնոջս նվեր՝ ամուսնության տարեդարձի առթիվ", timeAgo: "այսօր", gender: "male" as const, isExpress: true },
        { name: "Արտուր", city: "Գյումրի", product: "դստեր ծննդյան օրվա համար", timeAgo: "երեկ", gender: "male" as const, isExpress: true },
        { name: "Լուսինե", city: "Վանաձոր", product: "ծնողների տարեդարձի համար", timeAgo: "2 օր առաջ", gender: "female" as const, isExpress: true },
        
        // Հայկական անուններ և քաղաքներ
        { name: "Արաքսի", city: "Վանաձոր", product: "մորս մարտի 8-ին", timeAgo: "մարտ 8", gender: "female" as const },
        { name: "Դավիթ", city: "Երևան", product: "«Որդու առաջին տարին» ալբոմ", timeAgo: "օգոստոս 3", gender: "male" as const },
        { name: "Մարիամ", city: "Կապան", product: "տատիկի 80-ամյակի համար", timeAgo: "հուլիս 28", gender: "female" as const },
        { name: "Արմեն", city: "Գորիս", product: "հարսանիքի համար", timeAgo: "օգոստոս 12", gender: "male" as const },
        { name: "Անահիտ", city: "Երևան", product: "քեռուստիկի նվեր", timeAgo: "հուլիս 22", gender: "female" as const },
        { name: "Տիգրան", city: "Աշտարակ", product: "Վրաստան ուղևորության մասին", timeAgo: "օգոստոս 7", gender: "male" as const },
        { name: "Սիրանուշ", city: "Երևան", product: "Նոր տարվա համար", timeAgo: "հուլիս 30", gender: "female" as const },
        { name: "Վահագն", city: "Դիլիջան", product: "պապիկի մայիսի 9-ին", timeAgo: "մայիս 9", gender: "male" as const },
        { name: "Ռիփսիմե", city: "Երևան", product: "համալսարանի ավարտակցուհուն", timeAgo: "հուլիս 18", gender: "female" as const },
        { name: "Գրաչյա", city: "Սևան", product: "կնոջս սիրահարների օրվա համար", timeAgo: "փետրվար 14", gender: "male" as const },
        { name: "Զարուհի", city: "Երևան", product: "մկրտության համար", timeAgo: "հուլիս 25", gender: "female" as const },
        { name: "Սամվել", city: "Գավառ", product: "Արցախ ուղևորության մասին", timeAgo: "օգոստոս 9", gender: "male" as const },
        { name: "Անուշ", city: "Երևան", product: "ամուսնության տարեդարձի համար", timeAgo: "հուլիս 20", gender: "female" as const },
        { name: "Արսեն", city: "Ծաղկաձոր", product: "ձմեռային հանգստի համար", timeAgo: "օգոստոս 4", gender: "male" as const },
        { name: "Սյուզաննա", city: "Երևան", product: "եղբորորդու շրջանավարտի համար", timeAgo: "հուլիս 31", gender: "female" as const },
        { name: "Կարեն", city: "Ալավերդի", product: "տատիկի և պապիկի համար", timeAgo: "օգոստոս 6", gender: "male" as const },
        { name: "Լիլիթ", city: "Երևան", product: "ընկերուհուս ծննդյան օրվա համար", timeAgo: "օգոստոս 14", gender: "female" as const },
      ];
    } else if (currentLanguage === 'ru') {
      // Русские имена и данные
      return [
        // Экспресс заказы
        { name: "Нарек", city: "Ереван", product: "жене на годовщину", timeAgo: "сегодня", gender: "male" as const, isExpress: true },
        { name: "Артур", city: "Гюмри", product: "дочери на день рождения", timeAgo: "вчера", gender: "male" as const, isExpress: true },
        { name: "Анна", city: "Москва", product: "на свадьбу", timeAgo: "вчера", gender: "female" as const, isExpress: true },
        
        // Русские имена и города
        { name: "Елена", city: "Москва", product: "сыну в армию", timeAgo: "ноябрь 1", gender: "female" as const },
        { name: "Михаил", city: "СПб", product: "о блокаде Ленинграда", timeAgo: "январь 27", gender: "male" as const },
        { name: "Ольга", city: "Казань", product: "мужу на 23 февраля", timeAgo: "февраль 23", gender: "female" as const },
        { name: "Дмитрий", city: "Новосибирск", product: "семейный альбом на Пасху", timeAgo: "апрель 16", gender: "male" as const },
        { name: "Татьяна", city: "Екатеринбург", product: "на День России", timeAgo: "июнь 12", gender: "female" as const },
        { name: "Владимир", city: "Ростов-на-Дону", product: "о рыбалке", timeAgo: "июль 15", gender: "male" as const },
        { name: "Светлана", city: "Красноярск", product: "на выпускной сына", timeAgo: "июнь 25", gender: "female" as const },
        { name: "Александр", city: "Волгоград", product: "военный альбом ко Дню Победы", timeAgo: "май 9", gender: "male" as const },
        { name: "Наталья", city: "Самара", product: "на золотую свадьбу", timeAgo: "август 10", gender: "female" as const },
        { name: "Игорь", city: "Челябинск", product: "спортивный альбом команды", timeAgo: "июль 28", gender: "male" as const },
        { name: "Марина", city: "Уфа", product: "дочери на 18-летие", timeAgo: "август 5", gender: "female" as const },
        { name: "Сергей", city: "Пермь", product: "охотничий альбом", timeAgo: "сентябрь 12", gender: "male" as const },
        { name: "Людмила", city: "Воронеж", product: "внукам на каникулы", timeAgo: "июнь 1", gender: "female" as const },
        { name: "Андрей", city: "Краснодар", product: "дачный альбом", timeAgo: "август 15", gender: "male" as const },
        { name: "Ирина", city: "Саратов", product: "подруге на юбилей", timeAgo: "июль 20", gender: "female" as const },
        { name: "Виктор", city: "Тюмень", product: "корпоративный альбом", timeAgo: "сентябрь 1", gender: "male" as const },
        { name: "Галина", city: "Иркутск", product: "о поездке на Байкал", timeAgo: "август 8", gender: "female" as const },
      ];
    } else {
      // English names and data
      return [
        // Express orders
        { name: "Narek", city: "Yerevan", product: "gift for wife's anniversary", timeAgo: "today", gender: "male" as const, isExpress: true },
        { name: "Arthur", city: "Gyumri", product: "for daughter's birthday", timeAgo: "yesterday", gender: "male" as const, isExpress: true },
        { name: "Lusine", city: "Paris", product: "for husband's surprise", timeAgo: "3 hours ago", gender: "female" as const, isExpress: true },
        
        // International names and cities
        { name: "Isabella", city: "Rome", product: "for daughter's wedding", timeAgo: "July 14", gender: "female" as const },
        { name: "François", city: "Lyon", product: "wine collection album", timeAgo: "August 18", gender: "male" as const },
        { name: "Emma", city: "London", product: "graduation album", timeAgo: "June 21", gender: "female" as const },
        { name: "Hans", city: "Munich", product: "Oktoberfest memories", timeAgo: "September 22", gender: "male" as const },
        { name: "Sofia", city: "Barcelona", product: "flamenco dance album", timeAgo: "July 12", gender: "female" as const },
        { name: "Pierre", city: "Marseille", product: "sailing adventures", timeAgo: "August 20", gender: "male" as const },
        { name: "Anna", city: "Stockholm", product: "northern lights album", timeAgo: "December 21", gender: "female" as const },
        { name: "Marco", city: "Venice", product: "carnival memories", timeAgo: "February 13", gender: "male" as const },
        { name: "Olivia", city: "Dublin", product: "St. Patrick's Day album", timeAgo: "March 17", gender: "female" as const },
        { name: "Klaus", city: "Vienna", product: "classical concert album", timeAgo: "January 1", gender: "male" as const },
        { name: "Maria", city: "Madrid", product: "family vacation album", timeAgo: "August 25", gender: "female" as const },
        { name: "Jean", city: "Brussels", product: "chocolate festival album", timeAgo: "September 5", gender: "male" as const },
        { name: "Erik", city: "Copenhagen", product: "cycling tour album", timeAgo: "July 30", gender: "male" as const },
        { name: "Petra", city: "Prague", product: "Christmas market album", timeAgo: "December 24", gender: "female" as const },
        { name: "Lucas", city: "Amsterdam", product: "tulip season album", timeAgo: "April 15", gender: "male" as const },
        { name: "Ingrid", city: "Oslo", product: "aurora borealis album", timeAgo: "January 20", gender: "female" as const },
        { name: "Dimitris", city: "Athens", product: "ancient sites album", timeAgo: "June 10", gender: "male" as const },
        { name: "Magdalena", city: "Warsaw", product: "folk festival album", timeAgo: "August 12", gender: "female" as const },
      ];
    }
  };
  
  const purchases = getPurchasesByLanguage();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % purchases.length);
    }, 6000); // Увеличил интервал до 6 секунд для реалистичности
    
    return () => clearInterval(interval);
  }, [purchases.length, currentLanguage]);
  
  // Сбрасываем индекс при смене языка
  useEffect(() => {
    setCurrentIndex(0);
  }, [currentLanguage]);

  const currentPurchase = purchases[currentIndex];

  return (
    <Card className={`${currentPurchase.isExpress 
      ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200' 
      : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-2 ${currentPurchase.isExpress 
            ? 'bg-orange-500 animate-pulse' 
            : 'bg-green-500 pulse-soft'
          }`}></div>
          <div className="flex-1">
            {currentPurchase.isExpress && (
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  🔥 {t('expressServiceTitle')}
                </span>
              </div>
            )}
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-blue-600">{currentPurchase.name} - {currentPurchase.city}</span>{' '}
              <span className="text-gray-600">{getCreatedVerb(currentPurchase.gender, currentLanguage)} {t('photobook')}</span>{' '}
              <span className="text-gray-700">{currentPurchase.product}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">{currentPurchase.timeAgo}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QualityGuarantee() {
  const { t } = useTranslation();
  
  const guarantees = [
    { 
      icon: "🏆", 
      title: t('qualityGuaranteeTitle'), 
      desc: t('qualityGuaranteeDesc') 
    },
    { 
      icon: "⚡", 
      title: t('fastProductionTitle'), 
      desc: t('fastProductionDesc') 
    },
    { 
      icon: "🚚", 
      title: t('freeShippingTitle'), 
      desc: t('freeShippingDesc') 
    },
    { 
      icon: "💎", 
      title: t('premiumQuality'), 
      desc: t('professionalPrint') 
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {guarantees.map((item, index) => (
        <Card key={index} className="card-hover text-center border-0 bg-gradient-to-br from-white to-gray-50">
          <CardContent className="p-6">
            <div className="text-3xl mb-3">{item.icon}</div>
            <h4 className="font-semibold text-gray-800 mb-2">{item.title}</h4>
            <p className="text-sm text-gray-600">{item.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface OnlineUsersProps {
  baseCount?: number;
}

export function OnlineUsers({ baseCount = 8 }: OnlineUsersProps) {
  const [count, setCount] = useState(baseCount);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const newCount = prev + change;
        return Math.max(3, Math.min(25, newCount)); // Keep between 3-25
      });
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse">
      🔥 {count} человек сейчас создают книги
    </Badge>
  );
}

// Главный компонент, объединяющий все индикаторы доверия
export function TrustIndicators() {
  return (
    <div className="space-y-6">
      {/* Верхняя строка с онлайн пользователями */}
      <div className="flex justify-center">
        <OnlineUsers />
      </div>
      
      {/* Блок счетчиков */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LiveCounter />
        <RecentPurchases />
      </div>
      
      {/* Блок гарантий */}
      <QualityGuarantee />
    </div>
  );
}