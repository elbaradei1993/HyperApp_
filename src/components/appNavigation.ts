import { LayoutDashboard, Map, Settings, Users, type LucideIcon } from 'lucide-react';

export type TabType = 'dashboard' | 'map' | 'reports' | 'settings';

export interface AppNavigationItem {
  id: TabType;
  icon: LucideIcon;
  labelKey: string;
  fallbackLabel: string;
  compactLabel: string;
}

export const APP_NAVIGATION: readonly AppNavigationItem[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    labelKey: 'tabs.dashboard',
    fallbackLabel: 'Overview',
    compactLabel: 'Home',
  },
  {
    id: 'map',
    icon: Map,
    labelKey: 'tabs.map',
    fallbackLabel: 'Safety map',
    compactLabel: 'Map',
  },
  {
    id: 'reports',
    icon: Users,
    labelKey: 'tabs.community',
    fallbackLabel: 'Community',
    compactLabel: 'Community',
  },
  {
    id: 'settings',
    icon: Settings,
    labelKey: 'tabs.settings',
    fallbackLabel: 'Account',
    compactLabel: 'Account',
  },
];

export const getNavigationItem = (tab: TabType): AppNavigationItem => (
  APP_NAVIGATION.find((item) => item.id === tab) ?? APP_NAVIGATION[0]
);
