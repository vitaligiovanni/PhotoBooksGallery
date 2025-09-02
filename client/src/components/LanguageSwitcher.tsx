import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'ru', label: '🇷🇺 RU', name: 'Русский' },
    { code: 'hy', label: '🇦🇲 HY', name: 'Հայերեն' },
    { code: 'en', label: '🇺🇸 EN', name: 'English' }
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-20 border-border" data-testid="select-language">
        <SelectValue>{currentLanguage.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((language) => (
          <SelectItem key={language.code} value={language.code} data-testid={`option-lang-${language.code}`}>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
