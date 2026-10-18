import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations.ts';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: keyof typeof translations['so'], replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('somplay_lang');
    return saved === 'en' ? 'en' : 'so'; // Default to Somali
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('somplay_lang', newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'so' ? 'en' : 'so');
  };

  const t = (key: keyof typeof translations['so'], replacements?: Record<string, string | number>): string => {
    const dict = translations[lang] || translations.so;
    let text = (dict[key] as string) || (translations.en[key] as string) || String(key);

    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, val]) => {
        text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(val));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
