import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlagIcon } from '@/components/FlagIcon';
import { useEffect } from 'react';

// Флаги: hy (Армения), ru (Россия), en (США)
// Оставляем только флаг как визуальный индикатор

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'hy', name: 'Armenian' },
    { code: 'ru', name: 'Russian' },
    { code: 'en', name: 'English' },
  ];

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === i18n.language) return;
    console.log('🔄 Переключение языка:', { from: i18n.language, to: languageCode });
    try {
      await i18n.changeLanguage(languageCode);
      // Сохраняем только наш ключ
      localStorage.setItem('app_language', languageCode);
      // Не перезагружаем страницу — убираем мерцание
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: languageCode }));
      console.log('✅ Переключено без перезагрузки');
    } catch (e) {
      console.error('❌ Ошибка переключения языка:', e);
    }
  };

  // Отслеживаем изменения языка
  useEffect(() => {
    const handleLanguageChanged = () => {
      console.log('📢 Язык изменен:', i18n.language);
    };
    
    i18n.on('languageChanged', handleLanguageChanged);
    return () => i18n.off('languageChanged', handleLanguageChanged);
  }, [i18n]);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  // console.log('🌐 LanguageSwitcher render:', { currentLang: i18n.language }); // временно отключено для снижения шума

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-10 h-9 px-1 justify-center border-border" data-testid="select-language" aria-label="Change language">
        <SelectValue aria-hidden>
          <FlagIcon code={currentLanguage.code as any} size={20} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-0 px-0 py-1">
        {languages.map((language) => (
          <SelectItem
            key={language.code}
            value={language.code}
            data-testid={`option-lang-${language.code}`}
            className="cursor-pointer flex items-center justify-center h-9 px-0"
          >
            <FlagIcon code={language.code as any} size={22} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
