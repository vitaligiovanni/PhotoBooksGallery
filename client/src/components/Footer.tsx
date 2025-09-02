import { useTranslation } from 'react-i18next';
import { Camera, Instagram, Facebook, MessageCircle, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Camera className="text-primary text-2xl" />
              <span className="font-serif font-bold text-xl">ФотоКрафт</span>
            </div>
            <p className="text-background/80 text-sm leading-relaxed">
              Создаем качественные фотокниги и сувениры для сохранения ваших драгоценных воспоминаний.
            </p>
            <div className="flex space-x-4">
              <Instagram className="text-background/60 hover:text-primary cursor-pointer transition-colors h-5 w-5" />
              <Facebook className="text-background/60 hover:text-primary cursor-pointer transition-colors h-5 w-5" />
              <MessageCircle className="text-background/60 hover:text-primary cursor-pointer transition-colors h-5 w-5" />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Категории</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/catalog/photobooks" className="text-background/80 hover:text-primary transition-colors">Фотокниги</a></li>
              <li><a href="/catalog/frames" className="text-background/80 hover:text-primary transition-colors">Фоторамки</a></li>
              <li><a href="/catalog/boxes" className="text-background/80 hover:text-primary transition-colors">Подарочные коробки</a></li>
              <li><a href="/catalog/souvenirs" className="text-background/80 hover:text-primary transition-colors">Фото-сувениры</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Поддержка</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Помощь</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Доставка</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Возврат</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Гарантия качества</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Контакты</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="text-primary h-4 w-4" />
                <span className="text-background/80">+7 (495) 123-45-67</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="text-primary h-4 w-4" />
                <span className="text-background/80">info@fotocraft.ru</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="text-primary h-4 w-4 mt-1" />
                <span className="text-background/80">Москва, ул. Примерная, д. 123</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 text-center">
          <p className="text-background/60 text-sm">
            © 2024 ФотоКрафт. Все права защищены. | 
            <a href="#" className="hover:text-primary transition-colors ml-1">Политика конфиденциальности</a> | 
            <a href="#" className="hover:text-primary transition-colors ml-1">Условия использования</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
