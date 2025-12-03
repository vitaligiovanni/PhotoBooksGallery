import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Instagram, 
  Facebook, 
  Mail, 
  Phone, 
  Video,
  Users,
  Clock,
  Zap
} from 'lucide-react';

const ContactSection = () => {
  const { t } = useTranslation();

  const contactMethods = [
    {
      key: 'whatsapp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      link: 'https://wa.me/37477548840',
      iconColor: 'text-white'
    },
    {
      key: 'telegram',
      icon: Send,
      color: 'bg-blue-500 hover:bg-blue-600',
      link: 'https://t.me/photobook_support',
      iconColor: 'text-white'
    },
    {
      key: 'instagram',
      icon: Instagram,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      link: 'https://instagram.com/photo_books_gallery',
      iconColor: 'text-white'
    },
    {
      key: 'facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      link: 'https://m.me/photobook.ru',
      iconColor: 'text-white'
    },
    {
      key: 'email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-700',
      link: 'mailto:info@photobooksgallery.am',
      iconColor: 'text-white'
    },
    {
      key: 'viber',
      icon: Phone,
      color: 'bg-purple-600 hover:bg-purple-700',
      link: 'viber://chat?number=37455548840',
      iconColor: 'text-white'
    },
    {
      key: 'skype',
      icon: Video,
      color: 'bg-blue-400 hover:bg-blue-500',
      link: 'skype:photobook.support?chat',
      iconColor: 'text-white'
    },
    {
      key: 'vk',
      icon: Users,
      color: 'bg-blue-800 hover:bg-blue-900',
      link: 'https://vk.com/photobook_ru',
      iconColor: 'text-white'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 rounded-full opacity-30 -translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-100 rounded-full opacity-30 translate-x-40 translate-y-40"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
          >
            {t('contactTitle')}
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto"
          >
            {t('contactSubtitle')}
          </motion.p>
          <motion.p 
            variants={itemVariants}
            className="text-lg text-gray-500 max-w-2xl mx-auto"
          >
            {t('contactDescription')}
          </motion.p>
        </motion.div>

        {/* Contact Methods Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {contactMethods.map((method, index) => {
            const IconComponent = method.icon;
            return (
              <motion.a
                key={method.key}
                href={method.link}
                target="_blank"
                rel="noopener noreferrer"
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
                className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-gray-200"
              >
                <div className={`w-16 h-16 ${method.color} rounded-xl flex items-center justify-center mb-4 mx-auto transition-all duration-300 group-hover:scale-110`}>
                  <IconComponent className={`w-8 h-8 ${method.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  {t(`${method.key}Title`)}
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  {t(`${method.key}Desc`)}
                </p>
              </motion.a>
            );
          })}
        </motion.div>

        {/* Contact Info Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">{t('phoneLabel')}</h4>
            <p className="text-blue-600 font-medium">{t('phoneNumber')}</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">{t('emailLabel')}</h4>
            <p className="text-green-600 font-medium">{t('emailAddress')}</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">{t('workingHoursLabel')}</h4>
            <p className="text-purple-600 font-medium">{t('workingHours')}</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">{t('responseTimeLabel')}</h4>
            <p className="text-orange-600 font-medium">{t('responseTime')}</p>
          </motion.div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              {t('contactCTATitle')}
            </h3>
            <p className="text-lg mb-6 opacity-90">
              {t('contactCTASubtitle')}
            </p>
            <motion.a
              href="https://wa.me/37477548840"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors duration-200"
            >
              <MessageCircle className="w-5 h-5" />
              {t('contactCTAButton')}
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;