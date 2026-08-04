import React from 'react';
import { LayoutDashboard, Map, Plus, Settings, User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';

import NotificationBell from './shared/NotificationBell';
import { TabType } from './TabNavigation';

/* eslint-disable no-unused-vars -- the legacy base rule misreads TypeScript callback signatures */
interface AppSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport: () => void;
}

const tabs = [
  { id: 'dashboard' as TabType, icon: LayoutDashboard, labelKey: 'tabs.dashboard' },
  { id: 'map' as TabType, icon: Map, labelKey: 'tabs.map' },
  { id: 'reports' as TabType, icon: Users, labelKey: 'tabs.community' },
  { id: 'profile' as TabType, icon: User, labelKey: 'tabs.profile' },
  { id: 'settings' as TabType, icon: Settings, labelKey: 'tabs.settings' },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, onTabChange, onNewReport }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userName = user?.first_name || user?.username || t('dashboard.neighbour', 'Neighbour');
  const userInitial = String(userName).charAt(0).toUpperCase();

  return (
    <nav className="app-sidebar" aria-label={t('app.mainNavigation', 'Main navigation')}>
      <div className="app-sidebar__top">
        <div className="app-sidebar__brand">
          <span className="app-sidebar__brand-mark" aria-hidden="true"><span /></span>
          <div>
            <strong>HyperApp</strong>
            <span>{t('app.communitySafety', 'Community safety')}</span>
          </div>
        </div>
        <NotificationBell tone="dark" />
      </div>

      <div className="app-sidebar__status">
        <span aria-hidden="true" />
        {t('app.liveNetwork', 'Live network')}
      </div>

      <div className="app-sidebar__nav">
        {tabs.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={isActive ? 'app-sidebar__nav-item is-active' : 'app-sidebar__nav-item'}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="app-sidebar__nav-icon"><Icon size={18} /></span>
              <span>{t(labelKey, id)}</span>
            </button>
          );
        })}
      </div>

      <div className="app-sidebar__footer">
        <div className="app-sidebar__identity">
          <span>{userInitial}</span>
          <div>
            <strong>{userName}</strong>
            <small>{t('app.communityMember', 'Community member')}</small>
          </div>
        </div>
        <button type="button" className="app-sidebar__create" onClick={onNewReport}>
          <Plus size={17} />
          <span>{t('app.newReport', 'New report')}</span>
        </button>
      </div>
    </nav>
  );
};

export default AppSidebar;
