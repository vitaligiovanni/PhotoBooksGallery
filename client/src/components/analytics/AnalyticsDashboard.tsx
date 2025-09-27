import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, Eye, MousePointer, Target, BarChart3, PieChart, Activity } from "lucide-react";
import type { Banner, Popup, SpecialOffer, BannerAnalytics } from "@shared/schema";

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7d"); // 7d, 30d, 90d

  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners"]
  });

  const { data: popups = [] } = useQuery<Popup[]>({
    queryKey: ["/api/popups"]
  });

  const { data: specialOffers = [] } = useQuery<SpecialOffer[]>({
    queryKey: ["/api/special-offers"]
  });

  const { data: bannerAnalytics = [] } = useQuery<BannerAnalytics[]>({
    queryKey: ["/api/analytics/banner-analytics", timeRange]
  });

  const isLoading = !banners || !popups || !specialOffers || !bannerAnalytics;

  // Расчет метрик
  const totalBannerImpressions = banners.reduce((sum, banner) => sum + (banner.currentImpressions || 0), 0);
  const totalBannerClicks = banners.reduce((sum, banner) => sum + (banner.currentClicks || 0), 0);
  const totalPopupImpressions = popups.reduce((sum, popup) => sum + (popup.currentImpressions || 0), 0);
  const totalPopupClicks = popups.reduce((sum, popup) => sum + (popup.currentClicks || 0), 0);
  const totalOfferUses = specialOffers.reduce((sum, offer) => sum + (offer.currentUses || 0), 0);

  const overallCTR = totalBannerImpressions > 0 ? (totalBannerClicks / totalBannerImpressions) * 100 : 0;
  const popupCTR = totalPopupImpressions > 0 ? (totalPopupClicks / totalPopupImpressions) * 100 : 0;

  // Лучшие performers
  const topBanners = [...banners]
    .filter(b => (b.currentImpressions || 0) > 0)
    .sort((a, b) => {
      const ctrA = (a.currentClicks || 0) / (a.currentImpressions || 1);
      const ctrB = (b.currentClicks || 0) / (b.currentImpressions || 1);
      return ctrB - ctrA;
    })
    .slice(0, 5);

  const topPopups = [...popups]
    .filter(p => (p.currentImpressions || 0) > 0)
    .sort((a, b) => {
      const ctrA = (a.currentClicks || 0) / (a.currentImpressions || 1);
      const ctrB = (b.currentClicks || 0) / (b.currentImpressions || 1);
      return ctrB - ctrA;
    })
    .slice(0, 5);

  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    color = "blue"
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    color?: string;
  }) => (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Аналитика маркетинговых инструментов</h1>
          <p className="text-muted-foreground mt-2">Отслеживайте эффективность баннеров, попапов и специальных предложений</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 дней</SelectItem>
              <SelectItem value="30d">30 дней</SelectItem>
              <SelectItem value="90d">90 дней</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Показы баннеров"
          value={totalBannerImpressions.toLocaleString()}
          icon={Eye}
          color="blue"
        />
        <MetricCard
          title="Клики по баннерам"
          value={totalBannerClicks.toLocaleString()}
          icon={MousePointer}
          color="green"
        />
        <MetricCard
          title="CTR баннеров"
          value={`${overallCTR.toFixed(1)}%`}
          icon={Target}
          color="purple"
        />
        <MetricCard
          title="Использований предложений"
          value={totalOfferUses.toLocaleString()}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="banners" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="banners">Баннеры</TabsTrigger>
          <TabsTrigger value="popups">Попапы</TabsTrigger>
          <TabsTrigger value="offers">Предложения</TabsTrigger>
        </TabsList>

        <TabsContent value="banners" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Banner Performance Table */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Эффективность баннеров
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {banners.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Нет активных баннеров</p>
                  ) : (
                    banners.map((banner) => {
                      const ctr = (banner.currentImpressions || 0) > 0
                        ? ((banner.currentClicks || 0) / (banner.currentImpressions || 1)) * 100
                        : 0;

                      return (
                        <div key={banner.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{banner.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {banner.currentImpressions || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointer className="h-3 w-3" />
                                {banner.currentClicks || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {ctr.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <Badge variant={banner.isActive ? "default" : "secondary"}>
                            {banner.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Banners */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Лучшие баннеры по CTR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topBanners.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Недостаточно данных</p>
                  ) : (
                    topBanners.map((banner, index) => {
                      const ctr = ((banner.currentClicks || 0) / (banner.currentImpressions || 1)) * 100;

                      return (
                        <div key={banner.id} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{banner.name}</p>
                            <p className="text-sm text-muted-foreground">{ctr.toFixed(1)}% CTR</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="popups" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popup Performance Table */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Эффективность попапов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {popups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Нет активных попапов</p>
                  ) : (
                    popups.map((popup) => {
                      const ctr = (popup.currentImpressions || 0) > 0
                        ? ((popup.currentClicks || 0) / (popup.currentImpressions || 1)) * 100
                        : 0;

                      return (
                        <div key={popup.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{popup.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {popup.currentImpressions || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointer className="h-3 w-3" />
                                {popup.currentClicks || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {ctr.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <Badge variant={popup.isActive ? "default" : "secondary"}>
                            {popup.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Popups */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Лучшие попапы по CTR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPopups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Недостаточно данных</p>
                  ) : (
                    topPopups.map((popup, index) => {
                      const ctr = ((popup.currentClicks || 0) / (popup.currentImpressions || 1)) * 100;

                      return (
                        <div key={popup.id} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{popup.name}</p>
                            <p className="text-sm text-muted-foreground">{ctr.toFixed(1)}% CTR</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Special Offers Performance */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Специальные предложения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {specialOffers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Нет активных предложений</p>
                  ) : (
                    specialOffers.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{offer.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {offer.currentUses || 0} использований
                            </span>
                            {offer.maxUses && (
                              <span className="text-xs">
                                (макс. {offer.maxUses})
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={offer.isActive ? "default" : "secondary"}>
                          {offer.isActive ? "Активно" : "Неактивно"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Offers Summary */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Сводка по предложениям
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{specialOffers.filter(o => o.isActive).length}</p>
                      <p className="text-sm text-blue-600">Активных</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{totalOfferUses}</p>
                      <p className="text-sm text-green-600">Использований</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">По типам скидок:</h4>
                    {['percentage', 'fixed', 'free_shipping'].map(type => {
                      const count = specialOffers.filter(o => o.discountType === type).length;
                      const typeLabels = {
                        percentage: 'Процентные',
                        fixed: 'Фиксированные',
                        free_shipping: 'Бесплатная доставка'
                      };

                      return count > 0 ? (
                        <div key={type} className="flex justify-between text-sm">
                          <span>{typeLabels[type as keyof typeof typeLabels]}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}