'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Locale, t, TranslationKey } from '@/lib/i18n';

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextType>({
    locale: 'no',
    setLocale: () => { },
    t: (key) => key,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('no');

    useEffect(() => {
        const saved = localStorage.getItem('utsyn_locale') as Locale;
        if (saved === 'en' || saved === 'no') {
            setLocaleState(saved);
            document.documentElement.lang = saved === 'no' ? 'nb' : 'en';
        }
    }, []);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('utsyn_locale', newLocale);
        document.documentElement.lang = newLocale === 'no' ? 'nb' : 'en';
    }, []);

    const translate = useCallback((key: TranslationKey) => {
        return t(key, locale);
    }, [locale]);

    return (
        <LocaleContext.Provider value={{ locale, setLocale, t: translate }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    return useContext(LocaleContext);
}
