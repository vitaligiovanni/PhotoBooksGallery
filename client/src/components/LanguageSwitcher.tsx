import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlagIcon } from '@/components/FlagIcon';

// Флаги: hy (Армения), ru (Россия), en (США)
// Оставляем только флаг как визуальный индикатор

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'hy', name: 'Armenian' },
    { code: 'ru', name: 'Russian' },
    { code: 'en', name: 'English' },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-12 h-9 px-2 justify-center border-border" data-testid="select-language" aria-label="Change language">
        <SelectValue aria-hidden>
          <FlagIcon code={currentLanguage.code as any} size={20} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[90px] p-1">
        {languages.map((language) => (
          <SelectItem
            key={language.code}
            value={language.code}
            data-testid={`option-lang-${language.code}`}
            className="cursor-pointer flex items-center justify-center p-2 h-9"
          >
            <FlagIcon code={language.code as any} size={22} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
