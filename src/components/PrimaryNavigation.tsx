import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { APP_NAVIGATION, type TabType } from './appNavigation';

interface PrimaryNavigationProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

const PrimaryNavigation: React.FC<PrimaryNavigationProps> = ({ activeTab, onNavigate }) => {
  const { t } = useTranslation();
  const items = useMemo(() => APP_NAVIGATION.map((item) => ({
    ...item,
    label: String(t(item.labelKey, item.fallbackLabel)),
  })), [t]);

  return (
    <nav className="app-header-nav" aria-label={String(t('app.mainNavigation', 'Primary navigation'))}>
      {items.map(({ id, icon: Icon, label, compactLabel }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            data-navigation-id={id}
            className={isActive ? 'app-header-nav__item is-active' : 'app-header-nav__item'}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
            <span className="app-header-nav__label">{label}</span>
            <span className="app-header-nav__compact-label" aria-hidden="true">{compactLabel}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default PrimaryNavigation;
