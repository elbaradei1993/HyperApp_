import React, { useState, useEffect } from 'react';
import { Box, Button, Text, VStack, HStack, Grid, GridItem, Badge } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CloudRain,
  Calendar,
  Route,
  Activity,
  QrCode,
  Car,
  CalendarCheck,
  Star,
  Store,
  RefreshCw,
  Settings,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Info,
  Check,
  X,
  Loader,
  Shield,
  Users,
  Bell,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { hubService } from '../services/hub';
import { reverseGeocode } from '../lib/geocoding';
import { backgroundLocationService } from '../services/backgroundLocationService';
import { supabase } from '../lib/supabase';
import { formatNumber, formatPercentage, formatDistance, formatTemperature } from '../lib/arabicUtils';

interface HubViewProps {
  userLocation: [number, number] | null;
}

const HubView: React.FC<HubViewProps> = ({ userLocation: initialUserLocation }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(initialUserLocation);
  const [activeHubTab, setActiveHubTab] = useState<'urban-almanac' | 'ambient-trust'>('urban-almanac');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationType, setVerificationType] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // Real data from APIs and database
  const [weatherData, setWeatherData] = useState({
    temperature: 15,
    condition: 'Partly Cloudy',
    rainStartsIn: 42,
    visibility: 'Low' as 'Low' | 'Medium' | 'High',
    pedestrianTraffic: -60,
    visibilityChange: -23,
    windSpeed: 5,
    windDirection: 180,
    humidity: 65,
    uvIndex: 3.2,
    hourlyForecast: [] as Array<{
      time: string;
      temperature: number;
      condition: string;
      precipitationProbability: number;
    }>,
  });

  const [events, setEvents] = useState<Array<{
    time: string;
    event: string;
    impact: string;
    tag: string;
  }>>([]);

  const [infrastructureData, setInfrastructureData] = useState({
    streetlights: 0,
    sidewalks: 'No Reports' as 'Clear' | 'Blocked' | 'Under Repair' | 'No Reports',
    construction: 0,
    potholes: 0,
    traffic: 0,
    other: 0,
    reports: [] as string[],
    hasReports: false,
  });

  const [neighborhoodRhythm, setNeighborhoodRhythm] = useState<{
    peakActivity: string;
    quietPeriod: string;
    activityData: number[];
    dataQuality: 'low' | 'medium' | 'high';
    totalReports: number;
    timeRange: string;
    activityLevels: ('low' | 'medium' | 'high')[];
    insights: string[];
      } | null>(null);

  const [currentAddress, setCurrentAddress] = useState('Downtown Financial District');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [nearbyVerifiedVenues, setNearbyVerifiedVenues] = useState<any[]>([]);
  const [isLoadingNearbyVenues, setIsLoadingNearbyVenues] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [nearbyTrustedUsers, setNearbyTrustedUsers] = useState<any[]>([]);
  const [isLoadingTrustedUsers, setIsLoadingTrustedUsers] = useState(false);
  const [showTrustedUsersList, setShowTrustedUsersList] = useState(false);
  const [showGuardianAlertModal, setShowGuardianAlertModal] = useState(false);
  const [guardianAlerts, setGuardianAlerts] = useState<any[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [neighborhoodWatchData, setNeighborhoodWatchData] = useState<{
    trustedNearby: number;
    verificationRate: number;
    activeVerifiers: number;
  } | null>(null);
  const [isLoadingNeighborhoodWatch, setIsLoadingNeighborhoodWatch] = useState(false);

  // Update local location state when prop changes
  useEffect(() => {
    setUserLocation(initialUserLocation);
  }, [initialUserLocation]);

  // Update local location state when prop changes
  useEffect(() => {
    setUserLocation(initialUserLocation);
  }, [initialUserLocation]);

  // Load real data on component mount and when location changes
  useEffect(() => {
    if (userLocation) {
      loadHubData();
    }
  }, [userLocation]);

  // Subscribe to real-time infrastructure report updates
  useEffect(() => {
    if (userLocation) {
      const subscription = hubService.subscribeToInfrastructureReports(
        (infrastructureData) => {
          setInfrastructureData(infrastructureData);
        },
        userLocation[0],
        userLocation[1],
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userLocation]);

  const loadHubData = async () => {
    if (!userLocation) {
      // Reset to default states when no location
      setWeatherData({
        temperature: 15,
        condition: 'Partly Cloudy',
        rainStartsIn: 0,
        visibility: 'Medium',
        pedestrianTraffic: 0,
        visibilityChange: 0,
        windSpeed: 5,
        windDirection: 180,
        humidity: 65,
        uvIndex: 3.2,
        hourlyForecast: [],
      });
      setEvents([]);
      setInfrastructureData({
        streetlights: 0,
        sidewalks: 'No Reports',
        construction: 0,
        potholes: 0,
        traffic: 0,
        other: 0,
        reports: [],
        hasReports: false,
      });
      setNeighborhoodRhythm(null);
      setCurrentAddress('Location not available');
      setIsLoadingWeather(false);
      setIsLoadingAddress(false);
      return;
    }

    try {
      // Load weather data
      setIsLoadingWeather(true);
      const weather = await hubService.getWeatherData(userLocation[0], userLocation[1]);
      setWeatherData({
        temperature: weather.temperature || 15,
        condition: weather.condition || 'Partly Cloudy',
        rainStartsIn: weather.rainStartsIn || 0,
        visibility: weather.visibility,
        pedestrianTraffic: weather.pedestrianTraffic,
        visibilityChange: weather.visibilityChange,
        windSpeed: weather.windSpeed || 5,
        windDirection: weather.windDirection || 180,
        humidity: weather.humidity || 65,
        uvIndex: weather.uvIndex || 3.2,
        hourlyForecast: weather.hourlyForecast || [],
      });
      setIsLoadingWeather(false);

      // Load events
      const eventsData = await hubService.getLocalEvents(userLocation[0], userLocation[1]);
      setEvents(eventsData);

      // Load infrastructure data
      const infraData = await hubService.getInfrastructureStatus(userLocation[0], userLocation[1]);
      setInfrastructureData(infraData);

      // Load neighborhood rhythm
      console.log('Loading neighborhood rhythm for location:', userLocation);
      const rhythmData = await hubService.getNeighborhoodRhythm(userLocation[0], userLocation[1]);
      console.log('Received neighborhood rhythm data:', rhythmData);
      setNeighborhoodRhythm(rhythmData);

      // Load address
      setIsLoadingAddress(true);
      const address = await reverseGeocode(userLocation[0], userLocation[1]);
      setCurrentAddress(address);
      setIsLoadingAddress(false);

      // Load nearby verified venues
      await loadNearbyVenues();

      // Load nearby trusted users
      await loadNearbyTrustedUsers();

      // Load neighborhood watch data
      await loadNeighborhoodWatchData();

    } catch (error) {
      console.error('Error loading hub data:', error);
      // On error, show empty states instead of mock data
      setWeatherData({
        temperature: 15,
        condition: 'Partly Cloudy',
        rainStartsIn: 0,
        visibility: 'Medium',
        pedestrianTraffic: 0,
        visibilityChange: 0,
        windSpeed: 5,
        windDirection: 180,
        humidity: 65,
        uvIndex: 3.2,
        hourlyForecast: [],
      });
      setEvents([]);
      setInfrastructureData({
        streetlights: 0,
        sidewalks: 'No Reports',
        construction: 0,
        potholes: 0,
        traffic: 0,
        other: 0,
        reports: [],
        hasReports: false,
      });
      setCurrentAddress('Unable to load location');
      setIsLoadingWeather(false);
      setIsLoadingAddress(false);
    }
  };

  const verificationItems = [
    {
      id: 'venue-search',
      icon: QrCode,
      name: t('hub.ambientTrust.verificationHub.findVenues'),
      desc: t('hub.verificationModal.venueSearch.description'),
    },
  ];



  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadHubData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadNearbyVenues = async () => {
    if (!userLocation) {
      return;
    }

    setIsLoadingNearbyVenues(true);
    try {
      const venues = await hubService.getNearbyVerifiedVenues(userLocation[0], userLocation[1]);

      // Check which venues the current user can update
      if (user && venues.length > 0) {
        const venuesWithUpdateStatus = await Promise.all(
          venues.map(async (venue) => {
            try {
              const canUpdate = await hubService.canUserUpdateVenue(user.id, venue.id);
              return { ...venue, canUpdate };
            } catch (error) {
              console.error('Error checking update permission for venue:', venue.id, error);
              return { ...venue, canUpdate: false };
            }
          }),
        );
        setNearbyVerifiedVenues(venuesWithUpdateStatus);
      } else {
        setNearbyVerifiedVenues(venues);
      }
    } catch (error) {
      console.error('Error loading nearby venues:', error);
      setNearbyVerifiedVenues([]);
    } finally {
      setIsLoadingNearbyVenues(false);
    }
  };

  const loadNearbyTrustedUsers = async () => {
    if (!userLocation) {
      return;
    }

    setIsLoadingTrustedUsers(true);
    try {
      // Get nearby users and filter for trusted ones
      const { userLocationService } = await import('../services/userLocationService');
      const nearbyUsers = await userLocationService.findNearbyUsers(userLocation[0], userLocation[1], 5, user?.id); // 5km radius

      // Filter for trusted users only
      const trustedUsers = nearbyUsers.filter((nearbyUser: any) => nearbyUser.verification_level === 'trusted');

      setNearbyTrustedUsers(trustedUsers);
    } catch (error) {
      console.error('Error loading nearby trusted users:', error);
      setNearbyTrustedUsers([]);
    } finally {
      setIsLoadingTrustedUsers(false);
    }
  };

  const loadNeighborhoodWatchData = async () => {
    if (!userLocation) {
      return;
    }

    setIsLoadingNeighborhoodWatch(true);
    try {
      const data = await hubService.getNeighborhoodWatchData(userLocation[0], userLocation[1]);
      setNeighborhoodWatchData(data);
    } catch (error) {
      console.error('Error loading neighborhood watch data:', error);
      setNeighborhoodWatchData(null);
    } finally {
      setIsLoadingNeighborhoodWatch(false);
    }
  };

  const handleVerificationClick = (type: string) => {
    console.log('handleVerificationClick called with type:', type);
    setVerificationType(type);
    setShowVerificationModal(true);
  };

  const VerificationModal: React.FC<{ type: string; userLocation: [number, number] | null; selectedVenue: any; onClose: () => void; onVenueUpdate?: () => void }> = React.memo(({ type, userLocation, selectedVenue: propSelectedVenue, onClose, onVenueUpdate }) => {
    console.log('VerificationModal rendered with type:', type);

    const [isVerifying, setIsVerifying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [nearbyVenues, setNearbyVenues] = useState<any[]>([]);
    const [selectedVenue, setSelectedVenue] = useState<any>(null);
    const [venueSafetyDetails, setVenueSafetyDetails] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [showCriteriaForm, setShowCriteriaForm] = useState(false);
    const [verificationCriteria, setVerificationCriteria] = useState({
      lighting: 5,
      security: 5,
      cleanliness: 5,
      accessibility: 5,
      staffPresence: 5,
    });
    const [verificationNotes, setVerificationNotes] = useState('');

    // Load nearby venues when modal opens for nearby-venues type
    useEffect(() => {
      if (type === 'nearby-venues' && userLocation) {
        loadNearbyVenues();
      }
    }, [type, userLocation]);

    // Load venue safety details when opening safety score modal for a selected venue
    useEffect(() => {
      if (type === 'safety-score' && propSelectedVenue?.id) {
        loadVenueSafetyDetails(propSelectedVenue.id);
        // Check if user can update this venue and pre-fill form if so
        if (user) {
          checkAndPreFillUserVerification(propSelectedVenue.id);
        }
      }
    }, [type, propSelectedVenue?.id, user]);

    const loadVenueSafetyDetails = async (venueId: string) => {
      try {
        const details = await hubService.getVenueSafetyDetails(venueId);
        setVenueSafetyDetails(details);
      } catch (error) {
        console.error('Error loading venue safety details:', error);
        setVenueSafetyDetails(null);
      }
    };

    const checkAndPreFillUserVerification = async (venueId: string) => {
      if (!user) {
        return;
      }

      try {
        // Check if user has submitted verification for this venue
        const canUpdate = await hubService.canUserUpdateVenue(user.id, venueId);
        if (canUpdate) {
          // Get user's existing verification data
          const { data: userVerification, error } = await supabase
            .from('venue_verifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('venue_id', venueId)
            .single();

          if (userVerification && !error) {
            // Pre-fill the form with existing criteria
            setVerificationCriteria({
              lighting: userVerification.lighting_score,
              security: userVerification.security_score,
              cleanliness: userVerification.cleanliness_score,
              accessibility: userVerification.accessibility_score,
              staffPresence: userVerification.staff_presence_score,
            });
            setVerificationNotes(userVerification.notes || '');
          }
        }
      } catch (error) {
        console.error('Error checking user verification:', error);
      }
    };

    // Debounced search
    useEffect(() => {
      if (type === 'venue-search' && searchQuery) {
        const timer = setTimeout(() => {
          handleSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [searchQuery, type]);

    const loadNearbyVenues = async () => {
      if (!userLocation) {
        return;
      }

      console.log('loadNearbyVenues called with userLocation:', userLocation);
      setIsLoadingNearby(true);
      try {
        const venues = await hubService.getNearbyVerifiedVenues(userLocation[0], userLocation[1]);
        console.log('Loaded nearby venues:', venues);
        setNearbyVenues(venues);
      } catch (error) {
        console.error('Error loading nearby venues:', error);
      } finally {
        setIsLoadingNearby(false);
      }
    };

    const handleSearch = async (query: string) => {
      if (!query.trim() || !userLocation) {
        return;
      }

      setIsSearching(true);
      try {
        const results = await hubService.searchVenues(query, userLocation[0], userLocation[1]);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching venues:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const handleVenueSelect = async (venue: any) => {
      console.log('handleVenueSelect called with type:', type, 'venue:', venue);

      if (type === 'nearby-venues') {
        // For verified venues, switch to safety score modal with real data
        console.log('Switching to safety score modal for verified venue');
        setSelectedVenue(venue);
        setVerificationType('safety-score');

        // Load venue safety details
        try {
          console.log('Loading safety details for venue ID:', venue.id);
          const details = await hubService.getVenueSafetyDetails(venue.id);
          console.log('Loaded venue safety details:', details);
          setVenueSafetyDetails(details);
        } catch (error) {
          console.error('Error loading venue safety details:', error);
          setVenueSafetyDetails(null);
        }
      } else {
        // For search results, show verification form
        console.log('Showing verification form for search result');
        setSelectedVenue(venue);
        setShowCriteriaForm(true);
      }
    };

    const handleSubmitVerification = async () => {
      if (!propSelectedVenue || !user || !userLocation) {
        return;
      }

      setIsVerifying(true);
      try {
        let success = false;

        // Check if user already has a verification for this venue
        const canUpdate = await hubService.canUserUpdateVenue(user.id, propSelectedVenue.id);

        if (canUpdate) {
          // Update existing verification
          success = await hubService.updateVenueVerification(
            user.id,
            propSelectedVenue.id,
            verificationCriteria,
            verificationNotes,
          );
          console.log('Venue verification updated successfully');
        } else {
          // Submit new verification
          success = await hubService.submitVenueVerification(user.id, {
            name: propSelectedVenue?.name || 'Unknown Venue',
            address: propSelectedVenue?.address || '',
            latitude: propSelectedVenue?.latitude || 0,
            longitude: propSelectedVenue?.longitude || 0,
            category: propSelectedVenue?.category || 'other',
            verificationCriteria,
            userLocation: { latitude: userLocation[0], longitude: userLocation[1] },
            notes: verificationNotes,
          });
          console.log('Venue verification submitted successfully');
        }

        if (success) {
          // Refresh nearby venues to show updated scores immediately
          await loadNearbyVenues();
          // Call the parent callback to refresh the main component's venue list
          onVenueUpdate?.();
          onClose();
        } else {
          console.error('Failed to submit/update venue verification');
        }
      } catch (error) {
        console.error('Error submitting/updating venue verification:', error);
      } finally {
        setIsVerifying(false);
      }
    };

    const renderModalContent = () => {
      switch (type) {
      case 'venue-search':
        return (
          <Box>
            <Text fontSize="14px" color="gray.600" textAlign="center" mb={4}>
              {t('hub.verificationModal.venueSearch.description')}
            </Text>

            {/* Search Input */}
            <Box mb={4}>
              <input
                type="text"
                placeholder={t('hub.verificationModal.venueSearch.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {isSearching && (
                <Text fontSize="12px" color="gray.500" mt={1}>
                    Searching...
                </Text>
              )}
            </Box>

            {/* Search Results */}
            <Box maxH="300px" overflowY="auto">
              {searchResults.length > 0 ? (
                <VStack gap={2} align="stretch">
                  {searchResults.map((venue, index) => (
                    <Box
                      key={index}
                      p={3}
                      bg={selectedVenue?.id === venue.id ? 'black' : 'gray.50'}
                      color={selectedVenue?.id === venue.id ? 'white' : 'black'}
                      borderRadius="12px"
                      cursor="pointer"
                      border="1px solid"
                      borderColor={selectedVenue?.id === venue.id ? 'black' : 'gray.200'}
                      onClick={() => handleVenueSelect(venue)}
                      _hover={{ bg: selectedVenue?.id === venue.id ? 'black' : 'gray.100' }}
                    >
                      <Text fontWeight="600" mb={1}>{venue.name}</Text>
                      <Text fontSize="12px" opacity={0.8}>
                        {venue.address || `${venue.distance}m away`}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              ) : searchQuery && !isSearching ? (
                <Box textAlign="center" py={8}>
                  <Text fontSize="14px" color="gray.500">
                      No venues found
                  </Text>
                </Box>
              ) : (
                <Box textAlign="center" py={8}>
                  <Text fontSize="14px" color="gray.500">
                    {t('hub.verificationModal.venueSearch.emptyState')}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        );

      case 'nearby-venues':
        return (
          <Box>
            <Text fontSize="14px" color="gray.600" textAlign="center" mb={4}>
                Verified venues near you
            </Text>

            {/* Loading State */}
            {isLoadingNearby && (
              <Box textAlign="center" py={8}>
                <Text fontSize="14px" color="gray.500">
                    Loading nearby venues...
                </Text>
              </Box>
            )}

            {/* Nearby Venues */}
            {!isLoadingNearby && (
              <Box maxH="300px" overflowY="auto">
                {nearbyVenues.length > 0 ? (
                  <VStack gap={2} align="stretch">
                    {nearbyVenues.map((venue, index) => (
                      <Box
                        key={venue.id || index}
                        p={3}
                        bg={selectedVenue?.id === venue.id ? 'black' : 'gray.50'}
                        color={selectedVenue?.id === venue.id ? 'white' : 'black'}
                        borderRadius="12px"
                        cursor="pointer"
                        border="1px solid"
                        borderColor={selectedVenue?.id === venue.id ? 'black' : 'gray.200'}
                        onClick={() => handleVenueSelect(venue)}
                        _hover={{ bg: selectedVenue?.id === venue.id ? 'black' : 'gray.100' }}
                      >
                        <HStack justify="space-between" align="flex-start">
                          <Box flex={1}>
                            <Text fontWeight="600" mb={1}>{venue.name}</Text>
                            <Text fontSize="12px" opacity={0.8}>
                              {venue.type} • {venue.distance}m away
                            </Text>
                            <Badge
                              bg={venue.verificationStatus === 'verified' ? 'green.100' : 'orange.100'}
                              color={venue.verificationStatus === 'verified' ? 'green.800' : 'orange.800'}
                              px={2}
                              py={1}
                              borderRadius="8px"
                              fontSize="10px"
                              fontWeight="500"
                              mt={1}
                            >
                              {venue.verificationStatus}
                            </Badge>
                          </Box>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Box textAlign="center" py={8}>
                    <Text fontSize="14px" color="gray.500">
                        No venues found nearby
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );

      case 'safety-score':
        // Ensure we have a venue to work with
        if (!propSelectedVenue) {
          return (
            <Box>
              <Text fontSize="14px" color="gray.600" textAlign="center" mb={4}>
                  Venue safety score analysis
              </Text>
              <Box textAlign="center" py={8}>
                <Text fontSize="16px" color="gray.600" mt={4}>
                  {t('hub.verificationModal.safetyScore.noVenueSelected')}
                </Text>
                <Text fontSize="14px" color="gray.500" mt={2}>
                  {t('hub.verificationModal.safetyScore.selectVenuePrompt')}
                </Text>
              </Box>
            </Box>
          );
        }

        // Always try to show safety data, even if it's fallback data
        const venueName = propSelectedVenue?.name || 'Unknown Venue';
        const venueScore = venueSafetyDetails?.venue?.safetyScore || 7.0;
        const hasRealVerificationData = venueSafetyDetails?.statistics?.totalReports > 0;

        // Use venue safety details if available, otherwise create fallback data
        const venueFactors = venueSafetyDetails ? [
          { label: 'Lighting', value: venueSafetyDetails.factors.lighting },
          { label: 'Security', value: venueSafetyDetails.factors.security },
          { label: 'Cleanliness', value: venueSafetyDetails.factors.cleanliness },
          { label: 'Accessibility', value: venueSafetyDetails.factors.accessibility },
          { label: 'Staff Presence', value: venueSafetyDetails.factors.staffPresence },
        ] : [
          { label: 'Lighting', value: 70 },
          { label: 'Security', value: 70 },
          { label: 'Cleanliness', value: 70 },
          { label: 'Accessibility', value: 70 },
          { label: 'Staff Presence', value: 70 },
        ];

        const statistics = venueSafetyDetails?.statistics || {
          totalReports: 0,
          officialInspections: 0,
          incidentResponses: 0,
          lastUpdated: new Date().toISOString(),
        };

        return (
          <Box>
            <Text fontSize="14px" color="gray.600" textAlign="center" mb={4}>
              {t('hub.verificationModal.safetyScore.description')}
            </Text>
            {!venueSafetyDetails && (
              <Box bg="orange.50" borderRadius="8px" p={3} mb={4} border="1px solid" borderColor="orange.200">
                <Text fontSize="12px" color="orange.800">
                    ⚠️ This venue's data may be limited. Help improve it by adding your verification below.
                </Text>
              </Box>
            )}
            <Box bg="gray.50" borderRadius="16px" p={4} mb={4}>
              <HStack justify="space-between" align="center" mb={4}>
                <Text fontWeight="600">{venueName}</Text>
                <Text fontSize="24px" fontWeight="700">{venueScore}</Text>
              </HStack>
              {venueFactors.map((item, index) => (
                <Box key={index} mb={3}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="12px">{item.label}</Text>
                    <Text fontSize="12px">{formatNumber(item.value)}%</Text>
                  </HStack>
                  <Box h="4px" bg="gray.200" borderRadius="2px" overflow="hidden">
                    <Box
                      h="100%"
                      bg="black"
                      borderRadius="2px"
                      w={`${item.value}%`}
                      transition="width 0.3s ease"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
            <Box textAlign="left">
              <Text fontWeight="600" mb={2} fontSize="14px">Based on:</Text>
              <Text fontSize="13px" color="gray.700">
                  • {formatNumber(statistics.totalReports)} community reports<br/>
                  • {formatNumber(statistics.officialInspections)} official inspections<br/>
                  • {formatNumber(statistics.incidentResponses)} incident responses<br/>
                  • Updated: {new Date(statistics.lastUpdated).toLocaleDateString()}
              </Text>
            </Box>
          </Box>
        );
      default:
        return null;
      }
    };

    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="rgba(255, 255, 255, 0.95)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex={1000}
        p={4}
        onClick={onClose}
      >
        <Box
          bg="white"
          borderRadius="20px"
          maxW="400px"
          w="full"
          border="1px solid"
          borderColor="gray.200"
          boxShadow="0 10px 30px rgba(0, 0, 0, 0.1)"
          onClick={(e) => e.stopPropagation()}
          maxH="90vh"
          display="flex"
          flexDirection="column"
        >
          <HStack justify="space-between" align="center" mb={6} flexShrink={0}>
            <Text fontSize="18px" fontWeight="600">
              {type === 'venue-search' && t('hub.verificationModal.venueSearch.title')}
              {type === 'nearby-venues' && t('hub.verificationModal.nearbyVenues.title')}
              {type === 'safety-score' && t('hub.verificationModal.safetyScore.title')}
            </Text>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={20} />
            </Button>
          </HStack>

          <Box flex={1} overflowY="auto" px={6} pb={4}>
            {renderModalContent()}

            {/* Criteria Form */}
            {propSelectedVenue && !showCriteriaForm && (
              <Box mt={6} p={4} bg="gray.50" borderRadius="12px">
                <Text fontSize="16px" fontWeight="600" mb={2}>
                  Selected: {propSelectedVenue?.name || 'Unknown Venue'}
                </Text>
                <Text fontSize="14px" color="gray.600" mb={4}>
                  {propSelectedVenue?.address || `${propSelectedVenue?.distance || 0}m away`}
                </Text>
                <Button
                  bg="black"
                  color="white"
                  w="full"
                  onClick={() => setShowCriteriaForm(true)}
                >
                  Rate Venue Safety
                </Button>
              </Box>
            )}

            {/* Verification Criteria Form */}
            {showCriteriaForm && (
              <Box mt={6}>
                <Text fontSize="16px" fontWeight="600" mb={4}>
                  Rate {propSelectedVenue?.name || 'Unknown Venue'} Safety
                </Text>

                <VStack gap={4} align="stretch">
                  {/* Lighting */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="14px" fontWeight="500">{t('hub.verificationModal.criteria.lighting')}</Text>
                      <Text fontSize="14px" color="gray.600">{verificationCriteria.lighting}/10</Text>
                    </HStack>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={verificationCriteria.lighting}
                      onChange={(e) => setVerificationCriteria(prev => ({ ...prev, lighting: parseInt(e.target.value) }))}
                      aria-label="Lighting safety rating"
                      style={{ width: '100%', height: '6px', borderRadius: '3px' }}
                    />
                  </Box>

                  {/* Security */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="14px" fontWeight="500">{t('hub.verificationModal.criteria.security')}</Text>
                      <Text fontSize="14px" color="gray.600">{verificationCriteria.security}/10</Text>
                    </HStack>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={verificationCriteria.security}
                      onChange={(e) => setVerificationCriteria(prev => ({ ...prev, security: parseInt(e.target.value) }))}
                      aria-label="Security safety rating"
                      style={{ width: '100%', height: '6px', borderRadius: '3px' }}
                    />
                  </Box>

                  {/* Cleanliness */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="14px" fontWeight="500">{t('hub.verificationModal.criteria.cleanliness')}</Text>
                      <Text fontSize="14px" color="gray.600">{verificationCriteria.cleanliness}/10</Text>
                    </HStack>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={verificationCriteria.cleanliness}
                      onChange={(e) => setVerificationCriteria(prev => ({ ...prev, cleanliness: parseInt(e.target.value) }))}
                      aria-label="Cleanliness safety rating"
                      style={{ width: '100%', height: '6px', borderRadius: '3px' }}
                    />
                  </Box>

                  {/* Accessibility */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="14px" fontWeight="500">{t('hub.verificationModal.criteria.accessibility')}</Text>
                      <Text fontSize="14px" color="gray.600">{verificationCriteria.accessibility}/10</Text>
                    </HStack>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={verificationCriteria.accessibility}
                      onChange={(e) => setVerificationCriteria(prev => ({ ...prev, accessibility: parseInt(e.target.value) }))}
                      aria-label="Accessibility safety rating"
                      style={{ width: '100%', height: '6px', borderRadius: '3px' }}
                    />
                  </Box>

                  {/* Staff Presence */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="14px" fontWeight="500">{t('hub.verificationModal.criteria.staffPresence')}</Text>
                      <Text fontSize="14px" color="gray.600">{verificationCriteria.staffPresence}/10</Text>
                    </HStack>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={verificationCriteria.staffPresence}
                      onChange={(e) => setVerificationCriteria(prev => ({ ...prev, staffPresence: parseInt(e.target.value) }))}
                      aria-label="Staff presence safety rating"
                      style={{ width: '100%', height: '6px', borderRadius: '3px' }}
                    />
                  </Box>

                  {/* Notes */}
                  <Box>
                    <Text fontSize="14px" fontWeight="500" mb={2}>{t('hub.verificationModal.criteria.additionalNotes')}</Text>
                    <textarea
                      placeholder="Any additional observations about safety..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        minHeight: '60px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </Box>

                  {/* Safety Score Preview */}
                  <Box p={3} bg="blue.50" borderRadius="8px">
                    <HStack justify="space-between">
                      <Text fontSize="14px" fontWeight="500">{t('hub.verificationModal.criteria.estimatedSafetyScore')}</Text>
                      <Text fontSize="16px" fontWeight="600" color="blue.600">
                        {formatNumber(Math.round((Object.values(verificationCriteria).reduce((a, b) => a + b, 0) / 5) * 10))}%
                      </Text>
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            )}
          </Box>

          {type !== 'nearby-venues' && (
            <HStack gap={3} p={6} pt={4} flexShrink={0}>
              <Button variant="outline" flex={1} onClick={onClose}>
                Cancel
              </Button>
              {showCriteriaForm ? (
                <Button
                  bg="black"
                  color="white"
                  flex={1}
                  onClick={handleSubmitVerification}
                  disabled={isVerifying}
                >
                  {isVerifying ? 'Submitting...' : 'Submit Verification'}
                </Button>
              ) : type === 'safety-score' ? (
                <Button
                  bg="black"
                  color="white"
                  flex={1}
                  onClick={() => {
                    // Pre-fill verification criteria with existing data if available
                    if (venueSafetyDetails && venueSafetyDetails.factors) {
                      setVerificationCriteria({
                        lighting: Math.round(venueSafetyDetails.factors.lighting / 10),
                        security: Math.round(venueSafetyDetails.factors.security / 10),
                        cleanliness: Math.round(venueSafetyDetails.factors.cleanliness / 10),
                        accessibility: Math.round(venueSafetyDetails.factors.accessibility / 10),
                        staffPresence: Math.round(venueSafetyDetails.factors.staffPresence / 10),
                      });
                    }
                    setShowCriteriaForm(true);
                  }}
                >
                  Edit Verification
                </Button>
              ) : (
                <Button
                  bg="gray.400"
                  color="white"
                  flex={1}
                  disabled
                >
                  Select Venue First
                </Button>
              )}
            </HStack>
          )}
        </Box>
      </Box>
    );
  });

  return (
    <Box maxW="500px" mx="auto" bg="var(--bg-base)" minH="100vh" position="relative" borderX="1px solid" borderColor="var(--wire)" style={{ color: 'var(--t1)' }}>
      {/* Header */}
      <Box
        bg="linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)"
        color="var(--t1)"
        p={6}
        position="sticky"
        top={0}
        zIndex={100}
        borderBottom="1px solid"
        borderColor="gray.200"
        boxShadow="0 1px 3px rgba(0, 0, 0, 0.05)"
      >
        <HStack justify="space-between" align="center">
          <Box>
            <Text fontSize="24px" fontWeight="700" letterSpacing="-0.5px" lineHeight="1.2">
              {t('hub.title')}
            </Text>
            <Text fontSize="14px" color="gray.700" mt={2} letterSpacing="0.5px" fontWeight="500">
              {t('hub.subtitle')}
            </Text>
          </Box>
          <HStack gap={3}>
            <Button
              variant="ghost"
              size="sm"
              borderRadius="12px"
              border="1px solid"
              borderColor="gray.200"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={16} />
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* Tab Navigation */}
      <HStack bg="var(--bg-surface)" borderBottom="1px solid" borderColor="var(--wire)" position="sticky" top="89px" zIndex={99}>
        <Button
          flex={1}
          p={4}
          bg="transparent"
          color={activeHubTab === 'urban-almanac' ? 'black' : 'gray.500'}
          fontWeight={activeHubTab === 'urban-almanac' ? '600' : '500'}
          fontSize="14px"
          borderRadius={0}
          position="relative"
          onClick={() => setActiveHubTab('urban-almanac')}
          _hover={{ bg: 'transparent' }}
        >
          <HStack gap={2}>
            <CloudRain size={16} />
            <Text>{t('hub.tabs.urbanAlmanac')}</Text>
          </HStack>
          {activeHubTab === 'urban-almanac' && (
            <Box position="absolute" bottom={-1} left={0} right={0} h="2px" bg="black" />
          )}
        </Button>
        <Button
          flex={1}
          p={4}
          bg="transparent"
          color={activeHubTab === 'ambient-trust' ? 'black' : 'gray.500'}
          fontWeight={activeHubTab === 'ambient-trust' ? '600' : '500'}
          fontSize="14px"
          borderRadius={0}
          position="relative"
          onClick={() => setActiveHubTab('ambient-trust')}
          _hover={{ bg: 'transparent' }}
        >
          <HStack gap={2}>
            <Shield size={16} />
            <Text>{t('hub.tabs.ambientTrust')}</Text>
          </HStack>
          {activeHubTab === 'ambient-trust' && (
            <Box position="absolute" bottom={-1} left={0} right={0} h="2px" bg="black" />
          )}
        </Button>
      </HStack>

      {/* Main Content */}
      <Box p={6} minH="calc(100vh - 180px)">
        {/* Location Header */}
        <Box bg="gray.50" borderRadius="16px" p={5} mb={6} border="1px solid" borderColor="gray.200">
          <HStack justify="space-between" align="center">
            <Box>
              <HStack gap={3} mb={2}>
                <MapPin size={16} />
                <Text fontSize="16px" fontWeight="600">
                  {isLoadingAddress ? 'Loading location...' : currentAddress}
                </Text>
              </HStack>

            </Box>
            <Badge bg="gray.100" color="gray.800" px={3} py={1} borderRadius="20px" fontSize="11px" fontWeight="500">
              LIVE
            </Badge>
          </HStack>
        </Box>

        {/* Urban Almanac Content */}
        {activeHubTab === 'urban-almanac' && (
          <VStack gap={4} align="stretch">


            {/* Event Radar Card */}
            <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
              <HStack justify="space-between" align="center" mb={5}>
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                    <Calendar size={18} />
                  </Box>
                  <Text fontWeight="600" fontSize="16px">{t('hub.urbanAlmanac.eventRadar.title')}</Text>
                </HStack>
                <Badge bg="red.50" color="red.800" px={3} py={1} borderRadius="20px" fontSize="12px" fontWeight="600" border="1px solid" borderColor="red.200">
                  {events.length > 0 ? `${events.length} ${t('common.characters')}` : t('hub.urbanAlmanac.eventRadar.noEvents')}
                </Badge>
              </HStack>

              <VStack gap={4} align="stretch">
                {events.length > 0 ? events.slice(0, 5).map((event, index) => (
                  <Box key={index} pb={4} borderBottom={index < events.length - 1 ? '1px solid' : 'none'} borderColor="gray.200">
                    <HStack align="flex-start" gap={4}>
                      <Text w="60px" fontSize="12px" color="gray.600" fontWeight="500" pt={1}>
                        {event.time}
                      </Text>
                      <Box flex={1}>
                        <Text fontWeight="600" mb={1} fontSize="14px">{event.event}</Text>
                        <Text fontSize="13px" color="gray.700" lineHeight="1.4" mb={2}>
                          {event.impact}
                        </Text>
                        <Badge bg="gray.100" color="black" px={3} py={1} borderRadius="12px" fontSize="11px" fontWeight="500" border="1px solid" borderColor="gray.200">
                          {event.tag}
                        </Badge>
                      </Box>
                    </HStack>
                  </Box>
                )) : (
                  <Box textAlign="center" py={8}>
                    <Calendar size={48} color="#e2e8f0" />
                    <Text fontSize="16px" color="gray.600" mt={4}>
                      {t('hub.urbanAlmanac.eventRadar.noEvents')}
                    </Text>
                    <Text fontSize="14px" color="gray.500" mt={2}>
                      {t('hub.urbanAlmanac.eventRadar.noEventsDesc')}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Infrastructure Status Card */}
            <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
              <HStack justify="space-between" align="center" mb={5}>
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                    <Route size={18} />
                  </Box>
                  <Text fontWeight="600" fontSize="16px">{t('hub.urbanAlmanac.infrastructureStatus.title')}</Text>
                </HStack>
                <Badge bg="green.50" color="green.800" px={3} py={1} borderRadius="20px" fontSize="12px" fontWeight="600" border="1px solid" borderColor="green.200">
                  {infrastructureData.sidewalks === 'Clear' ? t('hub.urbanAlmanac.infrastructureStatus.status.normal') : infrastructureData.sidewalks === 'Under Repair' ? t('hub.urbanAlmanac.infrastructureStatus.status.minorIssues') : t('hub.urbanAlmanac.infrastructureStatus.status.majorIssues')}
                </Badge>
              </HStack>

              {infrastructureData.hasReports ? (
                <Grid templateColumns="repeat(2, 1fr)" gap={3} mb={3}>
                  {infrastructureData.streetlights > 0 && (
                    <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                      <Text fontSize="12px" color="gray.600" mb={2}>{t('hub.urbanAlmanac.infrastructureStatus.streetlights')}</Text>
                      <Text fontSize="20px" fontWeight="600" mb={1}>
                        {formatNumber(infrastructureData.streetlights)} {t('hub.urbanAlmanac.infrastructureStatus.reported')}
                      </Text>
                      <HStack gap={1} fontSize="11px" color="orange.600">
                        <CheckCircle size={12} />
                        <Text>{formatNumber(infrastructureData.streetlights)} {t('hub.urbanAlmanac.infrastructureStatus.outagesReported')}</Text>
                      </HStack>
                    </Box>
                  )}
                  {infrastructureData.sidewalks !== 'Clear' && infrastructureData.sidewalks !== 'No Reports' && (
                    <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                      <Text fontSize="12px" color="gray.600" mb={2}>{t('hub.urbanAlmanac.infrastructureStatus.sidewalks')}</Text>
                      <Text fontSize="20px" fontWeight="600" mb={1}>{t('hub.urbanAlmanac.infrastructureStatus.sidewalkStatus.' + infrastructureData.sidewalks)}</Text>
                      <HStack gap={1} fontSize="11px" color="orange.600">
                        <CheckCircle size={12} />
                        <Text>{t('hub.urbanAlmanac.infrastructureStatus.issuesReported')}</Text>
                      </HStack>
                    </Box>
                  )}
                  {infrastructureData.construction > 0 && (
                    <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                      <Text fontSize="12px" color="gray.600" mb={2}>{t('hub.urbanAlmanac.infrastructureStatus.construction')}</Text>
                      <Text fontSize="20px" fontWeight="600" mb={1}>
                        {formatNumber(infrastructureData.construction)} {t('hub.urbanAlmanac.infrastructureStatus.reported')}
                      </Text>
                      <HStack gap={1} fontSize="11px" color="orange.600">
                        <CheckCircle size={12} />
                        <Text>{formatNumber(infrastructureData.construction)} {t('hub.urbanAlmanac.infrastructureStatus.sitesReported')}</Text>
                      </HStack>
                    </Box>
                  )}
                  {infrastructureData.potholes > 0 && (
                    <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                      <Text fontSize="12px" color="gray.600" mb={2}>{t('hub.urbanAlmanac.infrastructureStatus.potholes')}</Text>
                      <Text fontSize="20px" fontWeight="600" mb={1}>
                        {formatNumber(infrastructureData.potholes)} {t('hub.urbanAlmanac.infrastructureStatus.reported')}
                      </Text>
                      <HStack gap={1} fontSize="11px" color="orange.600">
                        <CheckCircle size={12} />
                        <Text>{formatNumber(infrastructureData.potholes)} {t('hub.urbanAlmanac.infrastructureStatus.potholesReported')}</Text>
                      </HStack>
                    </Box>
                  )}
                  {infrastructureData.traffic > 0 && (
                    <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                      <Text fontSize="12px" color="gray.600" mb={2}>{t('hub.urbanAlmanac.infrastructureStatus.traffic')}</Text>
                      <Text fontSize="20px" fontWeight="600" mb={1}>
                        {formatNumber(infrastructureData.traffic)} {t('hub.urbanAlmanac.infrastructureStatus.reported')}
                      </Text>
                      <HStack gap={1} fontSize="11px" color="orange.600">
                        <CheckCircle size={12} />
                        <Text>{formatNumber(infrastructureData.traffic)} {t('hub.urbanAlmanac.infrastructureStatus.trafficIssuesReported')}</Text>
                      </HStack>
                    </Box>
                  )}
                  {infrastructureData.other > 0 && (
                    <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                      <Text fontSize="12px" color="gray.600" mb={2}>{t('hub.urbanAlmanac.infrastructureStatus.other')}</Text>
                      <Text fontSize="20px" fontWeight="600" mb={1}>
                        {formatNumber(infrastructureData.other)} {t('hub.urbanAlmanac.infrastructureStatus.reported')}
                      </Text>
                      <HStack gap={1} fontSize="11px" color="orange.600">
                        <CheckCircle size={12} />
                        <Text>{formatNumber(infrastructureData.other)} issues reported</Text>
                      </HStack>
                    </Box>
                  )}
                </Grid>
              ) : (
                <Box textAlign="center" py={8}>
                  <CheckCircle size={48} color="#10b981" />
                  <Text fontSize="16px" color="gray.600" mt={4}>
                    No infrastructure issues reported
                  </Text>
                  <Text fontSize="14px" color="gray.500" mt={2}>
                    All systems operating normally
                  </Text>
                </Box>
              )}

              <HStack gap={2} fontSize="13px" color="gray.600" align="flex-start">
                <AlertTriangle size={14} style={{ marginTop: '2px' }} />
                <Text><strong>Reports:</strong> {infrastructureData.reports.length > 0 ? infrastructureData.reports[0] : 'No reports'}</Text>
              </HStack>
            </Box>

            {/* Neighborhood Rhythm Card */}
            <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
              <HStack justify="space-between" align="center" mb={5}>
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                    <Activity size={18} />
                  </Box>
                  <Text fontWeight="600" fontSize="16px">{t('hub.urbanAlmanac.neighborhoodRhythm.title')}</Text>
                </HStack>
                {neighborhoodRhythm && neighborhoodRhythm.dataQuality !== 'low' && (
                  <Badge
                    bg={neighborhoodRhythm.dataQuality === 'high' ? 'green.50' : 'yellow.50'}
                    color={neighborhoodRhythm.dataQuality === 'high' ? 'green.800' : 'yellow.800'}
                    px={3}
                    py={1}
                    borderRadius="20px"
                    fontSize="11px"
                    fontWeight="600"
                    border="1px solid"
                    borderColor={neighborhoodRhythm.dataQuality === 'high' ? 'green.200' : 'yellow.200'}
                  >
                    {neighborhoodRhythm.dataQuality === 'high' ? t('hub.urbanAlmanac.neighborhoodRhythm.highConfidence') : t('hub.urbanAlmanac.neighborhoodRhythm.mediumConfidence')}
                  </Badge>
                )}
              </HStack>

              {!neighborhoodRhythm || neighborhoodRhythm.peakActivity === 'No data' || neighborhoodRhythm.activityData.every(h => h === 0) ? (
                <Box textAlign="center" py={8}>
                  <Activity size={48} color="#e2e8f0" />
                  <Text fontSize="16px" color="gray.600" mt={4}>
                    No activity data available
                  </Text>
                  <Text fontSize="14px" color="gray.500" mt={2}>
                    Activity patterns will appear here when data becomes available
                  </Text>
                </Box>
              ) : (
                <>
                  {/* Graph Visualization */}
                  <Box position="relative" h="100px" mb={4} p={3} bg="white" borderRadius="12px" border="1px solid" borderColor="gray.200">
                    <Box position="absolute" bottom="32px" left={3} right={3} h="2px" bg="gray.200" />
                    <Box position="absolute" bottom="32px" left={3} right={3} display="flex" justifyContent="space-between" alignItems="flex-end" h="50px">
                      {neighborhoodRhythm.activityData.map((height, index) => {
                        const activityLevel = neighborhoodRhythm.activityLevels[index];
                        const barColor = activityLevel === 'high' ? 'red.500' :
                          activityLevel === 'medium' ? 'yellow.500' : 'gray.400';
                        return (
                          <Box
                            key={index}
                            w="4px"
                            borderRadius="2px 2px 0 0"
                            bg={index === new Date().getHours() ? 'blue.500' : barColor}
                            style={{ height: `${Math.max(5, height)}%` }}
                            title={`${activityLevel} activity at ${index}:00`}
                          />
                        );
                      })}
                    </Box>
                    <Box position="absolute" bottom={3} left={3} right={3} display="flex" justifyContent="space-between" fontSize="10px" color="gray.500">
                      {(() => {
                        const now = new Date();
                        const currentHour = now.getHours();
                        // Show labels for 6-hour intervals aligned with bar positions
                        const labels = [];
                        for (let i = 0; i < 24; i += 6) {
                          const period = i >= 12 ? 'PM' : 'AM';
                          const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
                          const isCurrentHour = i === currentHour;
                          const label = isCurrentHour ? 'NOW' : `${displayHour} ${period}`;
                          labels.push(
                            <Text key={i} color={isCurrentHour ? 'blue.600' : 'gray.500'} fontWeight={isCurrentHour ? '600' : '400'}>
                              {label}
                            </Text>,
                          );
                        }
                        return labels;
                      })()}
                    </Box>
                  </Box>

                  {/* Activity Summary */}
                  <VStack gap={3} align="stretch" mb={4}>
                    <HStack justify="space-between" align="center">
                      <Text fontSize="13px" color="gray.700">
                        {t('hub.urbanAlmanac.neighborhoodRhythm.peakActivityLabel')} <strong>{neighborhoodRhythm.peakActivity}</strong>
                      </Text>
                      <Text fontSize="13px" color="gray.700">
                        {t('hub.urbanAlmanac.neighborhoodRhythm.quietPeriodLabel')} <strong>{neighborhoodRhythm.quietPeriod}</strong>
                      </Text>
                    </HStack>

                    <HStack justify="space-between" align="center">
                      <Text fontSize="12px" color="gray.600">
                        📊 {neighborhoodRhythm.totalReports} {t('hub.urbanAlmanac.neighborhoodRhythm.communityReports')}
                      </Text>
                      <Text fontSize="12px" color="gray.600">
                        📅 {t('hub.urbanAlmanac.neighborhoodRhythm.last30Days')}
                      </Text>
                    </HStack>
                  </VStack>

                  {/* Activity Insights */}
                  {neighborhoodRhythm.insights && neighborhoodRhythm.insights.length > 0 && (
                    <Box p={3} bg="gray.50" borderRadius="8px">
                      <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                        💡 {t('hub.urbanAlmanac.neighborhoodRhythm.activityInsights')}
                      </Text>
                      <VStack gap={1} align="stretch">
                        {neighborhoodRhythm.insights.map((insight, index) => {
                          // Parse insight format: "key::param" or just "key"
                          const [key, param] = insight.split('::');
                          let translatedInsight = '';

                          if (param) {
                            // Use translation with parameter
                            const countValue = parseInt(param) || 0;
                            translatedInsight = t(key, { time: param, count: countValue });
                          } else {
                            // Use translation without parameter
                            translatedInsight = t(key);
                          }

                          return (
                            <Text key={index} fontSize="11px" color="gray.600" lineHeight="1.4">
                              • {translatedInsight}
                            </Text>
                          );
                        })}
                      </VStack>
                    </Box>
                  )}

                  {/* Activity Level Legend */}
                  <HStack gap={4} justify="center" mt={3}>
                    <HStack gap={1} align="center">
                      <Box w="8px" h="8px" borderRadius="50%" bg="gray.400" />
                      <Text fontSize="10px" color="gray.600">{t('hub.urbanAlmanac.neighborhoodRhythm.low')}</Text>
                    </HStack>
                    <HStack gap={1} align="center">
                      <Box w="8px" h="8px" borderRadius="50%" bg="yellow.500" />
                      <Text fontSize="10px" color="gray.600">{t('hub.urbanAlmanac.neighborhoodRhythm.medium')}</Text>
                    </HStack>
                    <HStack gap={1} align="center">
                      <Box w="8px" h="8px" borderRadius="50%" bg="red.500" />
                      <Text fontSize="10px" color="gray.600">{t('hub.urbanAlmanac.neighborhoodRhythm.high')}</Text>
                    </HStack>
                  </HStack>
                </>
              )}
            </Box>
          </VStack>
        )}

        {/* Ambient Trust Content */}
        {activeHubTab === 'ambient-trust' && (
          <VStack gap={4} align="stretch">
            {/* Verification Hub */}
            <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
              <HStack justify="space-between" align="center" mb={5}>
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                    <QrCode size={18} />
                  </Box>
                  <Text fontWeight="600" fontSize="16px">{t('hub.ambientTrust.verificationHub.title')}</Text>
                </HStack>
                <Badge bg="green.50" color="green.800" px={3} py={1} borderRadius="20px" fontSize="12px" fontWeight="600" border="1px solid" borderColor="green.200">
                  Active
                </Badge>
              </HStack>

              <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                {verificationItems.map((item) => (
                  <Box
                    key={item.id}
                    bg="gray.50"
                    borderRadius="12px"
                    p={5}
                    textAlign="center"
                    cursor="pointer"
                    transition="all 0.3s"
                    border="1px solid"
                    borderColor="gray.200"
                    onClick={() => handleVerificationClick(item.id)}
                    _hover={{ bg: 'gray.100', borderColor: 'black', transform: 'translateY(-2px)' }}
                  >
                    <Box fontSize="24px" mb={3} color="black">
                      <item.icon />
                    </Box>
                    <Text fontWeight="600" mb={1} fontSize="14px">{item.name}</Text>
                    <Text fontSize="12px" color="gray.600" lineHeight="1.3">{item.desc}</Text>
                  </Box>
                ))}
              </Grid>
            </Box>

            {/* Digital Neighborhood Watch */}
            <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
              <HStack justify="space-between" align="center" mb={5}>
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                    <Users size={18} />
                  </Box>
                  <Text fontWeight="600" fontSize="16px">{t('hub.ambientTrust.neighborhoodWatch.title')}</Text>
                </HStack>
                <Badge bg="green.50" color="green.800" px={3} py={1} borderRadius="20px" fontSize="12px" fontWeight="600" border="1px solid" borderColor="green.200">
                  {nearbyTrustedUsers.length} Active
                </Badge>
              </HStack>

              <Grid templateColumns="repeat(2, 1fr)" gap={3} mb={4}>
                <Box
                  bg="gray.50"
                  borderRadius="12px"
                  p={4}
                  border="1px solid"
                  borderColor="gray.200"
                  cursor="pointer"
                  onClick={() => setShowTrustedUsersList(true)}
                  _hover={{ bg: 'gray.100', borderColor: 'black' }}
                  transition="all 0.2s"
                >
                  <Text fontSize="12px" color="gray.600" mb={2}>{t('hub.ambientTrust.neighborhoodWatch.trustedNearby')}</Text>
                  <Text fontSize="20px" fontWeight="600" mb={1}>{nearbyTrustedUsers.length}</Text>
                  <HStack gap={1} fontSize="11px" color="green.600">
                    <CheckCircle size={12} />
                    <Text>{t('hub.ambientTrust.neighborhoodWatch.communityGuards')}</Text>
                  </HStack>
                </Box>
                <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                  <Text fontSize="12px" color="gray.600" mb={2}>{t('hub.ambientTrust.neighborhoodWatch.verificationRate')}</Text>
                  <Text fontSize="20px" fontWeight="600" mb={1}>
                    {isLoadingNeighborhoodWatch ? '...' : formatPercentage(neighborhoodWatchData?.verificationRate || 0)}
                  </Text>
                  <HStack gap={1} fontSize="11px" color="green.600">
                    <TrendingUp size={12} />
                    <Text>{t('hub.ambientTrust.neighborhoodWatch.venueVerificationSuccess')}</Text>
                  </HStack>
                </Box>
              </Grid>

              <Box p={4} bg="gray.50" borderRadius="12px" border="1px solid" borderColor="gray.200">
                <HStack gap={2} align="flex-start">
                  <Info size={14} style={{ marginTop: '2px' }} />
                  <Text fontSize="13px">
                    <strong>{t('hub.neighborhoodWatch.eliteCommunityGuards')}:</strong> {t('hub.neighborhoodWatch.eliteDescription')}
                  </Text>
                </HStack>
              </Box>
            </Box>

            {/* Guardian Alerts - Only for Community Guards */}
            {user?.verification_level === 'trusted' && (
              <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
                <HStack justify="space-between" align="center" mb={5}>
                  <HStack gap={3}>
                    <Box w="40px" h="40px" borderRadius="12px" bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" display="flex" alignItems="center" justifyContent="center">
                      <AlertTriangle size={18} />
                    </Box>
                    <Text fontWeight="600" fontSize="16px">{t('hub.ambientTrust.guardianAlerts.title')}</Text>
                  </HStack>
                  <Button
                    size="sm"
                    bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                    color="black"
                    borderRadius="12px"
                    px={4}
                    py={2}
                    fontSize="12px"
                    fontWeight="700"
                    onClick={() => setShowGuardianAlertModal(true)}
                    _hover={{ bg: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)' }}
                  >
                    Create Alert
                  </Button>
                </HStack>

                <Text fontSize="14px" color="gray.600" mb={4}>
                  As a Community Guard, you can create emergency alerts and safety warnings for your community
                </Text>

                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <Box
                    bg="red.50"
                    borderRadius="12px"
                    p={4}
                    border="1px solid"
                    borderColor="red.200"
                    cursor="pointer"
                    onClick={() => setShowGuardianAlertModal(true)}
                    _hover={{ bg: 'red.100', borderColor: 'red.300' }}
                    transition="all 0.2s"
                  >
                    <Box w="32px" h="32px" borderRadius="8px" bg="red.500" display="flex" alignItems="center" justifyContent="center" mb={3}>
                      <AlertTriangle size={16} color="white" />
                    </Box>
                    <Text fontWeight="600" fontSize="14px" mb={1}>Emergency Alert</Text>
                    <Text fontSize="12px" color="red.700">Immediate danger or crisis</Text>
                  </Box>

                  <Box
                    bg="orange.50"
                    borderRadius="12px"
                    p={4}
                    border="1px solid"
                    borderColor="orange.200"
                    cursor="pointer"
                    onClick={() => setShowGuardianAlertModal(true)}
                    _hover={{ bg: 'orange.100', borderColor: 'orange.300' }}
                    transition="all 0.2s"
                  >
                    <Box w="32px" h="32px" borderRadius="8px" bg="orange.500" display="flex" alignItems="center" justifyContent="center" mb={3}>
                      <AlertTriangle size={16} color="white" />
                    </Box>
                    <Text fontWeight="600" fontSize="14px" mb={1}>Safety Warning</Text>
                    <Text fontSize="12px" color="orange.700">Potential hazards</Text>
                  </Box>
                </Grid>
              </Box>
            )}



            {/* Safety Scores Card */}
            <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
              <HStack justify="space-between" align="center" mb={5}>
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                    <Store size={18} />
                  </Box>
                  <Text fontWeight="600" fontSize="16px">{t('hub.ambientTrust.nearbySafetyScores.title')}</Text>
                </HStack>
              </HStack>

              <VStack gap={2} align="stretch">
                {isLoadingNearbyVenues ? (
                  <Box textAlign="center" py={8}>
                    <Text fontSize="14px" color="gray.500">Loading nearby venues...</Text>
                  </Box>
                ) : nearbyVerifiedVenues.length > 0 ? (
                  nearbyVerifiedVenues.map((venue, index) => {
                    // Generate details based on venue score
                    const score = venue.safetyScore || 7.0;
                    const baseDetails = score >= 8.0
                      ? t('hub.ambientTrust.nearbySafetyScores.venueDetails.highScore')
                      : score >= 6.0
                        ? t('hub.ambientTrust.nearbySafetyScores.venueDetails.mediumScore')
                        : t('hub.ambientTrust.nearbySafetyScores.venueDetails.lowScore');

                    // Add distance information
                    const distanceKm = venue.distance / 1000;
                    const distanceText = distanceKm < 1
                      ? `${venue.distance}m away`
                      : `${distanceKm.toFixed(1)}km away`;
                    const details = `${baseDetails} • ${distanceText}`;

                    return (
                      <HStack key={venue.id || index} justify="space-between" align="center" p={4} bg="gray.50" borderRadius="12px" border="1px solid" borderColor="gray.200">
                        <Box flex={1}>
                          <Text fontWeight="600" mb={1}>{venue.name}</Text>
                          <Text fontSize="12px" color="gray.600">{details}</Text>
                        </Box>
                        <HStack gap={2} align="center">
                          <Text fontSize="20px" fontWeight="700">{formatNumber(Math.round(score))}/10</Text>
                          {venue.canUpdate && (
                            <Button
                              size="xs"
                              variant="outline"
                              borderRadius="6px"
                              px={3}
                              py={1}
                              fontSize="11px"
                              height="auto"
                              onClick={() => {
                                setSelectedVenue(venue);
                                setVerificationType('safety-score');
                                setShowVerificationModal(true);
                              }}
                            >
                              Update
                            </Button>
                          )}
                        </HStack>
                      </HStack>
                    );
                  })
                ) : (
                  <Box textAlign="center" py={8}>
                    <Text fontSize="16px" color="gray.600" mb={4}>
                      No verified venues found
                    </Text>
                    <Text fontSize="14px" color="gray.500" mb={6}>
                      Be the first to verify a venue in your area
                    </Text>
                    <Button
                      bg="black"
                      color="white"
                      size="lg"
                      borderRadius="12px"
                      px={8}
                      py={3}
                      onClick={() => handleVerificationClick('venue-search')}
                      _hover={{ bg: 'gray.800' }}
                    >
                      Find Venues
                    </Button>
                  </Box>
                )}
              </VStack>
            </Box>
          </VStack>
        )}
      </Box>

      {/* Footer */}
      <Box p={5} textAlign="center" color="gray.500" fontSize="11px" borderTop="1px solid" borderColor="gray.200" bg="white">
        <HStack gap={1} justify="center">
          <Shield size={12} />
          <Text>All data encrypted</Text>
        </HStack>
      </Box>

      {/* Verification Modal */}
      {showVerificationModal && (
        <VerificationModal
          type={verificationType}
          userLocation={userLocation}
          selectedVenue={selectedVenue}
          onClose={() => setShowVerificationModal(false)}
          onVenueUpdate={() => loadNearbyVenues()}
        />
      )}

      {/* Trusted Users List Modal */}
      {showTrustedUsersList && (
        <TrustedUsersListModal
          users={nearbyTrustedUsers}
          onClose={() => setShowTrustedUsersList(false)}
          onNavigateToUser={(user) => {
            // TODO: Navigate to map and focus on user location
            console.log('Navigate to user location:', user);
            setShowTrustedUsersList(false);
          }}
        />
      )}

      {/* Guardian Alert Modal */}
      {showGuardianAlertModal && (
        <GuardianAlertModal
          userLocation={userLocation}
          onClose={() => setShowGuardianAlertModal(false)}
          onAlertCreated={() => {
            // Refresh alerts if needed
            setShowGuardianAlertModal(false);
          }}
        />
      )}
    </Box>
  );
};

// Trusted Users List Modal Component
const TrustedUsersListModal: React.FC<{
  users: any[];
  onClose: () => void;
  onNavigateToUser: (user: any) => void;
}> = ({ users, onClose, onNavigateToUser }) => {
  const { CommunityGuardBadge } = require('./CredibilityIndicator');

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(255, 255, 255, 0.95)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
      p={4}
      onClick={onClose}
    >
      <Box
        bg="white"
        borderRadius="20px"
        maxW="400px"
        w="full"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="0 10px 30px rgba(0, 0, 0, 0.1)"
        onClick={(e) => e.stopPropagation()}
        maxH="80vh"
        display="flex"
        flexDirection="column"
      >
        {/* Header */}
        <HStack justify="space-between" align="center" p={6} borderBottom="1px solid" borderColor="gray.200">
          <HStack gap={3}>
            <Box w="40px" h="40px" borderRadius="12px" bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" display="flex" alignItems="center" justifyContent="center">
              <Shield size={20} />
            </Box>
            <Box>
              <Text fontSize="18px" fontWeight="600">Community Guards</Text>
              <Text fontSize="12px" color="gray.600">{users.length} nearby trusted users</Text>
            </Box>
          </HStack>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </HStack>

        {/* Content */}
        <Box flex={1} overflowY="auto" p={6}>
          {users.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Shield size={48} color="#e2e8f0" />
              <Text fontSize="16px" color="gray.600" mt={4}>
                No Community Guards found nearby
              </Text>
              <Text fontSize="14px" color="gray.500" mt={2}>
                Trusted users will appear here when available
              </Text>
            </Box>
          ) : (
            <VStack gap={4} align="stretch">
              {users.map((user, index) => (
                <Box
                  key={user.id || index}
                  p={4}
                  bg="gray.50"
                  borderRadius="12px"
                  border="1px solid"
                  borderColor="gray.200"
                  cursor="pointer"
                  onClick={() => onNavigateToUser(user)}
                  _hover={{ bg: 'gray.100', borderColor: '#FFD700' }}
                  transition="all 0.2s"
                >
                  <HStack justify="space-between" align="flex-start">
                    <Box flex={1}>
                      <HStack gap={2} mb={2}>
                        <Text fontWeight="600" fontSize="14px">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.username || 'Anonymous Guard'
                          }
                        </Text>
                        <CommunityGuardBadge size="xs" animated={false} />
                      </HStack>
                      <Text fontSize="12px" color="gray.600" mb={2}>
                        🛡️ Elite Community Guard • {user.distance.toFixed(1)}km away
                      </Text>
                      <Text fontSize="11px" color="gray.500">
                        Trusted safety leader with proven community contributions
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      variant="outline"
                      borderRadius="6px"
                      px={3}
                      py={1}
                      fontSize="11px"
                      height="auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToUser(user);
                      }}
                      _hover={{ bg: '#FFD700', borderColor: '#FFD700', color: 'black' }}
                    >
                      View on Map
                    </Button>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>

        {/* Footer */}
        <Box p={6} pt={4} borderTop="1px solid" borderColor="gray.200">
          <Text fontSize="12px" color="gray.600" textAlign="center">
            Community Guards are verified users who have earned trust through consistent, accurate safety reporting
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

// Guardian Alert Modal Component
const GuardianAlertModal: React.FC<{
  userLocation: [number, number] | null;
  onClose: () => void;
  onAlertCreated: () => void;
}> = ({ userLocation, onClose, onAlertCreated }) => {
  const { user } = useAuth();
  const [alertType, setAlertType] = useState<'emergency' | 'warning' | 'announcement' | 'safety'>('warning');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [radius, setRadius] = useState(1);
  const [expiresIn, setExpiresIn] = useState(24); // hours
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAlert = async () => {
    if (!user || !userLocation || !title.trim() || !message.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString();

      const { reportsService } = await import('../services/reports');
      await reportsService.createGuardianAlert({
        title: title.trim(),
        message: message.trim(),
        alert_type: alertType,
        latitude: userLocation[0],
        longitude: userLocation[1],
        radius_km: radius,
        expires_at: expiresAt,
        user_id: user.id,
      });

      onAlertCreated();
    } catch (error) {
      console.error('Error creating Guardian Alert:', error);
      // Show error message
    } finally {
      setIsCreating(false);
    }
  };

  const alertTypeOptions = [
    {
      value: 'emergency' as const,
      label: '🚨 Emergency Alert',
      description: 'Immediate danger or crisis requiring urgent attention',
      color: 'red',
    },
    {
      value: 'warning' as const,
      label: '⚠️ Safety Warning',
      description: 'Potential hazards or concerning situations',
      color: 'orange',
    },
    {
      value: 'announcement' as const,
      label: '📢 Community Announcement',
      description: 'Important community information or updates',
      color: 'blue',
    },
    {
      value: 'safety' as const,
      label: '🛡️ Safety Advisory',
      description: 'General safety tips and recommendations',
      color: 'green',
    },
  ];

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(255, 255, 255, 0.95)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
      p={4}
      onClick={onClose}
    >
      <Box
        bg="white"
        borderRadius="20px"
        maxW="450px"
        w="full"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="0 10px 30px rgba(0, 0, 0, 0.1)"
        onClick={(e) => e.stopPropagation()}
        maxH="90vh"
        display="flex"
        flexDirection="column"
      >
        {/* Header */}
        <HStack justify="space-between" align="center" p={6} borderBottom="1px solid" borderColor="gray.200">
          <HStack gap={3}>
            <Box w="40px" h="40px" borderRadius="12px" bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" display="flex" alignItems="center" justifyContent="center">
              <AlertTriangle size={20} />
            </Box>
            <Box>
              <Text fontSize="18px" fontWeight="600">Create Guardian Alert</Text>
              <Text fontSize="12px" color="gray.600">Alert your community as a trusted leader</Text>
            </Box>
          </HStack>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </HStack>

        {/* Content */}
        <Box flex={1} overflowY="auto" p={6}>
          <VStack gap={6} align="stretch">
            {/* Alert Type Selection */}
            <Box>
              <Text fontSize="16px" fontWeight="600" mb={4}>Alert Type</Text>
              <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                {alertTypeOptions.map((option) => (
                  <Box
                    key={option.value}
                    p={4}
                    bg={alertType === option.value ? `${option.color}.50` : 'gray.50'}
                    borderRadius="12px"
                    border="2px solid"
                    borderColor={alertType === option.value ? `${option.color}.300` : 'gray.200'}
                    cursor="pointer"
                    onClick={() => setAlertType(option.value)}
                    transition="all 0.2s"
                    _hover={{ borderColor: `${option.color}.300` }}
                  >
                    <Text fontWeight="600" fontSize="14px" mb={2} color={`${option.color}.700`}>
                      {option.label}
                    </Text>
                    <Text fontSize="12px" color="gray.600">
                      {option.description}
                    </Text>
                  </Box>
                ))}
              </Grid>
            </Box>

            {/* Alert Details */}
            <Box>
              <Text fontSize="16px" fontWeight="600" mb={4}>Alert Details</Text>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="14px" fontWeight="500" mb={2}>Title</Text>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief, clear title for your alert"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </Box>

                <Box>
                  <Text fontSize="14px" fontWeight="500" mb={2}>Message</Text>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide detailed information about the situation..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </Box>
              </VStack>
            </Box>

            {/* Alert Settings */}
            <Box>
              <Text fontSize="16px" fontWeight="600" mb={4}>Alert Settings</Text>
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <Box>
                  <Text fontSize="14px" fontWeight="500" mb={2}>Coverage Radius</Text>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    title="Coverage Radius"
                    aria-label="Coverage Radius"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value={0.5}>0.5 km</option>
                    <option value={1}>1 km</option>
                    <option value={2}>2 km</option>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                  </select>
                </Box>

                <Box>
                  <Text fontSize="14px" fontWeight="500" mb={2}>Expires In</Text>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(Number(e.target.value))}
                    aria-label="Expires In"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                  </select>
                </Box>
              </Grid>
            </Box>

            {/* Preview */}
            <Box p={4} bg="gray.50" borderRadius="12px">
              <Text fontSize="14px" fontWeight="600" mb={2}>Preview</Text>
              <Box p={3} bg="white" borderRadius="8px" border="1px solid" borderColor="gray.200">
                <HStack gap={2} mb={2}>
                  <Text fontSize="12px" color="gray.600">🛡️ Community Guard Alert</Text>
                  <Text fontSize="12px" color="gray.600">• {radius}km radius</Text>
                </HStack>
                <Text fontWeight="600" fontSize="14px" mb={1}>
                  {title || 'Alert Title'}
                </Text>
                <Text fontSize="13px" color="gray.700">
                  {message || 'Alert message will appear here...'}
                </Text>
              </Box>
            </Box>
          </VStack>
        </Box>

        {/* Footer */}
        <HStack gap={3} p={6} pt={4} borderTop="1px solid" borderColor="gray.200">
          <Button variant="outline" flex={1} onClick={onClose}>
            Cancel
          </Button>
          <Button
            bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
            color="black"
            flex={1}
            onClick={handleCreateAlert}
            disabled={isCreating || !title.trim() || !message.trim()}
            _hover={{ bg: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)' }}
          >
            {isCreating ? 'Creating...' : 'Create Alert'}
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

export default HubView;
