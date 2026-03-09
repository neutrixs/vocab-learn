import { createContext, useContext, useState, type ReactNode } from 'react';

interface LanguageContextValue {
  lang: string;
  setLang: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'tr',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<string>(() => {
    return localStorage.getItem('vocab_lang') ?? 'tr';
  });

  function handleSetLang(l: string) {
    setLang(l);
    localStorage.setItem('vocab_lang', l);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
