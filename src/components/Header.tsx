import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FilePlus2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';

import { getNavigationItem, type TabType } from './appNavigation';
import HeaderLogo from './HeaderLogo';
import MobileNavigation from './MobileNavigation';
import PrimaryNavigation from './PrimaryNavigation';
import NotificationBell from './shared/NotificationBell';
import './Header.css';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport: () => void;
  onSignIn?: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onNewReport, onSignIn }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isReportPending, setIsReportPending] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accountError, setAccountError] = useState('');
  const profileButtonRef = useRef<React.ElementRef<'button'>>(null);
  const profileMenuRef = useRef<React.ElementRef<'div'>>(null);
  const reportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeItem = getNavigationItem(activeTab);
  const userName = String(user?.first_name || user?.username || t('dashboard.neighbour', 'Neighbour'));
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'H';

  useEffect(() => () => {
    if (reportTimerRef.current) {
      clearTimeout(reportTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!profileButtonRef.current?.contains(target) && !profileMenuRef.current?.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const navigate = (tab: TabType) => {
    onTabChange(tab);
    setIsProfileMenuOpen(false);
  };

  const handleNewReport = () => {
    if (isReportPending) {
      return;
    }
    setIsReportPending(true);
    onNewReport();
    reportTimerRef.current = setTimeout(() => setIsReportPending(false), 500);
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }
    setAccountError('');
    setIsSigningOut(true);
    try {
      await signOut();
      setIsProfileMenuOpen(false);
    } catch {
      setAccountError(String(t('auth.signOutFailed', 'Unable to sign out. Please try again.')));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header
      className="app-header"
      data-auth-state={isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'anonymous'}
    >
      <div className="app-header__inner">
        <HeaderLogo
          label={String(t('app.homeLabel', 'HyperApp home'))}
          onActivate={() => navigate('dashboard')}
        />

        {isLoading ? (
          <div
            className="app-header__loading"
            role="status"
            aria-label={String(t('app.loadingHyperApp', 'Loading HyperApp'))}
          />
        ) : (
          <>
            {isAuthenticated && (
              <PrimaryNavigation activeTab={activeTab} onNavigate={navigate} />
            )}

            {isAuthenticated && (
              <span className="app-header__mobile-title" aria-live="polite">
                {t(activeItem.labelKey, activeItem.fallbackLabel)}
              </span>
            )}

            <div className="app-header__actions">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="app-header__report"
                    onClick={handleNewReport}
                    disabled={isReportPending}
                    aria-busy={isReportPending}
                    aria-label={String(t('app.newReport', 'New report'))}
                  >
                    <FilePlus2 size={18} aria-hidden="true" />
                    <span>{t('app.newReport', 'New report')}</span>
                  </button>

                  <NotificationBell />

                  <div className="app-account-menu">
                    <button
                      ref={profileButtonRef}
                      type="button"
                      className="app-account-menu__trigger"
                      aria-label={String(t('app.openAccountMenu', 'Open account menu'))}
                      aria-expanded={isProfileMenuOpen}
                      aria-haspopup="menu"
                      onClick={() => setIsProfileMenuOpen((open) => !open)}
                    >
                      <span className="app-account-menu__avatar" aria-hidden="true">
                        {user?.profile_picture_url
                          ? <img src={user.profile_picture_url} alt="" />
                          : userInitial}
                      </span>
                      <span className="app-account-menu__name">{userName}</span>
                      <ChevronDown size={15} aria-hidden="true" />
                    </button>

                    {isProfileMenuOpen && (
                      <div ref={profileMenuRef} className="app-account-popover" role="menu">
                        <div className="app-account-popover__identity">
                          <strong>{userName}</strong>
                          <span>{t('app.communityMember', 'Community member')}</span>
                        </div>
                        <button type="button" role="menuitem" onClick={handleSignOut} disabled={isSigningOut}>
                          <LogOut size={17} aria-hidden="true" />
                          {isSigningOut ? t('common.loading', 'Loading') : t('settings.signOut', 'Sign out')}
                        </button>
                        {accountError && <p role="status">{accountError}</p>}
                      </div>
                    )}
                  </div>

                </>
              ) : (
                <button type="button" className="app-header__sign-in" onClick={onSignIn}>
                  <LogIn size={17} aria-hidden="true" />
                  {t('auth.signIn', 'Sign in')}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {isAuthenticated && !isLoading && (
        <MobileNavigation
          activeTab={activeTab}
          isReportPending={isReportPending}
          onNavigate={navigate}
          onNewReport={handleNewReport}
        />
      )}
    </header>
  );
};

export default Header;
