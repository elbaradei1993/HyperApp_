import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Crosshair, Layers, Mic, Heart, MapPin, Clock, MessageCircle, ZoomIn, ZoomOut, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';

import type { Vibe, SOS } from '../types';
import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { userLocationService, NearbyUser } from '../services/userLocationService';
import { useAuth } from '../contexts/AuthContext';

import { IconHeartPulse } from './Icons';
import { getVibeIcon, sosIcon, userLocationIcon } from './MapIcons';
import { MapMarker } from './MapMarker';
import VibeReportModal from './VibeReportModal';
import LocationSearchModal from './LocationSearchModal';
import LocationSearchButton from './LocationSearchButton';
import SafetyWaveOverlay from './SafetyWaveOverlay';
import VibeLegend from './VibeLegend';

import 'leaflet/dist/leaflet.css';
// Import heatmap plugin
import 'leaflet.heat';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  vibes: Vibe[];
  sosAlerts: SOS[];
  center: [number, number];
  zoom: number;
  userLocation: [number, number] | null;
  nearbyUsers?: NearbyUser[];
  isHeatmapVisible: boolean;
  onToggleHeatmap: () => void;
  onReportSuccess?: () => void;
  userId: string;
  targetLocation?: [number, number] | null;
}

// Controller Components
const MapFlyController: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  // Only fly to center on initial mount, not on every center/zoom change
  // This prevents the map from moving unexpectedly when user interacts with it
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (center && !hasInitializedRef.current) {
      map.setView(center, zoom); // Use setView instead of flyTo for instant positioning
      hasInitializedRef.current = true;
    }
  }, [center, zoom, map]);
  return null;
};

const SearchFlyController: React.FC<{ searchLocation: [number, number] | null }> = ({ searchLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (searchLocation && map) {
      map.flyTo(searchLocation, 15);
    }
  }, [searchLocation, map]);

  return null;
};

const TargetLocationController: React.FC<{ targetLocation: [number, number] | null | undefined }> = ({ targetLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (targetLocation && map) {
      console.log('Flying to target location:', targetLocation);
      map.flyTo(targetLocation, 15);
    }
  }, [targetLocation, map]);

  return null;
};

const ControlButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  top: string;
  left?: string;
  variant?: 'default' | 'heatmap' | 'voice' | 'recenter';
}> = ({ children, onClick, title, top, left, variant = 'default' }) => {
  // Use theme variables for backgrounds
  const getGradient = (variant: string) => {
    switch (variant) {
    case 'heatmap':
      return 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)';
    case 'voice':
      return 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)';
    case 'recenter':
      return 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)';
    default:
      return 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)';
    }
  };

  // Enhanced shadow with multiple layers using theme variables
  const getShadow = (variant: string) => {
    const baseShadow = 'var(--shadow-lg)';
    if (variant === 'default') {
      return `${baseShadow}, var(--shadow-sm)`;
    }
    return baseShadow;
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className="modern-map-control-button"
      style={{
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: getGradient(variant),
        border: variant === 'default' ? '1px solid rgba(0,0,0,0.08)' : 'none',
        cursor: 'pointer',
        borderRadius: '12px',
        boxShadow: getShadow(variant),
        // Mobile touch improvements
        WebkitTapHighlightColor: 'transparent',
        WebkitAppearance: 'none',
        touchAction: 'manipulation',
        // Better accessibility
        minWidth: '44px',
        minHeight: '44px',
        // Positioning
        position: 'absolute',
        top,
        ...(left ? { left } : { right: '10px' }),
        zIndex: 1000,
        // Modern transitions
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        // Hover effects
        transform: 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
        e.currentTarget.style.boxShadow = variant === 'default'
          ? '0 8px 25px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)'
          : '0 8px 25px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = getShadow(variant);
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
      }}
    >
      {children}
    </button>
  );
};

const RecenterControl: React.FC<{ userLocation: [number, number] | null }> = ({ userLocation }) => {
  const map = useMap();
  return (
    <ControlButton
      onClick={() => userLocation && map.flyTo(userLocation, 15)}
      title="Refresh Location"
      top="48px"
      variant="recenter"
    >
      <Crosshair size={20} color="black" />
    </ControlButton>
  );
};

