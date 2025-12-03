import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { buildAlternateUrls } from '@/lib/localePath';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ContactSection from "@/components/ContactSection";

const Contacts: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as "ru" | "hy" | "en";

  return (
    <>
      <Helmet htmlAttributes={{ lang: ((): any => {
        const m = window.location.pathname.match(/^\/(ru|hy|en)(?:\/?|$)/);
        return m ? m[1] : 'x-default';
      })() }}>
        <title>{t('contactsPageTitle')}</title>
        <meta name="description" content={t('contactsPageDescription')} />
        <meta name="keywords" content="контакты, PhotoBooksGallery, связаться, WhatsApp, Telegram, Instagram, поддержка, Армения" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://photobooksgallery.am/contacts" />
        <meta property="og:title" content={t('contactsPageTitle')} />
        <meta property="og:description" content={t('contactsPageDescription')} />
        <meta property="og:image" content="https://photobooksgallery.am/og-image.jpg" />
        <meta property="og:site_name" content="PhotoBooksGallery" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://photobooksgallery.am/contacts" />
        <meta property="twitter:title" content={t('contactsPageTitle')} />
        <meta property="twitter:description" content={t('contactsPageDescription')} />
        <meta property="twitter:image" content="https://photobooksgallery.am/og-image.jpg" />
        <meta name="twitter:site" content="@photobooksgallery" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PhotoBooksGallery" />
        <link rel="canonical" href={`https://photobooksgallery.am${window.location.pathname}`} />
        {/* hreflang for multilingual support (path prefixes) */}
        {(() => {
          const alt = buildAlternateUrls('https://photobooksgallery.am', window.location.pathname);
          return (
            <>
              <link rel="alternate" hrefLang="ru" href={alt.ru} />
              <link rel="alternate" hrefLang="hy" href={alt.hy} />
              <link rel="alternate" hrefLang="en" href={alt.en} />
              <link rel="alternate" hrefLang="x-default" href={alt.xDefault} />
            </>
          );
        })()}
      </Helmet>
      
      <Header />
      <div className="min-h-screen bg-white pt-20">
        <ContactSection />
      </div>
      <Footer />
    </>
  );
};

export default Contacts;