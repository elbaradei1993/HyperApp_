import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import i18n from '../i18n';
import type { User } from '../types';

import { useAuth } from './AuthContext';

interface LanguageContextType {
  currentLanguage: 'en';
  changeLanguage: (
    language: string,
    updateProfile?: (data: Partial<User>) => Promise<unknown>,
    user?: User | null,
  ) => Promise<void>;
  isRTL: false;
  isInitialized: boolean;
  isChanging: boolean;
  isTranslating: false;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const getLanguageStorageKey = (userId: string): string => `language:${userId}`;

export const normalizeSupportedLanguage = (_language?: string | null): 'en' => 'en';

const enforceEnglishDocument = async () => {
  await i18n.changeLanguage('en');
  localStorage.setItem('language', 'en');
  localStorage.setItem('i18nextLng', 'en');
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  document.documentElement.classList.remove('rtl');
  document.documentElement.classList.add('ltr');
  document.body.classList.remove('rtl');
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { user: authenticatedUser } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    enforceEnglishDocument()
      .catch((error) => console.error('Error initializing English language:', error))
      .finally(() => setIsInitialized(true));
  }, []);

  useEffect(() => {
    if (!isInitialized || !authenticatedUser) {
      return;
    }

    localStorage.setItem(getLanguageStorageKey(authenticatedUser.id), 'en');
  }, [authenticatedUser, isInitialized]);

  const changeLanguage = async (
    _language: string,
    updateProfile?: (data: Partial<User>) => Promise<unknown>,
    user?: User | null,
  ) => {
    if (isChanging) {
      return;
    }

    setIsChanging(true);
    try {
      await enforceEnglishDocument();

      if (user?.id) {
        localStorage.setItem(getLanguageStorageKey(user.id), 'en');
      }

      if (user && updateProfile && user.language !== 'en') {
        await updateProfile({ language: 'en' });
      }
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage: 'en',
      changeLanguage,
      isRTL: false,
      isInitialized,
      isChanging,
      isTranslating: false,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
