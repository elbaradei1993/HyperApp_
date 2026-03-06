import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Clock, Navigation, RefreshCw, AlertTriangle } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

import { LoadingSpinner } from './shared';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface UserLocation {
  user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  last_updated: string;
  location_source: string;
}

const AdminLocationDashboard: React.FC = () => {
  const { user } = useAuth();
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedUser, setSelectedUser] = useState<UserLocation | null>(null);

  // Default center (Cairo, Egypt)
  const center: [number, number] = [30.0444, 31.2357];
  const zoom = 10;

  // Check if user is admin (simplified for now - the database function will enforce admin check)
  const isAdmin = !!user; // For now, allow authenticated users to try (database will enforce admin role)

  const fetchUserLocations = useCallback(async () => {
    if (!isAdmin) {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_active_user_locations');

      if (error) {
        throw error;
      }

      setUserLocations(data || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Error fetching user locations:', err);
      setError(err.message || 'Failed to fetch user locations');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUserLocations();

    // Set up real-time subscription for location updates
    if (isAdmin) {
      const subscription = supabase
        .channel('user_locations')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'push_subscriptions',
          filter: 'is_active=eq.true',
        }, (payload) => {
          console.log('Real-time location update:', payload);
          // Refresh data when location changes
          fetchUserLocations();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fetchUserLocations, isAdmin]);

  const handleRefresh = () => {
    fetchUserLocations();
  };

  const getUserDisplayName = (userLoc: UserLocation) => {
    return userLoc.username || `${userLoc.first_name || ''} ${userLoc.last_name || ''}`.trim() || 'Anonymous';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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

  // Create custom icon for user markers
  const createUserIcon = (userLoc: UserLocation) => {
    const isRecent = new Date(userLoc.last_updated) > new Date(Date.now() - 10 * 60 * 1000); // Within 10 minutes

    return L.divIcon({
      html: `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
          background: ${isRecent ? '#10b981' : '#6b7280'};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          ${isRecent ? '<div style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #ef4444; border-radius: 50%; border: 2px solid white;"></div>' : ''}
        </div>
      `,
      className: 'custom-user-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to view this dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading && userLocations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6" />
              User Location Monitor
            </h1>
            <p className="text-gray-600 mt-1">
              {userLocations.length} active user{userLocations.length !== 1 ? 's' : ''} •
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {userLocations.map((userLoc) => (
            <React.Fragment key={userLoc.user_id}>
              <Marker
                position={[userLoc.latitude, userLoc.longitude]}
                icon={createUserIcon(userLoc)}
                eventHandlers={{
                  click: () => setSelectedUser(userLoc),
                }}
              >
                <Popup>
                  <div className="p-3 min-w-[250px]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getUserDisplayName(userLoc)}
                        </h3>
                        <p className="text-sm text-gray-500">ID: {userLoc.user_id.slice(0, 8)}...</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{userLoc.latitude.toFixed(6)}, {userLoc.longitude.toFixed(6)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{getTimeAgo(userLoc.last_updated)}</span>
                      </div>

                      {userLoc.accuracy && (
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-gray-400" />
                          <span>±{userLoc.accuracy}m accuracy</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="capitalize">{userLoc.location_source}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Accuracy circle if accuracy is available */}
              {userLoc.accuracy && (
                <Circle
                  center={[userLoc.latitude, userLoc.longitude]}
                  radius={userLoc.accuracy}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                    weight: 1,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Selected User Info Panel */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px]"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Name</p>
                  <p className="text-sm text-gray-900">{getUserDisplayName(selectedUser)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">User ID</p>
                  <p className="text-xs text-gray-500 font-mono">{selectedUser.user_id}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Coordinates</p>
                  <p className="text-sm text-gray-900">
                    {selectedUser.latitude.toFixed(6)}, {selectedUser.longitude.toFixed(6)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                  <p className="text-sm text-gray-900">{getTimeAgo(selectedUser.last_updated)}</p>
                </div>

                {selectedUser.accuracy && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Accuracy</p>
                    <p className="text-sm text-gray-900">±{selectedUser.accuracy} meters</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700">Source</p>
                  <p className="text-sm text-gray-900 capitalize">{selectedUser.location_source}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminLocationDashboard;
