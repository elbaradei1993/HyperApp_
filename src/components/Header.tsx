import React from 'react';
import { useTranslation } from 'react-i18next';

import { useBreakpoint } from '../lib/useBreakpoint';

import NotificationBell from './shared/NotificationBell';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();

  if (!isMobile) {
    return null;
  }

  return (
    <header className="app-mobile-header">
      <div className="app-mobile-header__brand">
        <span className="app-mobile-header__mark" aria-hidden="true"><span /></span>
        <div>
          <strong>HyperApp</strong>
          <small>{t('app.communitySafety', 'Community safety')}</small>
        </div>
      </div>
      <NotificationBell />
    </header>
  );
};

export default Header;
