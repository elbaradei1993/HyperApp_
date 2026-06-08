import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Map,
  Users,
  User,
  Settings,
  Plus,
  Shield,
  Activity,
} from 'lucide-react';

import i18n from '../i18n';

export type TabType = 'map' | 'reports' | 'hub' | 'guardian' | 'profile' | 'settings';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport?: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, onNewReport }) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  const tabs = [
    {
      id: 'map' as TabType,
      label: t('tabs.map'),
      icon: Map,
      ariaLabel: t('tabs.map'),
    },
    {
      id: 'reports' as TabType,
      label: t('tabs.community'),
      icon: Users,
      ariaLabel: t('tabs.community'),
    },
    {
      id: 'hub' as TabType,
      label: t('tabs.hub', 'Hub'),
      icon: Activity,
      ariaLabel: t('tabs.hub', 'Hub'),
    },
    {
      id: 'guardian' as TabType,
      label: t('tabs.guardian', 'Guardian'),
      icon: Shield,
      ariaLabel: t('tabs.guardian', 'Guardian'),
    },
    {
      id: 'profile' as TabType,
      label: t('tabs.profile'),
      icon: User,
      ariaLabel: t('tabs.profile'),
    },
    {
      id: 'settings' as TabType,
      label: t('tabs.settings'),
      icon: Settings,
      ariaLabel: t('tabs.settings'),
    },
  ];

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <>
      <nav
        style={{
          display: 'flex',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(9,9,11,0.96)',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          alignItems: 'center',
          padding: '6px 4px',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
          zIndex: 90,
          height: '72px',
        }}
        aria-label="Main navigation"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <React.Fragment key={`${tab.id}-${currentLanguage}`}>
              <button
                data-tab={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  padding: '4px 0',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  minHeight: '52px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <tab.icon
                    size={20}
                    color={isActive ? 'var(--accent)' : 'var(--t3)'}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? 'var(--accent)' : 'var(--t3)',
                  lineHeight: 1,
                }}>
                  {tab.label}
                </span>
                {isActive && (
                  <div style={{
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                  }} />
                )}
              </button>

              {index === 2 && onNewReport && (
                <button
                  onClick={onNewReport}
                  style={{
                    width: '42px',
                    height: '42px',
                    flexShrink: 0,
                    borderRadius: '12px',
                    background: 'var(--accent)',
                    border: 'none',
                    color: 'var(--accent-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    marginTop: '2px',
                    boxShadow: '0 4px 16px rgba(0,200,150,0.35)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Plus size={20} />
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
};

export default TabNavigation;