const HeatmapToggleControl: React.FC<{ isVisible: boolean, onToggle: () => void }> = ({ isVisible, onToggle }) => (
  <ControlButton
    onClick={onToggle}
    title="Toggle Heatmap"
    top="133px"
    variant="heatmap"
  >
    <Layers size={20} color="black" />
  </ControlButton>
);



const LocationSearchControl: React.FC<{ onOpenLocationSearch: () => void }> = ({ onOpenLocationSearch }) => (
  <LocationSearchButton
    onClick={onOpenLocationSearch}
    top="218px"
  />
);

const ZoomInControl: React.FC = () => {
  const map = useMap();
  return (
    <ControlButton
      onClick={() => map.zoomIn()}
      title="Zoom In"
      top="10px"
      left="10px"
      variant="default"
    >
      <ZoomIn size={20} color="var(--text-primary)" />
    </ControlButton>
  );
};

const ZoomOutControl: React.FC = () => {
  const map = useMap();
  return (
    <ControlButton
      onClick={() => map.zoomOut()}
      title="Zoom Out"
      top="60px"
      left="10px"
      variant="default"
    >
      <ZoomOut size={20} color="var(--text-primary)" />
    </ControlButton>
  );
};



// Utility function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

// Get time ago utility function (from reference)
const getTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) {
    return 'Just now';
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  return `${Math.floor(seconds / 86400)}d ago`;
};

// Vibe colors mapping (from reference)
const vibeColors: Record<string, { bg: string; text: string }> = {
  safe: { bg: 'bg-emerald-500', text: 'text-emerald-600' },
  calm: { bg: 'bg-blue-500', text: 'text-blue-600' },
  lively: { bg: 'bg-amber-500', text: 'text-amber-600' },
  festive: { bg: 'bg-violet-500', text: 'text-violet-600' },
  crowded: { bg: 'bg-red-500', text: 'text-red-600' },
  suspicious: { bg: 'bg-orange-500', text: 'text-orange-600' },
  dangerous: { bg: 'bg-red-600', text: 'text-red-600' },
  noisy: { bg: 'bg-yellow-500', text: 'text-yellow-600' },
  quiet: { bg: 'bg-cyan-500', text: 'text-cyan-600' },
};

// Vibe type colors for heatmap layers (hex format for Leaflet.heat compatibility)
const vibeColorsHex: Record<VibeType, string> = {
  [VibeType.Safe]: '#22c55e',      // Bright green
  [VibeType.Calm]: '#3b82f6',      // Sky blue
  [VibeType.Lively]: '#eab308',    // Golden yellow
  [VibeType.Festive]: '#f59e0b',   // Warm orange
  [VibeType.Crowded]: '#f97316',   // Burnt orange
  [VibeType.Suspicious]: '#a855f7', // Deep purple
  [VibeType.Dangerous]: '#ef4444',  // Crimson red
  [VibeType.Noisy]: '#06b6d4',     // Electric cyan
  [VibeType.Quiet]: '#2dd4bf',     // Soft teal
  [VibeType.Streetlight]: '#64748b', // Slate gray
  [VibeType.Sidewalk]: '#94a3b8',   // Light slate
  [VibeType.Construction]: '#f59e0b', // Amber
  [VibeType.Pothole]: '#92400e',    // Brown
  [VibeType.Traffic]: '#dc2626',    // Red
  [VibeType.Other]: '#6b7280',       // Gray
};

