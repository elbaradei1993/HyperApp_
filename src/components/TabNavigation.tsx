/* eslint-disable no-unused-vars -- the legacy base rule misreads TypeScript callback signatures */
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Map, Plus, Settings, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import i18n from '../i18n';

export type TabType = 'dashboard' | 'map' | 'reports' | 'settings';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport?: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, onNewReport }) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const tabs = [
    { id: 'dashboard' as TabType, label: t('tabs.dashboard', 'Overview'), icon: LayoutDashboard },
    { id: 'map' as TabType, label: t('tabs.map', 'Map'), icon: Map },
    { id: 'reports' as TabType, label: t('tabs.community', 'Community'), icon: Users },
    { id: 'settings' as TabType, label: t('tabs.settings', 'Account'), icon: Settings },
  ];

  useEffect(() => {
    const handleLanguageChange = (language: string) => setCurrentLanguage(language);
    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, []);

  return (
    <nav className="tab-navigation" aria-label={t('app.mainNavigation', 'Main navigation')}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <React.Fragment key={`${tab.id}-${currentLanguage}`}>
            <button
              type="button"
              data-tab={tab.id}
              className={isActive ? 'tab-navigation__item is-active' : 'tab-navigation__item'}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="tab-navigation__icon"><tab.icon size={19} aria-hidden="true" /></span>
              <span>{tab.label}</span>
            </button>

            {index === 1 && onNewReport && (
              <button
                type="button"
                className="tab-navigation__create"
                onClick={onNewReport}
                aria-label={t('app.newReport', 'New report')}
              >
                <span className="tab-navigation__create-icon">
                  <Plus size={19} strokeWidth={2.6} aria-hidden="true" />
                </span>
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default TabNavigation;
