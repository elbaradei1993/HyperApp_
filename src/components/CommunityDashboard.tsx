import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, Grid, GridItem, Select, IconButton } from '@chakra-ui/react';
import { ChevronUp, ChevronDown, MapPin, Activity, Users, Clock } from 'lucide-react';
import {
  ShieldCheck,
  CloudSnow,
  Music,
  PartyPopper,
  EyeOff,
  AlertTriangle,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { clusterReports, formatDistance, analyzeClusterVibes, calculateDistance, type LocationCluster } from '../lib/clustering';
import { reportsService } from '../services/reports';
import { reverseGeocode } from '../lib/geocoding';
import { VIBE_CONFIG, VibeType } from '../constants/vibes';
import { useVibe } from '../contexts/VibeContext';
import { useAuth } from '../contexts/AuthContext';
import { backgroundLocationService } from '../services/backgroundLocationService';
import { credibilityService } from '../services/credibilityService';
import type { Vibe, Report } from '../types';

import VibePulseCard from './VibePulseCard';
import PremiumEmptyState from './PremiumEmptyState';
import { CredibilityIndicator, UserVerificationBadge, ValidationButtons } from './CredibilityIndicator';
import { LoadingSpinner, EmptyState, CircularProgress, MultiSegmentCircularProgress } from './shared';

interface CommunityDashboardProps {
  vibes: Vibe[];
  userLocation: [number, number] | null;
  isLoading?: boolean;
  onNewReport?: () => void;
  onNavigateToMap?: (latitude: number, longitude: number) => void;
  onNavigateToProfile?: (userId: string) => void;
  onVibesUpdate?: (vibes: Vibe[]) => void;
}

interface ReportWithVote extends Report {
  user_vote?: 'upvote' | 'downvote' | null;
}

const CommunityDashboard: React.FC<CommunityDashboardProps> = ({
  vibes,
  userLocation,
  isLoading = false,
  onNewReport,
  onNavigateToMap,
  onNavigateToProfile,
  onVibesUpdate,
}) => {
  const { t } = useTranslation();
  const { setCurrentLocationVibe } = useVibe();
  const { user, isAuthenticated } = useAuth();
  const [clusters, setClusters] = useState<LocationCluster[]>([]);
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string>('');
  const [localCurrentLocationVibe, setLocalCurrentLocationVibe] = useState<{
    type: string;
    percentage: number;
    count: number;
  } | null>(null);
  const [currentLocationVibeDistribution, setCurrentLocationVibeDistribution] = useState<Array<{
    type: string;
    percentage: number;
    count: number;
    color: string;
  }>>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [userReportsLoading, setUserReportsLoading] = useState(false);
  const [isVibeBreakdownExpanded, setIsVibeBreakdownExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isActivityExpanded, setIsActivityExpanded] = useState(true);
  const [communityCount, setCommunityCount] = useState(0);
  const [recentUsers, setRecentUsers] = useState<Array<{
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    profile_picture_url: string | null;
  }>>([]);
  const [userValidations, setUserValidations] = useState<Record<number, 'confirm' | 'deny' | null>>({});
  const [validatingReportId, setValidatingReportId] = useState<number | null>(null);

  // Ref for subscription cleanup
  const subscriptionsRef = useRef<{ reports?: any; votes?: any; credibility?: any }>({});

  // Memoize vibe color and icon maps for performance
  const vibeColorMap = useMemo(() => VIBE_CONFIG, []);
  const vibeIconMap = useMemo(() => {
    const iconMap: Record<VibeType, string> = {
      safe: '🛡️',
      calm: '😌',
      lively: '🎉',
      festive: '🎊',
      crowded: '👥',
      suspicious: '⚠️',
      dangerous: '🚨',
      noisy: '🔊',
      quiet: '🤫',
      unknown: '❓',
    };
    return iconMap;
  }, []);

  // Performance optimized functions using useCallback
  const getVibeColor = useCallback((vibeType: string): string => {
    return vibeColorMap[vibeType as VibeType]?.color || '#6b7280';
  }, [vibeColorMap]);

  const getVibeIcon = useCallback((vibeType: string): string => {
    return vibeIconMap[vibeType as VibeType] || '❓';
  }, [vibeIconMap]);

  const getVibeIconComponent = useCallback((vibeType: string) => {
    switch (vibeType) {
    case 'safe':
      return <ShieldCheck size={32} />;
    case 'calm':
      return <CloudSnow size={32} />;
    case 'lively':
      return <Music size={32} />;
    case 'festive':
      return <PartyPopper size={32} />;
    case 'crowded':
      return <Users size={32} />;
    case 'suspicious':
      return <EyeOff size={32} />;
    case 'dangerous':
      return <AlertTriangle size={32} />;
    case 'noisy':
      return <Volume2 size={32} />;
    case 'quiet':
      return <VolumeX size={32} />;
    default:
      return <ShieldCheck size={32} />;
    }
  }, []);

  // Extract vibe analysis logic
  const analyzeNearbyVibes = useCallback((location: [number, number], vibes: Vibe[]) => {
    const nearbyReports = vibes.filter((vibe: Vibe) => {
      if (vibe.latitude == null || vibe.longitude == null) {
        return false;
      }
      const distance = calculateDistance(
        location[0],
        location[1],
        vibe.latitude!,
        vibe.longitude!,
      );
      return distance <= 1;
    });

    if (nearbyReports.length === 0) {
      return { dominantVibe: null, distribution: [] };
    }

    const vibeAnalysis = analyzeClusterVibes(nearbyReports);

    // Calculate distribution - include all vibes from VIBE_CONFIG
    const vibeCounts: Record<string, number> = {};
    nearbyReports.forEach(report => {
      vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
    });

    const totalReports = nearbyReports.length;
    const distribution = Object.keys(VIBE_CONFIG)
      .map((type) => {
        const count = vibeCounts[type] || 0;
        const percentage = count > 0 ? Math.round((count / totalReports) * 100) : 0;
        const color = count > 0 ? getVibeColor(type) : '#ffffff';
        return {
          type,
          count,
          percentage,
          color,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    return { dominantVibe: vibeAnalysis.dominantVibe, distribution };
  }, [getVibeColor]);

  // Retry functionality
  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  // Load user reports for recent activity
  const loadUserReports = useCallback(async (): Promise<Report[]> => {
    try {
      setUserReportsLoading(true);
      const reports = await reportsService.getReports({ limit: 10 });
      return reports;
    } catch (error) {
      console.error('Error loading user reports:', error);
      return [];
    } finally {
      setUserReportsLoading(false);
    }
  }, []);

  // Memoize processed clusters to avoid re-computation on every render
  const processedClusters = useMemo(() => {
    if (vibes.length === 0) {
      return [];
    }

    const processedClusters = clusterReports(vibes, userLocation, 1);
    return processedClusters.filter(cluster =>
      cluster.locationName && cluster.locationName.trim() !== '',
    );
  }, [vibes, userLocation]);

  // Update clusters when processedClusters changes
  useEffect(() => {
    setClusters(processedClusters);
  }, [processedClusters]);

  // Analyze vibes when userLocation or vibes change
  useEffect(() => {
    const analyzeLocationVibes = async () => {
      if (!userLocation || vibes.length === 0) {
        setCurrentLocationAddress('');
        setLocalCurrentLocationVibe(null);
        setCurrentLocationVibeDistribution([]);
        setCurrentLocationVibe(null);
        return;
      }

      setIsGeocoding(true);
      setError(null);

      try {
        const [address, vibeAnalysis] = await Promise.all([
          reverseGeocode(userLocation[0], userLocation[1]),
          analyzeNearbyVibes(userLocation, vibes),
        ]);

        setCurrentLocationAddress(address);
        setLocalCurrentLocationVibe(vibeAnalysis.dominantVibe);
        setCurrentLocationVibeDistribution(vibeAnalysis.distribution);

        if (vibeAnalysis.dominantVibe) {
          setCurrentLocationVibe({
            type: vibeAnalysis.dominantVibe.type,
            percentage: vibeAnalysis.dominantVibe.percentage,
            count: vibeAnalysis.dominantVibe.count,
            color: getVibeColor(vibeAnalysis.dominantVibe.type),
          });
        } else {
          setCurrentLocationVibe(null);
        }
      } catch (error) {
        console.error('Error processing location data:', error);
        setError(t('community.failedToLoadLocationData'));
        setCurrentLocationAddress('');
        setLocalCurrentLocationVibe(null);
        setCurrentLocationVibeDistribution([]);
      } finally {
        setIsGeocoding(false);
      }
    };

    analyzeLocationVibes();
  }, [userLocation, vibes, analyzeNearbyVibes, getVibeColor]);

  // Generate enhanced activity feed with priority sorting
  const activityFeed = useMemo(() => {
    const sortedReports = vibes
      .sort((a, b) => {
        const aIsTrusted = a.profile?.verification_level === 'trusted';
        const bIsTrusted = b.profile?.verification_level === 'trusted';

        if (aIsTrusted && !bIsTrusted) {
          return -1;
        }
        if (!aIsTrusted && bIsTrusted) {
          return 1;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 6);

    return sortedReports.map((report: any) => {
      const getDisplayName = () => {
        if (report.profile?.first_name && report.profile?.last_name) {
          return `${report.profile.first_name} ${report.profile.last_name}`;
        }
        if (report.profile?.username) {
          return report.profile.username;
        }
        return report.user_id.substring(0, 8);
      };

      return {
        id: report.id,
        user: report.user_id.substring(0, 2).toUpperCase(),
        userId: getDisplayName(),
        message: `${t('community.reportedAtmosphere', 'Reported {{vibe}} atmosphere', { vibe: String(t(`vibes.${report.vibe_type}`, report.vibe_type)) })}${report.notes ? ` - ${report.notes.substring(0, 40)}` : ''}`,
        location: report.location || t('community.unknownLocation'),
        time: new Date(report.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        type: report.emergency ? 'safe' : report.vibe_type,
        vibeType: report.vibe_type,
        notes: report.notes || '',
        createdAt: report.created_at,
        credibilityScore: report.credibility_score || 0.5,
        validationCount: report.validation_count || 0,
        verificationLevel: report.profile?.verification_level || 'basic',
      };
    });
  }, [vibes]);

  // Load user reports and community count on component mount
  useEffect(() => {
    const loadReports = async () => {
      const reports = await loadUserReports();
      setUserReports(reports);
    };
    loadReports();

    const loadCommunityData = async () => {
      try {
        const [count, users] = await Promise.all([
          reportsService.getUniqueLocationCount(),
          reportsService.getRecentReporters(4),
        ]);
        setCommunityCount(count);
        setRecentUsers(users);
      } catch (error) {
        console.error('Failed to load community data:', error);
        setCommunityCount(0);
        setRecentUsers([]);
      }
    };
    loadCommunityData();

    if (user?.id) {
      loadUserValidations();
    }
  }, [loadUserReports, user?.id]);

  // Load user validations
  const loadUserValidations = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setUserValidations({});
      return;
    }

    try {
      const recentReportIds = activityFeed.map(activity => activity.id);
      const validations: Record<number, 'confirm' | 'deny' | null> = {};

      for (const reportId of recentReportIds) {
        const validation = await credibilityService.getUserValidation(reportId, user.id);
        validations[reportId] = validation;
      }

      setUserValidations(validations);
    } catch (error) {
      console.error('Error loading user validations:', error);
      setUserValidations({});
    }
  }, [user?.id, isAuthenticated, activityFeed]);

  // Handle report validation
  const handleValidation = useCallback(async (reportId: number, validationType: 'confirm' | 'deny') => {
    if (!user?.id) {
      return;
    }

    setValidatingReportId(reportId);

    try {
      const success = await credibilityService.validateReport(reportId, user.id, validationType);
      if (success) {
        setUserValidations(prev => ({
          ...prev,
          [reportId]: validationType,
        }));
      }
    } catch (error) {
      console.error('Error validating report:', error);
    } finally {
      setValidatingReportId(null);
    }
  }, [user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isAuthenticated || !user?.onboarding_completed) {
      return;
    }

    Object.values(subscriptionsRef.current).forEach(subscription => {
      subscription?.unsubscribe?.();
    });
    subscriptionsRef.current = {};

    let updateTimeout: NodeJS.Timeout;
    let lastUpdate = Date.now();

    subscriptionsRef.current.reports = reportsService.subscribeToReports((newReport) => {
      const now = Date.now();
      if (now - lastUpdate < 2000) {
        return;
      }

      lastUpdate = now;

      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (!newReport.emergency) {
          onVibesUpdate?.([newReport, ...vibes.slice(0, 999)]);
          if (newReport.location) {
            setCommunityCount(prev => prev + 1);
          }
        }
      }, 100);
    });

    subscriptionsRef.current.votes = reportsService.subscribeToVotes((update) => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        onVibesUpdate?.(vibes.map((vibe: Vibe) =>
          vibe.id === update.reportId
            ? { ...vibe, upvotes: update.upvotes, downvotes: update.downvotes }
            : vibe,
        ));
        setUserReports(prev => prev.map(report =>
          report.id === update.reportId
            ? { ...report, upvotes: update.upvotes, downvotes: update.downvotes }
            : report,
        ));
      }, 100);
    });

    subscriptionsRef.current.credibility = reportsService.subscribeToCredibilityUpdates((update) => {
      onVibesUpdate?.(vibes.map((vibe: Vibe) =>
        vibe.id === update.reportId
          ? {
            ...vibe,
            credibility_score: update.credibility_score,
            validation_count: update.validation_count,
          }
          : vibe,
      ));
      setUserReports(prev => prev.map(report =>
        report.id === update.reportId
          ? {
            ...report,
            credibility_score: update.credibility_score,
            validation_count: update.validation_count,
          }
          : report,
      ));
    });

    return () => {
      clearTimeout(updateTimeout);
      Object.values(subscriptionsRef.current).forEach(subscription => {
        subscription?.unsubscribe?.();
      });
      subscriptionsRef.current = {};
    };
  }, [user?.onboarding_completed, onVibesUpdate]);

  if (isLoading) {
    return (
      <Box maxW="500px" mx="auto" bg="white" minH="100vh" position="relative" borderX="1px solid" borderColor="gray.200">
        <Box p={8} textAlign="center">
          <LoadingSpinner size="lg" />
          <Text fontSize="16px" fontWeight="600" color="gray.600" mt={4}>
            {t('community.loadingCommunityData')}
          </Text>
        </Box>
      </Box>
    );
  }

  if (clusters.length === 0 && !isLoading) {
    return (
      <PremiumEmptyState
        onPrimaryAction={onNewReport}
        communityCount={communityCount}
        recentUsers={recentUsers}
      />
    );
  }

  return (
    <Box maxW="500px" mx="auto" bg="white" minH="100vh" position="relative" borderX="1px solid" borderColor="gray.200">
      {/* Header */}
      <Box
        bg="white"
        color="black"
        p={6}
        position="sticky"
        top={0}
        zIndex={100}
        borderBottom="1px solid"
        borderColor="gray.200"
        boxShadow="0 1px 3px rgba(0, 0, 0, 0.05)"
      >
        <VStack justify="center" align="center">
          <Text fontSize="20px" fontWeight="700" letterSpacing="-0.5px" lineHeight="1.2">
            {t('tabs.community')}
          </Text>
          <Text fontSize="12px" color="gray.700" mt={2} letterSpacing="0.5px" fontWeight="500">
            {t('community.localSafetyInsights')}
          </Text>
        </VStack>
      </Box>

      {/* Main Content */}
      <Box p={6} minH="calc(100vh - 180px)">
        <VStack gap={4} align="stretch">
          {/* Location Card */}
          {isGeocoding ? (
            <Box bg="white" borderRadius="16px" p={8} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" textAlign="center">
              <LoadingSpinner size="lg" />
              <Text fontSize="14px" fontWeight="600" color="gray.600" mt={4}>
                {t('community.loadingLocationData')}
              </Text>
            </Box>
          ) : userLocation && currentLocationAddress ? (
            <Box bg="white" borderRadius="16px" p={6} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" mb={4}>
              <VStack gap={4} align="center">
                <HStack gap={3}>
                  <Box w="12" h="12" borderRadius="8px" bg="blue.100" display="flex" alignItems="center" justifyContent="center">
                    <MapPin size={16} color="#2563eb" />
                  </Box>
                  <Text fontSize="16px" fontWeight="700" color="gray.900">
                    {currentLocationAddress}
                  </Text>
                </HStack>

                {/* Vibe Analysis */}
                {localCurrentLocationVibe ? (
                  <Box
                    bg={`linear-gradient(135deg, ${getVibeColor(localCurrentLocationVibe.type)}08 0%, ${getVibeColor(localCurrentLocationVibe.type)}04 100%)`}
                    border={`1px solid ${getVibeColor(localCurrentLocationVibe.type)}20`}
                    borderRadius="16px"
                    p={6}
                    w="full"
                  >
                    <VStack gap={4} align="center">
                      {/* Pulsing Animation Container */}
                      <Box position="relative" display="flex" alignItems="center" justifyContent="center">
                        {/* Animated pulsing rings */}
                        <Box
                          position="absolute"
                          top="50%"
                          left="50%"
                          transform="translate(-50%, -50%)"
                          w="140px"
                          h="140px"
                          borderRadius="50%"
                          border={`1px solid ${getVibeColor(localCurrentLocationVibe.type)}30`}
                          animation="pulseRing1 3s ease-in-out infinite"
                          opacity={0.8}
                        />
                        <Box
                          position="absolute"
                          top="50%"
                          left="50%"
                          transform="translate(-50%, -50%)"
                          w="160px"
                          h="160px"
                          borderRadius="50%"
                          border={`1px solid ${getVibeColor(localCurrentLocationVibe.type)}25`}
                          animation="pulseRing2 3s ease-in-out infinite 1s"
                          opacity={0.6}
                        />
                        <Box
                          position="absolute"
                          top="50%"
                          left="50%"
                          transform="translate(-50%, -50%)"
                          w="180px"
                          h="180px"
                          borderRadius="50%"
                          border={`1px solid ${getVibeColor(localCurrentLocationVibe.type)}20`}
                          animation="pulseRing3 3s ease-in-out infinite 2s"
                          opacity={0.4}
                        />

                        <MultiSegmentCircularProgress
                          segments={currentLocationVibeDistribution
                            .filter(vibe => vibe.percentage > 0)
                            .slice(0, 5)
                            .map(vibe => ({
                              percentage: vibe.percentage,
                              color: vibe.color,
                              label: String(t(`vibes.${vibe.type}`, vibe.type)),
                            }))}
                          size={120}
                          strokeWidth={12}
                          centerContent={
                            <VStack gap={1} align="center">
                              <Text fontSize="24px" fontWeight="900" color={getVibeColor(localCurrentLocationVibe.type)}>
                                {localCurrentLocationVibe.percentage}%
                              </Text>
                              <Text fontSize="12px" fontWeight="700" color={getVibeColor(localCurrentLocationVibe.type)} textTransform="uppercase">
                                {String(t(`vibes.${localCurrentLocationVibe.type}`, localCurrentLocationVibe.type))}
                              </Text>
                            </VStack>
                          }
                        />
                      </Box>

                      {/* CSS Animations */}
                      <style>
                        {`
                          @keyframes pulseRing1 {
                            0%, 100% {
                              transform: translate(-50%, -50%) scale(1);
                              opacity: 0.6;
                            }
                            50% {
                              transform: translate(-50%, -50%) scale(1.1);
                              opacity: 0.3;
                            }
                          }
                          @keyframes pulseRing2 {
                            0%, 100% {
                              transform: translate(-50%, -50%) scale(1);
                              opacity: 0.4;
                            }
                            50% {
                              transform: translate(-50%, -50%) scale(1.15);
                              opacity: 0.2;
                            }
                          }
                          @keyframes pulseRing3 {
                            0%, 100% {
                              transform: translate(-50%, -50%) scale(1);
                              opacity: 0.2;
                            }
                            50% {
                              transform: translate(-50%, -50%) scale(1.2);
                              opacity: 0.1;
                            }
                          }
                        `}
                      </style>

                      <Text fontSize="12px" color="gray.600" textAlign="center">
                        {t('community.sentimentDistribution')}
                      </Text>

                      {/* Expandable Breakdown */}
                      <Button
                        onClick={() => setIsVibeBreakdownExpanded(!isVibeBreakdownExpanded)}
                        variant="outline"
                        size="sm"
                        borderRadius="12px"
                      >
                        <HStack gap={2} justify="center">
                          <Text fontSize="12px">{t('community.viewDetailedBreakdown')}</Text>
                          {isVibeBreakdownExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </HStack>
                      </Button>

                      {isVibeBreakdownExpanded && (
                        <Grid templateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={3} w="full">
                          {currentLocationVibeDistribution
                            .filter(vibe => vibe.percentage > 0)
                            .map((vibe) => (
                              <Box
                                key={vibe.type}
                                bg="white"
                                borderRadius="12px"
                                p={3}
                                border="1px solid"
                                borderColor="gray.200"
                                textAlign="center"
                              >
                                <Box w="8" h="8" borderRadius="6px" bg={`${vibe.color}20`} display="flex" alignItems="center" justifyContent="center" mx="auto" mb={2}>
                                  {getVibeIconComponent(vibe.type)}
                                </Box>
                                <Text fontSize="12px" fontWeight="700" color={vibe.color} mb={1}>
                                  {String(t(`vibes.${vibe.type}`, vibe.type))}
                                </Text>
                                <Text fontSize="16px" fontWeight="900" color={vibe.color}>
                                  {vibe.percentage}%
                                </Text>
                              </Box>
                            ))}
                        </Grid>
                      )}
                    </VStack>
                  </Box>
                ) : (
                  <Box bg="gray.50" borderRadius="16px" p={8} border="2px solid" borderColor="gray.200" textAlign="center">
                    <Activity size={32} color="#9ca3af" />
                    <Text fontSize="14px" fontWeight="500" color="gray.600" mt={2}>
                      {t('community.noCommunityReportsYet')}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>
          ) : (
            <Box bg="white" borderRadius="16px" p={8} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" textAlign="center">
              <MapPin size={48} color="#94a3b8" />
              <Text fontSize="16px" fontWeight="700" color="gray.600" mt={4}>
                {t('community.locationNotAvailable')}
              </Text>
              <Text fontSize="12px" color="gray.500">
                {t('community.enableLocationServices')}
              </Text>
            </Box>
          )}

          {/* Activity Feed */}
          <Box bg="white" borderRadius="16px" border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
            <Box
              p={5}
              borderBottom={isActivityExpanded ? '1px solid' : 'none'}
              borderColor="gray.200"
              cursor="pointer"
              onClick={() => setIsActivityExpanded(!isActivityExpanded)}
            >
              <HStack justify="space-between" align="center">
                <HStack gap={3}>
                  <Box w="10" h="10" borderRadius="8px" bg="orange.100" display="flex" alignItems="center" justifyContent="center">
                    <Activity size={16} color="#d97706" />
                  </Box>
                  <Text fontSize="16px" fontWeight="700" color="gray.900">
                    {t('community.recentActivity')}
                  </Text>
                </HStack>
                <Button
                  aria-label="Toggle activity feed"
                  variant="ghost"
                  size="sm"
                  p={2}
                  minW="auto"
                  h="auto"
                >
                  {isActivityExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </HStack>
            </Box>

            {isActivityExpanded && (
              <Box p={5}>
                <VStack gap={4} align="stretch">
                  {activityFeed.map((activity) => (
                    <Box
                      key={activity.id}
                      bg="gray.50"
                      borderRadius="12px"
                      p={4}
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <VStack gap={3} align="stretch">
                        <Text fontSize="12px" fontWeight="600" color="gray.900">
                          {activity.message}
                        </Text>

                        <HStack gap={4} fontSize="12px" color="gray.600">
                          <HStack gap={1}>
                            <Users size={12} />
                            <Text>{activity.userId}</Text>
                          </HStack>
                          <HStack gap={1}>
                            <MapPin size={12} />
                            <Text>{activity.location}</Text>
                          </HStack>
                          <HStack gap={1}>
                            <Clock size={12} />
                            <Text>{activity.time}</Text>
                          </HStack>
                        </HStack>

                        <HStack gap={2} flexWrap="wrap">
                          <Box
                            px={2}
                            py={1}
                            borderRadius="6px"
                            fontSize="10px"
                            fontWeight="700"
                            textTransform="uppercase"
                            bg={`${getVibeColor(activity.type)}20`}
                            color={getVibeColor(activity.type)}
                            border={`1px solid ${getVibeColor(activity.type)}40`}
                          >
                            {String(t(`vibes.${activity.type}`, activity.type))}
                          </Box>

                          <UserVerificationBadge
                            level={activity.verificationLevel}
                            size="sm"
                          />

                          <CredibilityIndicator
                            score={activity.credibilityScore}
                            validationCount={activity.validationCount}
                            size="sm"
                          />
                        </HStack>

                        <ValidationButtons
                          reportId={activity.id}
                          userValidation={userValidations[activity.id] || null}
                          onValidate={(validationType) => handleValidation(activity.id, validationType)}
                          size="sm"
                          isAuthenticated={isAuthenticated}
                          isValidating={validatingReportId === activity.id}
                        />
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};

export default CommunityDashboard;
