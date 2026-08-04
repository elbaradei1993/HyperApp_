import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

import { storageManager } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { userLocationService } from '../services/userLocationService';

import { useAuth } from './AuthContext';

export type LocationSharingChangeCallback = () => void;

export interface Settings {
  notifications: boolean;
  locationSharing: boolean;
  notificationRadius: number;
  hideNearbyUsers: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  isLoading: boolean;
}

export const defaultSettings: Settings = {
  notifications: true,
  locationSharing: false,
  notificationRadius: 5,
  hideNearbyUsers: false,
};

export const getSettingsStorageKey = (userId?: string | null): string => (
  `userSettings:${userId || 'guest'}`
);

export const parseStoredSettings = (value: string | null): Settings => {
  if (!value) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...JSON.parse(value) };
  } catch {
    return defaultSettings;
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const settingsRef = useRef<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const storageKey = getSettingsStorageKey(user?.id);

  useEffect(() => {
    let isActive = true;

    const loadSettings = async () => {
      setIsLoading(true);

      try {
        let storedSettings = await storageManager.get(storageKey);

        // Migrate the previous unscoped key once, without leaking it to future accounts.
        if (!storedSettings && user?.id) {
          storedSettings = await storageManager.get('userSettings');
          if (storedSettings) {
            await storageManager.remove('userSettings');
          }
        }

        const loadedSettings = parseStoredSettings(storedSettings);

        if (user?.id) {
          const { data, error } = await supabase
            .from('users')
            .select('location_sharing')
            .eq('user_id', user.id)
            .limit(2);

          if (!error && data?.length === 1 && typeof data[0].location_sharing === 'boolean') {
            loadedSettings.locationSharing = data[0].location_sharing;
          } else if (!error && data && data.length > 1) {
            console.error('Duplicate profile records found while loading settings.');
          }
        }

        if (isActive) {
          settingsRef.current = loadedSettings;
          setSettings(loadedSettings);
          await storageManager.set(storageKey, JSON.stringify(loadedSettings));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        if (isActive) {
          settingsRef.current = defaultSettings;
          setSettings(defaultSettings);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isActive = false;
    };
  }, [storageKey, user?.id]);

  const updateSettings = async (newSettings: Partial<Settings>): Promise<void> => {
    const previousSettings = settingsRef.current;
    const updatedSettings = { ...previousSettings, ...newSettings };

    settingsRef.current = updatedSettings;
    setSettings(updatedSettings);
    await storageManager.set(storageKey, JSON.stringify(updatedSettings));

    try {
      if (
        user?.id &&
        newSettings.locationSharing !== undefined &&
        newSettings.locationSharing !== previousSettings.locationSharing
      ) {
        const success = await userLocationService.updateLocationSharingPreference(
          user.id,
          newSettings.locationSharing,
        );

        if (!success) {
          throw new Error('Location sharing could not be saved to your account.');
        }
      }
    } catch (error) {
      settingsRef.current = previousSettings;
      setSettings(previousSettings);
      await storageManager.set(storageKey, JSON.stringify(previousSettings));
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
