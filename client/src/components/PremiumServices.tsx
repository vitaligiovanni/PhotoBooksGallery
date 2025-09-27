import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Clock, Camera, Truck, Star, Sparkles, Zap, Smartphone, QrCode, Play, ArrowRight } from 'lucide-react';

export const PremiumServices: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="py-24 px-4 bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок секции */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            {t('expressServiceSubtitle')}
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('premiumQuality')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('qualityAndService')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Экспресс-услуга: Фотокнига за один день */}
          <Card className={`group relative overflow-hidden border-0 shadow-2xl transition-all duration-700 hover:scale-105 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 opacity-90"></div>
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Анимированные частицы */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/20 rounded-full animate-pulse"></div>
              <div className="absolute top-1/2 -left-5 w-10 h-10 bg-white/15 rounded-full animate-bounce"></div>
              <div className="absolute bottom-10 right-1/4 w-6 h-6 bg-white/25 rounded-full animate-ping"></div>
            </div>

            <CardContent className="relative z-10 p-8 h-full flex flex-col">
              <div className="flex items-center mb-6">
                <div className="bg-white/20 p-3 rounded-full mr-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <Badge className="bg-yellow-300 text-yellow-900 mb-2">⚡ {t('expressServiceTitle')}</Badge>
                  <h3 className="text-2xl font-bold text-white">{t('expressServiceTitle')}</h3>
                </div>
              </div>

              <p className="text-white/90 text-lg mb-8 leading-relaxed">
                {t('expressServiceSubtitle')}
              </p>

              {/* Процесс */}
              <div className="space-y-4 mb-8 flex-1">
                <div className="flex items-center text-white/90">
                  <Camera className="w-5 h-5 mr-3 text-yellow-300" />
                  <span>{t('expressServiceStep1Desc')}</span>
                </div>
                <div className="flex items-center text-white/90">
                  <Clock className="w-5 h-5 mr-3 text-yellow-300" />
                  <span>{t('expressServiceStep2Desc')}</span>
                </div>
                <div className="flex items-center text-white/90">
                  <Truck className="w-5 h-5 mr-3 text-yellow-300" />
                  <span>{t('expressServiceStep3Desc')}</span>
                </div>
                <div className="flex items-center text-white/90">
                  <Star className="w-5 h-5 mr-3 text-yellow-300" />
                  <span>{t('expressServicePrice')}</span>
                </div>
              </div>

              <div className="mt-auto">
                <div className="bg-white/20 rounded-lg p-4 mb-6">
                  <p className="text-white font-semibold text-center">
                    {t('saveMemories')}
                  </p>
                </div>
                
                <Button className="w-full bg-white text-orange-600 hover:bg-gray-100 font-bold py-3 transition-all duration-300 group-hover:shadow-lg">
                  {t('expressServiceButton')}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AR услуга: Оживающие фотографии */}
          <Card className={`group relative overflow-hidden border-0 shadow-2xl transition-all duration-700 hover:scale-105 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 opacity-90"></div>
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Анимированные элементы */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-10 right-10 w-16 h-16 border-2 border-white/30 rounded-full animate-spin"></div>
              <div className="absolute bottom-20 left-10 w-8 h-8 bg-cyan-300/40 rounded-full animate-pulse"></div>
              <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-white/50 rounded-full animate-bounce"></div>
            </div>

            <CardContent className="relative z-10 p-8 h-full flex flex-col">
              <div className="flex items-center mb-6">
                <div className="bg-white/20 p-3 rounded-full mr-4">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <div>
                  <Badge className="bg-cyan-300 text-cyan-900 mb-2">🚀 {t('arServiceTitle')}</Badge>
                  <h3 className="text-2xl font-bold text-white">{t('arServiceTitle')}</h3>
                </div>
              </div>

              <p className="text-white/90 text-lg mb-8 leading-relaxed">
                {t('arServiceSubtitle')}
              </p>

              {/* Процесс AR */}
              <div className="space-y-4 mb-8 flex-1">
                <div className="flex items-center text-white/90">
                  <QrCode className="w-5 h-5 mr-3 text-cyan-300" />
                  <span>{t('arServiceStep1Desc')}</span>
                </div>
                <div className="flex items-center text-white/90">
                  <Smartphone className="w-5 h-5 mr-3 text-cyan-300" />
                  <span>{t('arServiceStep2Desc')}</span>
                </div>
                <div className="flex items-center text-white/90">
                  <Camera className="w-5 h-5 mr-3 text-cyan-300" />
                  <span>{t('arServiceStep3Desc')}</span>
                </div>
                <div className="flex items-center text-white/90">
                  <Play className="w-5 h-5 mr-3 text-cyan-300" />
                  <span>{t('arServicePrice')}</span>
                </div>
              </div>

              <div className="mt-auto">
                <div className="bg-white/20 rounded-lg p-4 mb-6">
                  <p className="text-white font-semibold text-center">
                    {t('aboutCTASubtitle')} ✨
                  </p>
                </div>
                
                <Button className="w-full bg-white text-purple-600 hover:bg-gray-100 font-bold py-3 transition-all duration-300 group-hover:shadow-lg">
                  {t('arServiceButton')}
                  <Sparkles className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Дополнительная информация */}
        <div className={`mt-16 text-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 max-w-4xl mx-auto">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">
              {t('whyChooseUs')}
            </h4>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h5 className="font-semibold text-gray-900 mb-2">{t('premiumQuality')}</h5>
                <p className="text-gray-600">{t('professionalPrint')}</p>
              </div>
              <div>
                <div className="bg-orange-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h5 className="font-semibold text-gray-900 mb-2">{t('fastDelivery')}</h5>
                <p className="text-gray-600">{t('fastDeliveryDesc')}</p>
              </div>
              <div>
                <div className="bg-cyan-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h5 className="font-semibold text-gray-900 mb-2">{t('easyEditor')}</h5>
                <p className="text-gray-600">{t('easyEditorDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumServices;