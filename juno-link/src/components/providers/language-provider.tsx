"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ja, en, Dictionary } from "@/lib/i18n/dictionaries";

type Language = 'ja' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('ja');

    useEffect(() => {
        const savedLang = localStorage.getItem('app-language') as Language;
        if (savedLang && (savedLang === 'ja' || savedLang === 'en')) {
            setLanguage(savedLang);
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('app-language', lang);
    };

    const toggleLanguage = () => {
        handleSetLanguage(language === 'ja' ? 'en' : 'ja');
    };

    const t = language === 'ja' ? ja : en;

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
