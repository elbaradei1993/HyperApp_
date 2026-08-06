import React, { useMemo } from 'react';
import { FilePlus2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { APP_NAVIGATION, type TabType } from './appNavigation';

interface MobileNavigationProps {
  activeTab: TabType;
  isReportPending: boolean;
  onNavigate: (tab: TabType) => void;
  onNewReport: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab,
  isReportPending,
  onNavigate,
  onNewReport,
}) => {
  const { t } = useTranslation();
  const items = useMemo(() => APP_NAVIGATION.map((item) => ({
    ...item,
    label: String(t(item.labelKey, item.fallbackLabel)),
  })), [t]);

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label={String(t('app.mobileNavigation', 'Mobile primary navigation'))}
    >
      {items.map(({ id, icon: Icon, label }, index) => (
        <React.Fragment key={id}>
          {index === 2 && (
            <button
              type="button"
              data-navigation-action="new-report"
              className="mobile-bottom-nav__report"
              onClick={onNewReport}
              disabled={isReportPending}
              aria-busy={isReportPending}
              aria-label={String(t('app.newReport', 'New report'))}
            >
              <span className="mobile-bottom-nav__report-icon" aria-hidden="true">
                <FilePlus2 size={21} strokeWidth={2.25} />
              </span>
              <span>{t('app.report', 'Report')}</span>
            </button>
          )}
          <button
            type="button"
            data-navigation-id={id}
            className={activeTab === id ? 'mobile-bottom-nav__item is-active' : 'mobile-bottom-nav__item'}
            aria-current={activeTab === id ? 'page' : undefined}
            aria-label={label}
            onClick={() => onNavigate(id)}
          >
            <span className="mobile-bottom-nav__icon" aria-hidden="true">
              <Icon size={20} strokeWidth={2.1} />
            </span>
            <span>{label}</span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default MobileNavigation;
