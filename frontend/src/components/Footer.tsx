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
              <span className="font-serif font-bold text-xl">PhotoBooksGallery</span>
            </div>
            <p className="text-background/80 text-sm leading-relaxed">
              {t('companyDescription')}
            </p>
            <div className="flex space-x-4">
              <a href="https://instagram.com/photo_books_gallery" target="_blank" rel="noopener noreferrer">
                <Instagram className="text-background/60 hover:text-primary cursor-pointer transition-colors h-5 w-5" />
              </a>
              <a href="https://wa.me/37455548840" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="text-background/60 hover:text-primary cursor-pointer transition-colors h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('categories')}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/catalog/photobooks" className="text-background/80 hover:text-primary transition-colors">{t('photobooks')}</a></li>
              <li><a href="/catalog/frames" className="text-background/80 hover:text-primary transition-colors">{t('photoframes')}</a></li>
              <li><a href="/catalog/boxes" className="text-background/80 hover:text-primary transition-colors">{t('giftBoxes')}</a></li>
              <li><a href="/catalog/souvenirs" className="text-background/80 hover:text-primary transition-colors">{t('photoSouvenirs')}</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('support')}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">{t('help')}</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">{t('shipping')}</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">{t('returns')}</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">{t('qualityGuarantee')}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('contacts')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="text-primary h-4 w-4" />
                <span className="text-background/80">+374 55 54-88-40</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="text-primary h-4 w-4" />
                <span className="text-background/80">info@photobooksgallery.am</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="text-primary h-4 w-4 mt-1" />
                <span className="text-background/80">Армения (онлайн-сервис)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 text-center">
          <p className="text-background/60 text-sm">
            © 2024 PhotoBooksGallery. {t('allRightsReserved')}. | 
            <a href="#" className="hover:text-primary transition-colors ml-1">{t('privacyPolicy')}</a> | 
            <a href="#" className="hover:text-primary transition-colors ml-1">{t('termsOfService')}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
