import React from 'react';
import { Map, Users, Activity, Shield, User, Settings, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TabType } from './TabNavigation';

interface AppSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport: () => void;
}

const tabs = [
  { id: 'map' as TabType,      icon: Map,      labelKey: 'tabs.map'      },
  { id: 'reports' as TabType,  icon: Users,    labelKey: 'tabs.community' },
  { id: 'hub' as TabType,      icon: Activity, labelKey: 'tabs.hub'      },
  { id: 'guardian' as TabType, icon: Shield,   labelKey: 'tabs.guardian' },
  { id: 'profile' as TabType,  icon: User,     labelKey: 'tabs.profile'  },
  { id: 'settings' as TabType, icon: Settings, labelKey: 'tabs.settings' },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, onTabChange, onNewReport }) => {
  const { t } = useTranslation();

  return (
    <nav className="app-sidebar" aria-label="Main navigation">
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'32px', padding:'0 8px' }}>
        <div style={{
          width:'34px', height:'34px', borderRadius:'10px',
          background:'linear-gradient(135deg,#00c896,#4f8ef7)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
        }}>
          <div style={{ width:'14px', height:'14px', background:'rgba(9,9,11,0.5)', clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }} />
        </div>
        <span style={{ fontSize:'17px', fontWeight:'800', color:'var(--t1)', letterSpacing:'-0.4px' }}>HyperApp</span>
      </div>

      {/* Nav items */}
      <div style={{ display:'flex', flexDirection:'column', gap:'2px', flex:1 }}>
        {tabs.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              style={{
                display:'flex', alignItems:'center', gap:'12px',
                padding:'10px 12px', borderRadius:'var(--r-md)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                border: isActive ? '0.5px solid rgba(0,200,150,0.2)' : '0.5px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--t2)',
                fontSize:'14px', fontWeight: isActive ? '600' : '400',
                cursor:'pointer', width:'100%', textAlign:'left',
                transition:'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <Icon size={18} style={{ flexShrink:0 }} />
              <span>{t(labelKey, id)}</span>
            </button>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={onNewReport}
        style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
          width:'100%', padding:'12px', borderRadius:'var(--r-md)',
          background:'var(--accent)', color:'var(--accent-text)',
          border:'none', cursor:'pointer', fontSize:'14px', fontWeight:'700',
          marginTop:'16px', boxShadow:'0 4px 16px rgba(0,200,150,0.3)',
        }}
      >
        <Plus size={18} />
        <span>{t('app.newReport', 'New Report')}</span>
      </button>
    </nav>
  );
};

export default AppSidebar;
