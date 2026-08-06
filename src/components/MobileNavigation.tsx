import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { APP_NAVIGATION, type TabType } from './appNavigation';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface MobileNavigationProps {
  isOpen: boolean;
  activeTab: TabType;
  userName: string;
  userInitial: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isSigningOut: boolean;
  accountError: string;
  onClose: () => void;
  onNavigate: (tab: TabType) => void;
  onSignOut: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  activeTab,
  userName,
  userInitial,
  triggerRef,
  isSigningOut,
  accountError,
  onClose,
  onNavigate,
  onSignOut,
}) => {
  const { t } = useTranslation();
  const panelRef = useRef<React.ElementRef<'aside'>>(null);
  const translatedItems = useMemo(() => APP_NAVIGATION.map((item) => ({
    ...item,
    label: String(t(item.labelKey, item.fallbackLabel)),
  })), [t]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const menuTrigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      menuTrigger?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="app-mobile-menu"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        ref={panelRef}
        id="app-mobile-navigation"
        className="app-mobile-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-mobile-menu-title"
      >
        <div className="app-mobile-menu__header">
          <div>
            <span>{t('app.communitySafety', 'Community safety')}</span>
            <strong id="app-mobile-menu-title">{t('app.navigation', 'Navigation')}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label={String(t('common.close', 'Close menu'))}>
            <X size={21} aria-hidden="true" />
          </button>
        </div>

        <div className="app-mobile-menu__identity">
          <span aria-hidden="true">{userInitial}</span>
          <div><strong>{userName}</strong><small>{t('app.communityMember', 'Community member')}</small></div>
        </div>

        <nav className="app-mobile-menu__nav" aria-label={String(t('app.mainNavigation', 'Main navigation'))}>
          {translatedItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              className={activeTab === id ? 'app-header-nav__item is-active' : 'app-header-nav__item'}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="app-mobile-menu__footer">
          <button type="button" onClick={() => onNavigate('settings')}>
            <UserRound size={18} aria-hidden="true" />
            {t('profile.profileAndSettings', 'Profile & settings')}
          </button>
          <button type="button" onClick={onSignOut} disabled={isSigningOut}>
            <LogOut size={18} aria-hidden="true" />
            {isSigningOut ? t('common.loading', 'Loading') : t('settings.signOut', 'Sign out')}
          </button>
          {accountError && <p role="status">{accountError}</p>}
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default MobileNavigation;
