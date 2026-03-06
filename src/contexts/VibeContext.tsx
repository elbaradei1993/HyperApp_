import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface LocationVibe {
  type: string;
  percentage: number;
  count: number;
  color: string;
}

interface VibeContextType {
  currentLocationVibe: LocationVibe | null;
  setCurrentLocationVibe: (vibe: LocationVibe | null) => void;
  isVibeLoading: boolean;
  setIsVibeLoading: (loading: boolean) => void;
}

const VibeContext = createContext<VibeContextType | undefined>(undefined);

interface VibeProviderProps {
  children: ReactNode;
}

export const VibeProvider: React.FC<VibeProviderProps> = ({ children }) => {
  const [currentLocationVibe, setCurrentLocationVibe] = useState<LocationVibe | null>(null);
  const [isVibeLoading, setIsVibeLoading] = useState(false);

  const value: VibeContextType = {
    currentLocationVibe,
    setCurrentLocationVibe,
    isVibeLoading,
    setIsVibeLoading,
  };

  return (
    <VibeContext.Provider value={value}>
      {children}
    </VibeContext.Provider>
  );
};

export const useVibe = (): VibeContextType => {
  const context = useContext(VibeContext);
  if (context === undefined) {
    throw new Error('useVibe must be used within a VibeProvider');
  }
  return context;
};

export default VibeContext;
