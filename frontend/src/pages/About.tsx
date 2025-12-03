import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { buildAlternateUrls } from '@/lib/localePath';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const About: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as "ru" | "hy" | "en";

  return (
    <>
      <Helmet htmlAttributes={{ lang: ((): any => {
        const m = window.location.pathname.match(/^\/(ru|hy|en)(?:\/?|$)/);
        return m ? m[1] : 'x-default';
      })() }}>
        <title>{t('aboutPageTitle')}</title>
        <meta name="description" content={t('aboutPageDescription')} />
        <meta name="keywords" content="PhotoBooksGallery, о компании, фотокниги, история, команда, качество" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://photobooksgallery.am/about" />
        <meta property="og:title" content={t('aboutPageTitle')} />
        <meta property="og:description" content={t('aboutPageDescription')} />
        <meta property="og:image" content="https://photobooksgallery.am/og-image.jpg" />
        <meta property="og:site_name" content="PhotoBooksGallery" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://photobooksgallery.am/about" />
        <meta property="twitter:title" content={t('aboutPageTitle')} />
        <meta property="twitter:description" content={t('aboutPageDescription')} />
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
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 pt-20 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                {t('aboutHeroTitle')}
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 mb-8">
                {t('aboutHeroSubtitle')}
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
                {t('createPhotobook')}
              </button>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                {t('aboutMissionTitle')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                {t('aboutMissionText')}
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
              {t('aboutWhyChooseTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: '🎨',
                  title: t('onlineEditor'),
                  description: t('onlineEditorDesc')
                },
                {
                  icon: '⚡',
                  title: t('fastPrinting'),
                  description: t('fastPrintingDesc')
                },
                {
                  icon: '⭐',
                  title: t('quality'),
                  description: t('qualityDesc')
                },
                {
                  icon: '❤️',
                  title: t('care'),
                  description: t('careDesc')
                }
              ].map((item, index) => (
                <div key={index} className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brand Story */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-8">
                {t('aboutStoryTitle')}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="w-full h-64 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg"></div>
                </div>
                <div>
                  <p className="text-lg text-gray-700 mb-4">
                    {t('aboutStoryText1')}
                  </p>
                  <p className="text-lg text-gray-700">
                    {t('aboutStoryText2')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
              {t('aboutTeamTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Анна Петрова',
                  role: 'Основатель и креативный директор',
                  image: '/images/team-1.jpg'
                },
                {
                  name: 'Максим Иванов',
                  role: 'Главный дизайнер',
                  image: '/images/team-2.jpg'
                },
                {
                  name: 'Елена Сидорова',
                  role: 'Менеджер по работе с клиентами',
                  image: '/images/team-3.jpg'
                }
              ].map((member, index) => (
                <div key={index} className="text-center">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-r from-blue-300 to-purple-300 rounded-full mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{member.name}</h3>
                  <p className="text-gray-600">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
              {t('aboutTestimonialsTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  text: 'Заказывала фотокнигу на годовщину свадьбы. Качество превзошло все ожидания! Страницы плотные, печать чёткая. Муж был в восторге!',
                  author: 'Мария К., Москва'
                },
                {
                  text: 'Сделал подарок родителям - фотоальбом с семейными фото. Онлайн редактор очень удобный, собрал всё за вечер. Родители плакали от счастья!',
                  author: 'Алексей П., Санкт-Петербург'
                },
                {
                  text: 'Постоянно заказываю фотосувениры для бизнеса. Качество печати отличное, клиенты всегда довольны. Рекомендую!',
                  author: 'Ольга С., Екатеринбург'
                }
              ].map((testimonial, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                  <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                  <p className="text-gray-900 font-semibold">{testimonial.author}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {t('aboutCTATitle')}
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                {t('aboutCTASubtitle')}
              </p>
              <button className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
                {t('aboutCTAButton')}
              </button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default About;
