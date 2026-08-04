/* eslint-disable no-unused-vars -- the legacy base rule misreads TypeScript callback signatures */
import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Map, Menu, Plus, Settings, User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import i18n from '../i18n';

export type TabType = 'dashboard' | 'map' | 'reports' | 'profile' | 'settings';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport?: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, onNewReport }) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navigationRef = useRef<React.ElementRef<'nav'>>(null);

  const tabs = [
    { id: 'dashboard' as TabType, label: t('tabs.dashboard', 'Overview'), icon: LayoutDashboard },
    { id: 'map' as TabType, label: t('tabs.map'), icon: Map },
    { id: 'reports' as TabType, label: t('tabs.community'), icon: Users },
  ];

  const moreTabs = [
    { id: 'profile' as TabType, label: t('tabs.profile'), icon: User },
    { id: 'settings' as TabType, label: t('tabs.settings'), icon: Settings },
  ];

  const isMoreActive = moreTabs.some((tab) => tab.id === activeTab);

  useEffect(() => {
    const handleLanguageChange = (language: string) => setCurrentLanguage(language);
    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, []);

  useEffect(() => {
    if (!isMoreOpen) {
      return undefined;
    }

    const closeMoreMenu = (event: globalThis.PointerEvent) => {
      if (!navigationRef.current?.contains(event.target as globalThis.Node)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMoreMenu);
    return () => document.removeEventListener('pointerdown', closeMoreMenu);
  }, [isMoreOpen]);

  const selectTab = (tab: TabType) => {
    onTabChange(tab);
    setIsMoreOpen(false);
  };

  return (
    <nav ref={navigationRef} className="tab-navigation" aria-label={t('app.mainNavigation', 'Main navigation')}>
      {isMoreOpen && (
        <div className="tab-more-menu" role="menu" aria-label={t('tabs.more', 'More')}>
          {moreTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className={activeTab === id ? 'tab-more-menu__item is-active' : 'tab-more-menu__item'}
              onClick={() => selectTab(id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <React.Fragment key={`${tab.id}-${currentLanguage}`}>
            <button
              type="button"
              data-tab={tab.id}
              className={isActive ? 'tab-navigation__item is-active' : 'tab-navigation__item'}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => selectTab(tab.id)}
            >
              <span className="tab-navigation__icon"><tab.icon size={19} /></span>
              <span>{tab.label}</span>
            </button>

            {index === 1 && onNewReport && (
              <button
                type="button"
                className="tab-navigation__create"
                onClick={onNewReport}
                aria-label={t('app.newReport', 'New report')}
              >
                <Plus size={20} />
              </button>
            )}
          </React.Fragment>
        );
      })}

      <button
        type="button"
        className={isMoreActive || isMoreOpen ? 'tab-more-toggle is-active' : 'tab-more-toggle'}
        aria-expanded={isMoreOpen}
        aria-haspopup="menu"
        aria-label={t('tabs.more', 'More')}
        onClick={() => setIsMoreOpen((open) => !open)}
      >
        <span className="tab-more-toggle__icon"><Menu size={19} aria-hidden="true" /></span>
        <span>{t('tabs.more', 'More')}</span>
      </button>
    </nav>
  );
};

export default TabNavigation;
