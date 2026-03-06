import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '../i18n';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string, updateProfile?: (data: any) => Promise<void>, user?: any) => Promise<void>;
  isRTL: boolean;
  isInitialized: boolean;
  isChanging: boolean;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // RTL languages
  const rtlLanguages = ['ar'];

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // Load language from localStorage or default to 'en'
        const savedLanguage = localStorage.getItem('language') || 'en';

        // Change i18n language first
        await i18n.changeLanguage(savedLanguage);

        // Then update state and DOM after i18n is ready
        setCurrentLanguage(savedLanguage);

        // Set initial direction after i18n is ready
        const direction = rtlLanguages.includes(savedLanguage) ? 'rtl' : 'ltr';
        document.documentElement.dir = direction;
        document.documentElement.lang = savedLanguage;

        if (rtlLanguages.includes(savedLanguage)) {
          document.body.classList.add('rtl');
        } else {
          document.body.classList.remove('rtl');
        }

        setIsInitialized(true);
        console.log(`Language initialized to ${savedLanguage} with direction ${direction}`);
      } catch (error) {
        console.error('Error initializing language:', error);
        // Fallback to English
        setCurrentLanguage('en');
        setIsInitialized(true);
      }
    };

    initializeLanguage();
  }, []);

  // Listen for translation events to update isTranslating state
  useEffect(() => {
    const handleMissingKey = () => {
      // Use setTimeout to avoid updating state during render
      setTimeout(() => {
        setIsTranslating(true);
        // Reset translating state after a short delay
        setTimeout(() => setIsTranslating(false), 1000);
      }, 0);
    };

    const handleLanguageChanged = () => {
      setIsTranslating(false);
    };

    i18n.on('missingKey', handleMissingKey);
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('missingKey', handleMissingKey);
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const changeLanguage = async (language: string, updateProfile?: (data: any) => Promise<void>, user?: any) => {
    // Prevent changing to the same language or if already changing
    if (language === currentLanguage || isChanging) {
      return;
    }

    setIsChanging(true);

    try {
      // Update document direction and language immediately for instant visual feedback
      const direction = rtlLanguages.includes(language) ? 'rtl' : 'ltr';
      document.documentElement.dir = direction;
      document.documentElement.lang = language;

      // Update body class for RTL styling
      if (rtlLanguages.includes(language)) {
        document.body.classList.add('rtl');
      } else {
        document.body.classList.remove('rtl');
      }

      // Now change the i18n language
      await i18n.changeLanguage(language);

      // Update state after successful language change
      setCurrentLanguage(language);

      // Save to localStorage
      localStorage.setItem('language', language);

      // Update user profile if authenticated and updateProfile function is provided
      if (user && updateProfile) {
        await updateProfile({ language });
      }

      console.log(`Language changed to ${language} with direction ${direction}`);
    } catch (error) {
      console.error('Error changing language:', error);
      // Revert direction changes on error
      const currentDirection = rtlLanguages.includes(currentLanguage) ? 'rtl' : 'ltr';
      document.documentElement.dir = currentDirection;
      document.documentElement.lang = currentLanguage;
      if (rtlLanguages.includes(currentLanguage)) {
        document.body.classList.add('rtl');
      } else {
        document.body.classList.remove('rtl');
      }
    } finally {
      setIsChanging(false);
    }
  };

  const isRTL = rtlLanguages.includes(currentLanguage);

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      changeLanguage,
      isRTL,
      isInitialized,
      isChanging,
      isTranslating,
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
