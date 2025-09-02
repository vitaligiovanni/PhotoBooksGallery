import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Medal, Truck, Palette, Headphones, Star } from "lucide-react";

export default function Landing() {
  const { t } = useTranslation();

  const scrollToEditor = () => {
    document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="hero-gradient text-white py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight" data-testid="text-hero-title">
                {t('heroTitle')}
              </h1>
              <p className="text-xl opacity-90 leading-relaxed" data-testid="text-hero-subtitle">
                {t('heroSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 shadow-lg"
                  onClick={scrollToEditor}
                  data-testid="button-create-photobook"
                >
                  {t('createPhotobook')}
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-primary"
                  data-testid="button-view-examples"
                >
                  {t('viewExamples')}
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="grid grid-cols-2 gap-4 transform rotate-3">
                <img src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                     alt="Elegant leather photobook" 
                     className="rounded-xl shadow-2xl transform -rotate-6" />
                <img src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                     alt="Open wedding photobook" 
                     className="rounded-xl shadow-2xl transform rotate-6 mt-8" />
                <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                     alt="Family vacation photobook" 
                     className="rounded-xl shadow-2xl transform rotate-3 -mt-4" />
                <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                     alt="Baby memories photobook" 
                     className="rounded-xl shadow-2xl transform -rotate-3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-categories-title">
              {t('categoriesTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-categories-subtitle">
              {t('categoriesSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Mock categories */}
            {[
              { name: t('photobooks'), slug: 'photobooks', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
              { name: t('photoframes'), slug: 'frames', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
              { name: t('giftBoxes'), slug: 'boxes', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
              { name: t('photoSouvenirs'), slug: 'souvenirs', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' }
            ].map((category) => (
              <Card key={category.slug} className="category-card cursor-pointer border border-border hover:border-primary transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white/90 to-white/70 hover:from-white hover:to-white/90" data-testid={`card-category-${category.slug}`}>
                <CardContent className="p-6 text-center">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-2">{category.name}</h3>
                  <span className="inline-flex items-center text-primary font-medium">
                    {t('viewAll')}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Editor Section */}
      <section id="editor" className="py-16 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-editor-title">
              {t('editorTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Создайте уникальную фотокнигу за несколько минут с помощью нашего простого редактора
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('uploadPhotos')}</h3>
                  <p className="text-muted-foreground">Перетащите ваши любимые фото или выберите их из галереи</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('autoLayout')}</h3>
                  <p className="text-muted-foreground">Наш алгоритм создаст красивую раскладку на 10 разворотов</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('personalize')}</h3>
                  <p className="text-muted-foreground">Добавьте текст, измените порядок фото и настройте дизайн</p>
                </div>
              </div>

              <Button 
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-start-creating"
              >
                {t('startCreating')}
              </Button>
            </div>

            <div className="relative">
              <Card className="border-2 border-dashed border-border">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                    <Palette className="text-primary text-2xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Перетащите фото сюда</h3>
                    <p className="text-muted-foreground text-sm">или нажмите для выбора файлов</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">Почему выбирают нас</h2>
            <p className="text-muted-foreground text-lg">Качество и сервис на высшем уровне</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Medal className="text-primary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Премиум качество</h3>
              <p className="text-muted-foreground text-sm">Профессиональная печать на лучших материалах</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="text-secondary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Быстрая доставка</h3>
              <p className="text-muted-foreground text-sm">Доставим ваш заказ в течение 3-5 рабочих дней</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palette className="text-accent h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Легкий редактор</h3>
              <p className="text-muted-foreground text-sm">Интуитивный интерфейс для создания фотокниг</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="text-primary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Поддержка 24/7</h3>
              <p className="text-muted-foreground text-sm">Всегда готовы помочь с вашими вопросами</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">Отзывы клиентов</h2>
            <p className="text-muted-foreground text-lg">Что говорят о нас наши клиенты</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: 'Анна Петрова', review: 'Заказывала свадебную фотокнигу - качество печати превзошло все ожидания! Редактор очень удобный, создала книгу за час.' },
              { name: 'Михаил Иванов', review: 'Быстрая доставка и отличная упаковка. Фотокнига о путешествии получилась просто шикарной. Обязательно закажу еще!' },
              { name: 'Елена Смирнова', review: 'Заказывала детский фотоальбом. Качество бумаги и печати на высоте. Ребенок в восторге от своей книжки!' }
            ].map((testimonial, index) => (
              <Card key={index} className="border border-border">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                      <span className="text-primary font-semibold">{testimonial.name[0]}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                      <div className="flex text-accent">
                        {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.review}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 hero-gradient text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
            Готовы создать свою фотокнигу?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Сохраните ваши воспоминания в красивой фотокниге. 
            Начните прямо сейчас и получите скидку 15% на первый заказ!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-cta-create"
            >
              {t('createPhotobook')}
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary"
              data-testid="button-cta-contact"
            >
              Связаться с нами
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