// Memoized gradient calculation to avoid recalculation on every render
const useVibeGradients = () => {
  return useMemo(() => {
    const gradients: Record<VibeType, { [key: number]: string }> = {} as Record<VibeType, { [key: number]: string }>;

    Object.values(VibeType).forEach(vibeType => {
      const hexColor = vibeColorsHex[vibeType];
      const rgbColor = hexToRgb(hexColor);

      if (rgbColor) {
        const gradient: { [key: number]: string } = {};
        const opacitySteps = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

        opacitySteps.forEach(opacity => {
          gradient[opacity] = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${opacity})`;
        });

        gradients[vibeType] = gradient;
      }
    });

    return gradients;
  }, []);
};

// Optimized heatmap layer with memoized calculations
const HeatmapLayer: React.FC<{ vibes: Vibe[], isVisible: boolean }> = React.memo(({ vibes, isVisible }) => {
  const map = useMap();
  const layersRef = useRef<any[]>([]);
  const gradients = useVibeGradients();

  // Memoize grouped vibes to avoid recalculation
  const groupedVibes = useMemo(() => {
    const vibesByType: Record<VibeType, Vibe[]> = {
      [VibeType.Safe]: [],
      [VibeType.Calm]: [],
      [VibeType.Lively]: [],
      [VibeType.Festive]: [],
      [VibeType.Crowded]: [],
      [VibeType.Suspicious]: [],
      [VibeType.Dangerous]: [],
      [VibeType.Noisy]: [],
      [VibeType.Quiet]: [],
      [VibeType.Streetlight]: [],
      [VibeType.Sidewalk]: [],
      [VibeType.Construction]: [],
      [VibeType.Pothole]: [],
      [VibeType.Traffic]: [],
      [VibeType.Other]: [],
    };

    vibes.forEach(vibe => {
      if (vibe.latitude && vibe.longitude && vibe.vibe_type && vibesByType[vibe.vibe_type]) {
        vibesByType[vibe.vibe_type].push(vibe);
      }
    });

    return vibesByType;
  }, [vibes]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !L.heatLayer) {
      console.warn('Leaflet.heat plugin not found. Heatmap will not be rendered.');
      return;
    }

    // Clear existing layers with defensive error handling
    try {
      layersRef.current.forEach(layer => {
        if (layer && map && typeof map.hasLayer === 'function' && map.hasLayer(layer)) {
          try {
            map.removeLayer(layer);
          } catch (layerError) {
            console.warn('Error removing heatmap layer:', layerError);
          }
        }
      });
    } catch (cleanupError) {
      console.warn('Error during layer cleanup:', cleanupError);
    }
    layersRef.current = [];

    if (!isVisible) {
      return;
    }

    // Define rendering order (safe vibes first, dangerous last for proper layering)
    const renderOrder: VibeType[] = [
      VibeType.Quiet,
      VibeType.Calm,
      VibeType.Safe,
      VibeType.Lively,
      VibeType.Festive,
      VibeType.Crowded,
      VibeType.Noisy,
      VibeType.Suspicious,
      VibeType.Dangerous,
    ];

    // Create heatmap layers for each vibe type with error handling
    renderOrder.forEach(vibeType => {
      try {
        const typeVibes = groupedVibes[vibeType];
        if (typeVibes.length === 0) {
          return;
        }

        const gradient = gradients[vibeType];
        if (!gradient) {
          console.warn(`No gradient available for ${vibeType}`);
          return;
        }

        // Create points for this vibe type
        const points = typeVibes.map(vibe => [
          vibe.latitude!,
          vibe.longitude!,
          0.8, // Consistent intensity for all points of this type
        ]);

        // Create heatmap layer with memoized gradient
        const heatLayer = L.heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          minOpacity: 0.4,
          maxOpacity: 0.9,
          gradient,
        });

        // Fix Canvas2D performance warning by setting willReadFrequently
        // Access the canvas element after the layer is created
        setTimeout(() => {
          if (heatLayer._canvas) {
            heatLayer._canvas.willReadFrequently = true;
          }
        }, 0);

        // Add layer to map with error handling
        if (heatLayer && map && typeof map.addLayer === 'function') {
          try {
            map.addLayer(heatLayer);
            layersRef.current.push(heatLayer);
          } catch (addLayerError) {
            console.warn(`Error adding heatmap layer for ${vibeType}:`, addLayerError);
          }
        }
      } catch (vibeTypeError) {
        console.warn(`Error creating heatmap layer for ${vibeType}:`, vibeTypeError);
      }
    });

    // Cleanup function with defensive error handling
    return () => {
      try {
        layersRef.current.forEach(layer => {
          if (layer && map && typeof map.hasLayer === 'function' && map.hasLayer(layer)) {
            try {
              map.removeLayer(layer);
            } catch (layerError) {
              console.warn('Error removing heatmap layer during cleanup:', layerError);
            }
          }
        });
      } catch (cleanupError) {
        console.warn('Error during cleanup:', cleanupError);
      }
      layersRef.current = [];
    };
  }, [map, groupedVibes, isVisible, gradients]);

  return null;
});

// Boost Button Component for popups
const BoostButton: React.FC<{
  type: 'vibe' | 'sos';
  id: number;
  userId: string;
  initialBoosts: number;
  onBoostUpdate: (id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => void;
}> = ({ type, id, userId, initialBoosts, onBoostUpdate }) => {
  const [boosts, setBoosts] = useState(initialBoosts);
  const [isBoosted, setIsBoosted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has already voted on this item
    const checkVoteStatus = async () => {
      try {
        const voteType = await reportsService.getUserVote(id, userId);
        setIsBoosted(voteType === 'upvote');
      } catch (error) {
        console.error('Error checking vote status:', error);
      }
    };

    if (userId) {
      checkVoteStatus();
    }
  }, [id, type, userId]);

  const handleBoost = async () => {
    if (isLoading || !userId) {
      return;
    }

    setIsLoading(true);
    try {
      await reportsService.vote(id, userId, 'upvote');

      // Update local state optimistically
      const newBoosted = !isBoosted;
      const newCount = newBoosted ? boosts + 1 : boosts - 1;
      setIsBoosted(newBoosted);
      setBoosts(newCount);
      onBoostUpdate(id, type, newCount, newBoosted);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleBoost}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.3s ease',
        border: '1px solid',
        backgroundColor: isBoosted ? '#fef2f2' : '#f9fafb',
        color: isBoosted ? '#b91c1c' : '#374151',
        borderColor: isBoosted ? '#fecaca' : '#d1d5db',
        opacity: isLoading ? 0.5 : 1,
        cursor: isLoading ? 'not-allowed' : 'pointer',
      }}
      title={isBoosted ? 'Remove boost' : 'Raise awareness'}
    >
      <IconHeartPulse size={14} color={isBoosted ? '#ef4444' : '#6b7280'} />
      <span>{boosts}</span>
    </button>
  );
};

// Enhanced Vibe Marker with exact implementation from reference
const VibeMarker: React.FC<{
  vibe: Vibe;
  userId: string;
  onBoostUpdate: (id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => void;
}> = React.memo(({ vibe, userId, onBoostUpdate }) => {
  const [showDetails, setShowDetails] = useState(false);
  const vibeColor = vibeColors[vibe.vibe_type || 'safe'];

  return (
    <div style={{ position: 'relative' }}>
      {/* Marker Pin - Exact from reference */}
      <motion.div
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        whileHover={{ scale: 1.1 }}
        className="cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className={`w-4 h-4 rounded-full ${vibeColor.bg} opacity-30 absolute top-0 left-1/2 -translate-x-1/2`}
        />
        <div className={`relative w-10 h-10 ${vibeColor.bg} rounded-full shadow-lg flex items-center justify-center border-4 border-white`}>
          <MapPin className="w-5 h-5 text-white" fill="currentColor" />
        </div>
        <div className={`w-0 h-0 border-l-4 border-r-4 border-t-8 ${vibeColor.bg} border-l-transparent border-r-transparent mx-auto`} />
      </motion.div>

      {/* Details Card - Exact from reference */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-4 border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-semibold">
                {vibe.profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{vibe.profile?.username || 'Anonymous'}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {getTimeAgo(new Date(vibe.created_at))}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${vibeColor.bg} text-white`}>
                {vibe.vibe_type}
              </div>
            </div>

            {/* Content */}
            {vibe.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {vibe.notes}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  // Handle boost action
                  const handleBoost = async () => {
                    try {
                      await reportsService.vote(vibe.id, userId, 'upvote');
                      onBoostUpdate(vibe.id, 'vibe', (vibe.upvotes || 0) + 1, true);
                    } catch (error) {
                      console.error('Error boosting:', error);
                    }
                  };
                  handleBoost();
                }}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-500 transition-colors"
              >
                <Heart className="w-4 h-4" />
                <span>{vibe.upvotes || 0}</span>
              </motion.button>
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-500 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>Comment</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const SOSMarker: React.FC<{
  sos: SOS;
  userId: string;
  onBoostUpdate: (id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => void;
}> = React.memo(({ sos, userId, onBoostUpdate }) => (
  <React.Fragment key={`sos-${sos.id}`}>
    <Marker
      position={[sos.latitude!, sos.longitude!]}
      icon={sosIcon}
    >
      <Popup>
        <div style={{ color: '#1f2937', maxWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <strong>SOS Alert!</strong>
              <p style={{ marginTop: '4px' }}>{sos.notes || 'No details provided.'}</p>
            </div>
            <BoostButton
              type="sos"
              id={sos.id}
              userId={userId}
              initialBoosts={sos.upvotes || 0}
              onBoostUpdate={onBoostUpdate}
            />
          </div>
          <small style={{ color: '#6b7280' }}>Reported by {sos.profile?.username || 'anonymous'} at {new Date(sos.created_at).toLocaleString()}</small>
        </div>
      </Popup>
    </Marker>
    <Circle
      center={[sos.latitude!, sos.longitude!]}
      radius={3000}
      pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }}
    />
  </React.Fragment>
));

// Other User Marker Component
const OtherUserMarker: React.FC<{
  user: NearbyUser;
}> = React.memo(({ user }) => {
  // Create a custom icon for other users (blue circle with person icon)
  const otherUserIcon = L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 18px;
        height: 18px;
        background: #3b82f6;
        border: 1px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        <!-- Person icon -->
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    `,
    className: 'custom-other-user-marker',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  return (
    <Marker
      key={`user-${user.id}`}
      position={[user.latitude, user.longitude]}
      icon={otherUserIcon}
    >
      <Popup>
        <div style={{
          padding: '16px',
          background: 'var(--bg-primary)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          maxWidth: '280px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>User:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {user.username || user.first_name || user.last_name || 'Anonymous'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>Distance:</span>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {user.distance.toFixed(1)} km away
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

// Map click handler component
const MapClickHandler: React.FC<{
  onMapClick: (latlng: [number, number]) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      // Prevent triggering if clicking on markers or controls
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.leaflet-marker-icon') ||
          target.closest('.modern-map-control-button') ||
          target.closest('.leaflet-control-container')) {
        return;
      }
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

// Memoized main component to prevent unnecessary re-renders
const MapComponent: React.FC<MapComponentProps> = React.memo(({
  vibes,
  sosAlerts,
  center,
  zoom,
  userLocation,
  nearbyUsers = [],
  isHeatmapVisible,
  onToggleHeatmap,
  onReportSuccess,
  userId,
  targetLocation,
}) => {
  const { user } = useAuth();

  // State for map click reporting
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState<[number, number] | null>(null);
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [isLocationSearchModalOpen, setIsLocationSearchModalOpen] = useState(false);

  // Disable default Leaflet zoom controls and ensure they stay disabled
  useEffect(() => {
    const L = (window as any).L;
    if (L && L.Map) {
      // Disable zoom controls globally
      L.Map.mergeOptions({
        zoomControl: false,
      });

      // Also remove any existing zoom controls
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer) {
        const zoomControls = mapContainer.querySelector('.leaflet-control-zoom');
        if (zoomControls) {
          zoomControls.remove();
        }
      }
    }
  }, []);

  // Memoize boost update handler
  const handleBoostUpdate = useCallback((id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => {
    // The boost count will be updated in the database, and the component will re-render
    // with fresh data from the parent component's data fetching
  }, []);

  // Handle map click for reporting
  const handleMapClick = useCallback((latlng: [number, number]) => {
    setClickedLocation(latlng);
    setIsReportModalOpen(true);
  }, []);

  // Handle report modal close
  const handleReportModalClose = useCallback(() => {
    setIsReportModalOpen(false);
    setClickedLocation(null);
  }, []);

  // Handle successful report submission
  const handleReportSuccess = useCallback(() => {
    // Call parent callback to refresh data
    onReportSuccess?.();
    console.log('Report submitted successfully');
  }, [onReportSuccess]);

  // Memoize filtered and validated vibes to avoid recalculation
  const validVibes = useMemo(() =>
    vibes.filter(vibe =>
      vibe.latitude &&
      vibe.longitude &&
      Object.values(VibeType).includes(vibe.vibe_type),
    ), [vibes],
  );

  // Memoize filtered and validated SOS alerts
  const validSOSAlerts = useMemo(() =>
    sosAlerts.filter(sos => sos.latitude && sos.longitude),
  [sosAlerts],
  );

  return (
    <>

      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%', background: '#09090b' }}>
        <MapFlyController center={center} zoom={zoom} />
        <SearchFlyController searchLocation={searchLocation} />
        <TargetLocationController targetLocation={targetLocation} />
        <RecenterControl userLocation={userLocation} />
        <HeatmapToggleControl isVisible={isHeatmapVisible} onToggle={onToggleHeatmap} />
        <LocationSearchControl onOpenLocationSearch={() => setIsLocationSearchModalOpen(true)} />
        <ZoomInControl />
        <ZoomOutControl />
        <MapClickHandler onMapClick={handleMapClick} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />
        {userLocation && (
          <Marker
            position={userLocation}
            icon={userLocationIcon}
          >
            <Popup>
              <div style={{
                padding: '20px',
                background: 'var(--bg-primary)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
                maxWidth: '280px',
                whiteSpace: 'nowrap',
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                }}>
                  {user?.username || 'Anonymous User'}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        <HeatmapLayer vibes={validVibes} isVisible={isHeatmapVisible} />

        {!isHeatmapVisible && validVibes.map((vibe) => (
          <Marker
            key={`vibe-${vibe.id}`}
            position={[vibe.latitude!, vibe.longitude!]}
            icon={L.divIcon({
              html: `
                <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
                  <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:${vibeColorsHex[vibe.vibe_type as VibeType] || '#00c896'};opacity:0.2;"></div>
                  <div style="width:12px;height:12px;border-radius:50%;background:${vibeColorsHex[vibe.vibe_type as VibeType] || '#00c896'};border:2px solid rgba(9,9,11,0.6);box-shadow:0 0 8px ${vibeColorsHex[vibe.vibe_type as VibeType] || '#00c896'}55;"></div>
                </div>
              `,
              className: 'custom-vibe-marker',
              iconSize: [28, 40],
              iconAnchor: [14, 40],
            })}
          >
            <Popup className="custom-popup">
              <div style={{
                padding: '16px',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
                maxWidth: '320px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>Reporter:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {vibe.profile?.username || 'Anonymous'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>Vibe Type:</span>
                    <span
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'white',
                        borderRadius: '9999px',
                        backgroundColor: vibeColorsHex[vibe.vibe_type as VibeType] || '#6366f1',
                      }}
                    >
                      {vibe.vibe_type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>Reported:</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {getTimeAgo(new Date(vibe.created_at))}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {validSOSAlerts.map((sos) => (
          <SOSMarker
            key={`sos-${sos.id}`}
            sos={sos}
            userId={userId}
            onBoostUpdate={handleBoostUpdate}
          />
        ))}

        {/* Other users markers */}
        {nearbyUsers.map((user) => (
          <OtherUserMarker
            key={`user-${user.id}`}
            user={user}
          />
        ))}
      </MapContainer>

      {/* Report Modal */}
      <VibeReportModal
        isOpen={isReportModalOpen}
        onClose={handleReportModalClose}
        onSuccess={handleReportSuccess}
        currentLocation={clickedLocation}
      />

      {/* Location Search Modal */}
      <LocationSearchModal
        isOpen={isLocationSearchModalOpen}
        onClose={() => setIsLocationSearchModalOpen(false)}
        onLocationSelect={(coordinates, address) => {
          setSearchLocation(coordinates);
          console.log('Location selected from modal:', address, coordinates);
        }}
      />

      {/* Vibe Legend */}
      <VibeLegend />

      {/* Vibe Legend */}
      <VibeLegend />

      {/* Vibe Legend */}
      <VibeLegend />

      {/* Dynamic Safety Waves Overlay */}
      <SafetyWaveOverlay vibes={validVibes} />
    </>
  );
});

export default MapComponent;
