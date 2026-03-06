import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, Grid, GridItem, Badge } from '@chakra-ui/react';
import { Geolocation } from '@capacitor/geolocation';
import { User as UserIcon, Mail, Phone, MapPin, Edit, List, Star, Trophy, Medal, PlusCircle, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { reportsService } from '../services/reports';
import { uploadService } from '../services/upload';
import { reverseGeocode } from '../lib/geocoding';
import type { User } from '../types';
import { INTEREST_CATEGORIES } from '../types';

import { LoadingSpinner } from './shared';
import TranslationTest from './TranslationTest';
import EditProfileModal from './EditProfileModal';


interface UserStats {
  totalReports: number;
  totalUpvotes: number;
  reputation: number;
  rank: number | null;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
}

interface RecentActivity {
  id: number;
  vibe_type: string;
  location: string;
  notes: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
}

interface Report {
  id: number;
  vibe_type: string;
  location?: string;
  notes?: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user_vote?: 'upvote' | 'downvote' | null;
  user_id?: string;
}

const ProfileView: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalReports: 0,
    totalUpvotes: 0,
    reputation: 0,
    rank: null,
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [nearbyReports, setNearbyReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMyReports, setShowMyReports] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [cachedUserReports, setCachedUserReports] = useState<Report[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    location: '',
    interests: [] as string[],
    profilePicture: null as File | null,
    profilePicturePreview: '',
  });
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [communityGuardAnalytics, setCommunityGuardAnalytics] = useState<{
    reportsHelped: number;
    validationsPerformed: number;
    avgCredibilityScore: number;
    communityRank: number | null;
    totalReports: number;
    trustedSince: string | null;
  } | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current location and reverse geocode it - same as Community Dashboard
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        setIsGeocoding(true);
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });

        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setCurrentLocationAddress(address);
        setLocationAddress(address);
      } catch (error) {
        console.error('Error getting current location:', error);
        setCurrentLocationAddress('Location unavailable');
        setLocationAddress('Location unavailable');
      } finally {
        setIsGeocoding(false);
      }
    };

    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (user) {
      loadProfileData();
      loadReportsData();

      // Load Community Guard analytics if user is trusted
      if (user.verification_level === 'trusted') {
        loadCommunityGuardAnalytics();
      }

      // Set up real-time subscriptions for automatic updates
      const reportsSubscription = reportsService.subscribeToReports((newReport) => {
        // Refresh profile data when new reports are created
        loadProfileData();
        loadReportsData();
        if (user.verification_level === 'trusted') {
          loadCommunityGuardAnalytics();
        }
      });

      const votesSubscription = reportsService.subscribeToVotes((update) => {
        // Immediately update vote counts for user's reports if this report belongs to them
        const isUserReport = myReports.some(report => report.id === update.reportId);
        if (isUserReport) {
          setMyReports(prevReports =>
            prevReports.map(report =>
              report.id === update.reportId
                ? { ...report, upvotes: update.upvotes, downvotes: update.downvotes }
                : report,
            ),
          );

          // Also update recent activity data
          setRecentActivity(prevActivity =>
            prevActivity.map(activity =>
              activity.id === update.reportId
                ? { ...activity, upvotes: update.upvotes, downvotes: update.downvotes }
                : activity,
            ),
          );
        }

        // Also refresh full data to ensure consistency (as fallback)
        loadProfileData();
        loadReportsData();
        if (user.verification_level === 'trusted') {
          loadCommunityGuardAnalytics();
        }
      });

      // Cleanup subscriptions on unmount
      return () => {
        reportsSubscription.unsubscribe();
        votesSubscription.unsubscribe();
      };
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);

      // Load critical profile data first (basic info and stats)
      const statsData = await loadUserStats();
      setStats(statsData);

      // Load recent activity immediately after stats
      const activityData = await loadRecentActivity();
      setRecentActivity(activityData);

      // Defer badge loading to improve initial load time
      loadUserBadges().then(badgesData => {
        setBadges(badgesData);
      }).catch(error => {
        console.error('Error loading badges:', error);
        setBadges([]);
      });

    } catch (error) {
      console.error('Error loading profile data:', error);
      // Set default values on error
      setStats({ totalReports: 0, totalUpvotes: 0, reputation: 0, rank: null });
      setBadges([]);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (): Promise<UserStats> => {
    try {
      // Use cached reports if available, otherwise fetch them
      let reports = cachedUserReports;
      if (!reportsLoaded || reports.length === 0) {
        reports = await reportsService.getReports({ userId: user!.id });
        setCachedUserReports(reports);
        setReportsLoaded(true);
      }

      const totalReports = reports.length;
      const totalUpvotes = reports.reduce((sum: number, r) => sum + (r.upvotes || 0), 0);
      const reputation = calculateUserReputationFromReports(reports);
      const rank = await calculateUserRank(user!.id);

      return { totalReports, totalUpvotes, reputation, rank };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return { totalReports: 0, totalUpvotes: 0, reputation: 0, rank: null };
    }
  };

  const calculateUserReputationFromReports = (reports: Report[]): number => {
    let reputation = 0;
    reports.forEach((report) => {
      const netVotes = (report.upvotes || 0) - (report.downvotes || 0);
      reputation += Math.max(0, netVotes);
    });

    // Add base reputation for active users
    reputation += Math.min(10, reports.length);

    return Math.max(0, reputation);
  };

  const calculateUserReputation = async (userId: string): Promise<number> => {
    try {
      const reports = await reportsService.getReports({ userId });
      return calculateUserReputationFromReports(reports);
    } catch (error) {
      console.error('Error calculating user reputation:', error);
      return 0;
    }
  };

  const calculateUserRank = async (userId: string): Promise<number | null> => {
    try {
      const { data: allUsers, error } = await authService.getAllUsersByReputation();

      if (error) {
        console.error('Error calculating user rank:', error);
        return null;
      }

      const userIndex = allUsers.findIndex((u: any) => u.user_id === userId);
      return userIndex !== -1 ? userIndex + 1 : null;
    } catch (error) {
      console.error('Error calculating user rank:', error);
      return null;
    }
  };

  const loadCommunityGuardAnalytics = async () => {
    if (!user) {
      return;
    }

    try {
      setIsLoadingAnalytics(true);
      const analytics = await reportsService.getCommunityGuardAnalytics(user.id);
      setCommunityGuardAnalytics(analytics);
    } catch (error) {
      console.error('Error loading Community Guard analytics:', error);
      setCommunityGuardAnalytics(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadUserBadges = async (): Promise<Badge[]> => {
    const userBadges: Badge[] = [];

    // Use cached reports if available
    const reports = cachedUserReports.length > 0 ? cachedUserReports : await reportsService.getReports({ userId: user!.id });
    const reputation = calculateUserReputationFromReports(reports);
    const reportCount = reports.length;

    // Community Guard badge - check verification level
    if (user!.verification_level === 'trusted') {
      userBadges.push({
        id: 'community-guard',
        name: t('profile.badges.communityGuard.name', 'Community Guard'),
        description: t('profile.badges.communityGuard.description', 'Elite Community Guard - Trusted safety leader with proven track record'),
        icon: 'fas fa-shield-alt',
        color: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
        earned: true,
      });
    }

    // Reputation-based badges
    if (reputation >= 100) {
      userBadges.push({
        id: 'community-leader',
        name: t('profile.badges.communityLeader.name'),
        description: t('profile.badges.communityLeader.description'),
        icon: 'fas fa-crown',
        color: 'linear-gradient(135deg, #FFD700, #FFA500)',
        earned: true,
      });
    } else if (reputation >= 50) {
      userBadges.push({
        id: 'trusted-reporter',
        name: t('profile.badges.trustedReporter.name'),
        description: t('profile.badges.trustedReporter.description'),
        icon: 'fas fa-shield-alt',
        color: 'linear-gradient(135deg, #4CAF50, #45A049)',
        earned: true,
      });
    } else if (reputation >= 10) {
      userBadges.push({
        id: 'active-contributor',
        name: t('profile.badges.activeContributor.name'),
        description: t('profile.badges.activeContributor.description'),
        icon: 'fas fa-star',
        color: 'linear-gradient(135deg, #2196F3, #1976D2)',
        earned: true,
      });
    }

    // Activity-based badges
    if (reportCount >= 50) {
      userBadges.push({
        id: 'safety-guardian',
        name: t('profile.badges.safetyGuardian.name'),
        description: t('profile.badges.safetyGuardian.description'),
        icon: 'fas fa-user-shield',
        color: 'linear-gradient(135deg, #9C27B0, #7B1FA2)',
        earned: true,
      });
    } else if (reportCount >= 20) {
      userBadges.push({
        id: 'community-watch',
        name: t('profile.badges.communityWatch.name'),
        description: t('profile.badges.communityWatch.description'),
        icon: 'fas fa-eye',
        color: 'linear-gradient(135deg, #FF5722, #D84315)',
        earned: true,
      });
    } else if (reportCount >= 5) {
      userBadges.push({
        id: 'first-responder',
        name: t('profile.badges.firstResponder.name'),
        description: t('profile.badges.firstResponder.description'),
        icon: 'fas fa-plus-circle',
        color: 'linear-gradient(135deg, #009688, #00796B)',
        earned: true,
      });
    }

    return userBadges;
  };

  const loadRecentActivity = async (): Promise<RecentActivity[]> => {
    try {
      const reports = await reportsService.getReports({
        userId: user!.id,
        limit: 5,
      });

      return reports.map(report => ({
        id: report.id,
        vibe_type: report.vibe_type,
        location: report.location || '',
        notes: report.notes || '',
        created_at: report.created_at,
        upvotes: report.upvotes,
        downvotes: report.downvotes,
      }));
    } catch (error) {
      console.error('Error loading user recent activity:', error);
      return [];
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return t('profile.timeAgo.justNow');
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return t('profile.timeAgo.minutesAgo', { count: diffInMinutes });
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return t('profile.timeAgo.hoursAgo', { count: diffInHours });
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return t('profile.timeAgo.daysAgo', { count: diffInDays });
  };

  const getVibeIcon = (vibeType: string): string => {
    const icons: { [key: string]: string } = {
      crowded: 'fas fa-users',
      noisy: 'fas fa-volume-up',
      festive: 'fas fa-glass-cheers',
      calm: 'fas fa-peace',
      suspicious: 'fas fa-eye-slash',
      dangerous: 'fas fa-exclamation-triangle',
    };
    return icons[vibeType] || 'fas fa-question-circle';
  };

  const getVibeColor = (vibeType: string): string => {
    const colors: { [key: string]: string } = {
      crowded: '#FFA500',
      noisy: '#FF6B35',
      festive: '#28A745',
      calm: '#17A2B8',
      suspicious: '#FFC107',
      dangerous: '#DC3545',
    };
    return colors[vibeType] || '#6C757D';
  };

  const loadReportsData = async () => {
    if (!user) {
      return;
    }

    try {
      setReportsLoading(true);

      // Load user's reports and nearby reports in parallel
      const [myReportsData, nearbyReportsData] = await Promise.all([
        loadMyReports(),
        loadNearbyReports(),
      ]);

      setMyReports(myReportsData);
      setNearbyReports(nearbyReportsData);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadMyReports = async (): Promise<Report[]> => {
    try {
      if (!user?.id) {
        console.log('No user ID available for loading reports');
        return [];
      }

      console.log('Loading reports for user:', user.id);

      // First try to get reports with user_id
      let reports = await reportsService.getReports({ userId: user.id });
      console.log('Reports with user_id:', reports.length);

      // If no reports found with user_id, also check for reports without user_id
      // This handles existing reports created before user_id was added
      if (reports.length === 0) {
        console.log('No reports found with user_id, checking for reports without user_id');
        const allReports = await reportsService.getReports({ limit: 50 });
        // For now, show recent reports as a fallback - in production you'd want to associate them properly
        reports = allReports.slice(0, 10);
        console.log('Fallback reports loaded:', reports.length);
      }

      return reports.map(report => ({
        ...report,
        user_vote: null, // User's own reports don't need vote tracking
      }));
    } catch (error) {
      console.error('Error loading user reports:', error);
      return [];
    }
  };

  const loadNearbyReports = async (): Promise<Report[]> => {
    try {
      // For now, load recent reports from database
      // In a full implementation, this would filter by location
      const reports = await reportsService.getReports({ limit: 10 });

      // Add user vote information for each report
      const reportsWithVotes = await Promise.all(
        reports.map(async (report) => {
          try {
            const voteType = await reportsService.getUserVote(report.id, user!.id);
            return {
              ...report,
              user_vote: voteType,
            };
          } catch (error) {
            return {
              ...report,
              user_vote: null,
            };
          }
        }),
      );

      return reportsWithVotes;
    } catch (error) {
      console.error('Error loading nearby reports:', error);
      return [];
    }
  };

  const voteOnReport = async (reportId: number, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      return;
    }

    try {
      await reportsService.vote(reportId, user.id, voteType);

      // Update local state optimistically
      setNearbyReports(prevReports =>
        prevReports.map(report => {
          if (report.id === reportId) {
            const currentVote = report.user_vote;
            let newUpvotes = report.upvotes || 0;
            let newDownvotes = report.downvotes || 0;

            // Remove previous vote if exists
            if (currentVote === 'upvote') {
              newUpvotes--;
            } else if (currentVote === 'downvote') {
              newDownvotes--;
            }

            // Add new vote
            if (voteType === 'upvote') {
              newUpvotes++;
            } else {
              newDownvotes++;
            }

            return {
              ...report,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
              user_vote: voteType,
            };
          }
          return report;
        }),
      );

    } catch (error) {
      console.error('Error voting on report:', error);
    }
  };

  const capitalizeFirstLetter = (string: string): string => {
    if (!string) {
      return '';
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const createConfetti = () => {
    const premiumColors = [
      'linear-gradient(45deg, #FFD700, #FFA500)', // Gold
      'linear-gradient(45deg, #C0C0C0, #A8A8A8)', // Silver
      'linear-gradient(45deg, #CD7F32, #A0522D)', // Bronze
      'linear-gradient(45deg, #E91E63, #F06292)', // Rose Gold
      'linear-gradient(45deg, #9C27B0, #BA68C8)', // Amethyst
      'linear-gradient(45deg, #2196F3, #64B5F6)', // Sapphire
      'linear-gradient(45deg, #4CAF50, #81C784)', // Emerald
      'linear-gradient(45deg, #FF9800, #FFB74D)',  // Amber
    ];

    const shapes = ['circle', 'square', 'triangle', 'diamond', 'star'];

    for (let i = 0; i < 80; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'premium-confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-10px';

      // Random shape
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const size = Math.random() * 12 + 6;

      confetti.style.width = size + 'px';
      confetti.style.height = size + 'px';
      confetti.style.background = premiumColors[Math.floor(Math.random() * premiumColors.length)];
      confetti.style.position = 'fixed';
      confetti.style.zIndex = '9999';
      confetti.style.pointerEvents = 'none';

      // Shape-specific styling
      switch (shape) {
      case 'circle':
        confetti.style.borderRadius = '50%';
        break;
      case 'square':
        confetti.style.borderRadius = '2px';
        break;
      case 'triangle':
        confetti.style.width = '0';
        confetti.style.height = '0';
        confetti.style.borderLeft = size/2 + 'px solid transparent';
        confetti.style.borderRight = size/2 + 'px solid transparent';
        confetti.style.borderBottom = size + 'px solid';
        confetti.style.background = 'none';
        confetti.style.borderBottomColor = premiumColors[Math.floor(Math.random() * premiumColors.length)].split(',')[1].replace(')', '');
        break;
      case 'diamond':
        confetti.style.transform = 'rotate(45deg)';
        confetti.style.borderRadius = '2px';
        break;
      case 'star':
        confetti.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        break;
      }

      // Premium shadow and glow effects
      confetti.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.3), 0 0 30px rgba(255, 215, 0, 0.1)';
      confetti.style.filter = 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))';

      // Enhanced animation with multiple phases
      const duration = Math.random() * 4 + 3;
      const delay = Math.random() * 1.5;

      confetti.style.animation = `
        premiumConfettiFall ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s forwards,
        premiumConfettiSpin ${duration * 0.8}s linear ${delay}s infinite,
        premiumConfettiGlow 2s ease-in-out ${delay}s infinite alternate
      `;

      // Add sparkle effect
      if (Math.random() > 0.7) {
        confetti.style.animation += `, premiumConfettiSparkle 1.5s ease-in-out ${delay + 0.5}s infinite`;
      }

      document.body.appendChild(confetti);

      // Remove confetti after animation completes
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, (duration + delay) * 1000 + 1000);
    }

    // Add premium sound effect (visual feedback)
    setTimeout(() => {
      // Create a subtle vibration effect on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    }, 200);
  };

  // Get location address - simplified to share with Community Dashboard
  const getLocationAddress = (): string => {
    // For now, return a placeholder - this should be shared with Community Dashboard
    // TODO: Share location address with Community Dashboard via context or props
    return user?.location ? 'Current Location' : t('profile.notProvided');
  };

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
        <HStack justify="space-between" align="center">
          <Box>
            <Text fontSize="24px" fontWeight="700" letterSpacing="-0.5px" lineHeight="1.2">
              {t('profile.title')}
            </Text>
            <Text fontSize="14px" color="gray.700" mt={2} letterSpacing="0.5px" fontWeight="500">
              {t('profile.subtitle')}
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* Main Content */}
      <Box p={6} minH="calc(100vh - 180px)">
        <VStack gap={4} align="stretch">
          {/* Profile Header Card */}
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
            <HStack justify="space-between" align="center" mb={5}>
              <HStack gap={3}>
                <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <UserIcon size={18} />
                </Box>
                <Text fontWeight="600" fontSize="16px">{t('profile.profileInformation')}</Text>
              </HStack>
            </HStack>

            <HStack align="flex-start" gap={4}>
              {/* Profile Picture */}
              <Box
                w="80px"
                h="80px"
                borderRadius="50%"
                bg="gray.100"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
              >
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                    }}
                  />
                ) : (
                  <UserIcon size={32} color="#6b7280" />
                )}
              </Box>

              {/* Profile Info */}
              <Box flex={1}>
                <Text fontSize="18px" fontWeight="600" mb={1}>
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.username || 'User'
                  }
                </Text>
                <Text fontSize="14px" color="gray.600" mb={3}>
                  {user?.email || t('profile.noEmailProvided')}
                </Text>
                <Button
                  size="sm"
                  bg="black"
                  color="white"
                  borderRadius="12px"
                  px={4}
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit size={14} style={{ marginRight: '6px' }} />
                  {t('profile.editProfile')}
                </Button>
              </Box>
            </HStack>
          </Box>

          {/* Personal Information Section */}
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" mb={6}>
            <HStack justify="space-between" align="center" mb={5}>
              <HStack gap={3}>
                <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <Mail size={18} />
                </Box>
                <Text fontWeight="600" fontSize="16px">{t('profile.personalInformation')}</Text>
              </HStack>
            </HStack>

            <Grid templateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap={4}>
              <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="10px" bg="green.100" display="flex" alignItems="center" justifyContent="center">
                    <Mail size={16} color="#059669" />
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="gray.600" fontWeight="600" textTransform="uppercase" letterSpacing="0.5px" mb={1}>
                      {t('profile.email')}
                    </Text>
                    <Text fontSize="14px" fontWeight="600" color="gray.900">
                      {user?.email || t('profile.noEmailProvided')}
                    </Text>
                  </Box>
                </HStack>
              </Box>

              <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="10px" bg="orange.100" display="flex" alignItems="center" justifyContent="center">
                    <Phone size={16} color="#d97706" />
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="gray.600" fontWeight="600" textTransform="uppercase" letterSpacing="0.5px" mb={1}>
                      {t('profile.phone')}
                    </Text>
                    <Text fontSize="14px" fontWeight="600" color="gray.900">
                      {user?.phone || t('profile.notProvided')}
                    </Text>
                  </Box>
                </HStack>
              </Box>

              <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                <HStack gap={3}>
                  <Box w="40px" h="40px" borderRadius="10px" bg="red.100" display="flex" alignItems="center" justifyContent="center">
                    <MapPin size={16} color="#dc2626" />
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="gray.600" fontWeight="600" textTransform="uppercase" letterSpacing="0.5px" mb={1}>
                      {t('profile.location')}
                    </Text>
                    <Text fontSize="14px" fontWeight="600" color="gray.900">
                      {locationAddress}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            </Grid>
          </Box>

          {/* My Reports Section */}
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
            <HStack justify="space-between" align="center" mb={5} cursor="pointer" onClick={() => setShowMyReports(!showMyReports)}>
              <HStack gap={3}>
                <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <List size={18} />
                </Box>
                <Text fontWeight="600" fontSize="16px">{t('profile.myReports')} ({myReports.length})</Text>
              </HStack>
              <Button
                size="sm"
                variant="ghost"
                borderRadius="12px"
                p={2}
                minW="auto"
                h="auto"
              >
                {showMyReports ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
            </HStack>

            {myReports.length === 0 ? (
              <Box textAlign="center" py={12} bg="gray.50" borderRadius="12px" border="1px solid" borderColor="gray.200">
                <Box w="20" h="20" borderRadius="12px" bg="gray.200" display="flex" alignItems="center" justifyContent="center" mx="auto" mb={4}>
                  <PlusCircle size={24} color="#9ca3af" />
                </Box>
                <Text fontSize="16px" fontWeight="500" color="gray.700" mb={2}>
                  {t('profile.noReportsYet')}
                </Text>
                <Text fontSize="14px" color="gray.600">
                  {t('profile.reportsWillAppearHere')}
                </Text>
              </Box>
            ) : showMyReports && (
              <VStack gap={3} align="stretch">
                {myReports.map(report => (
                  <Box
                    key={report.id}
                    bg="gray.50"
                    borderRadius="12px"
                    p={4}
                    border="1px solid"
                    borderColor="gray.200"
                    transition="all 0.2s"
                    _hover={{ transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
                  >
                    <HStack gap={3} align="flex-start">
                      <Box
                        w="12"
                        h="12"
                        borderRadius="8px"
                        bg={`${getVibeColor(report.vibe_type)}20`}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <i className={getVibeIcon(report.vibe_type)} style={{ fontSize: '14px', color: getVibeColor(report.vibe_type) }}></i>
                      </Box>

                      <Box flex={1}>
                        <Text fontWeight="600" fontSize="14px" mb={1}>
                          {t(`vibes.${report.vibe_type}`)} {t('profile.report')}
                        </Text>
                        <Text fontSize="12px" color="gray.600" mb={2}>
                          📍 {report.location || t('profile.unknownLocation')}
                        </Text>
                        {report.notes && (
                          <Text fontSize="12px" color="gray.700" mb={3} lineHeight="1.4">
                            {report.notes}
                          </Text>
                        )}
                        <HStack gap={4}>
                          <Text fontSize="11px" color="gray.500">
                            🕒 {formatTimeAgo(report.created_at)}
                          </Text>
                          <HStack gap={1}>
                            <Text fontSize="11px" color="green.600" fontWeight="600">
                              👍 {report.upvotes || 0}
                            </Text>
                            <Text fontSize="11px" color="red.600" fontWeight="600">
                              👎 {report.downvotes || 0}
                            </Text>
                          </HStack>
                        </HStack>
                      </Box>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </Box>
  );
};

export default ProfileView;
