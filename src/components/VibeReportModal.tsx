import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, Input, Textarea, Grid, GridItem, IconButton } from '@chakra-ui/react';
import {
  ShieldCheck,
  CloudSnow,
  Music,
  PartyPopper,
  Users,
  EyeOff,
  AlertTriangle,
  Volume2,
  VolumeX,
  Camera,
  X,
  Lightbulb,
  Route,
  Wrench,
  Triangle,
  Car,
  Settings,
  MapPin,
  FileText,
} from 'lucide-react';

import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { reverseGeocode } from '../lib/geocoding';
import { VIBE_CONFIG } from '../constants/vibes';
import { SupabaseStorageService } from '../services/upload';

import CameraModal from './CameraModal';

interface VibeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentLocation?: [number, number] | null;
}

interface VibeOption {
  type: VibeType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const VibeReportModal: React.FC<VibeReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentLocation,
}) => {
  const { t } = useTranslation();
  const [selectedVibe, setSelectedVibe] = useState<VibeType | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    supports3D: true,
    isLowEndDevice: false,
    prefersReducedMotion: false,
  });

  const vibeOptions: VibeOption[] = [
    {
      type: VibeType.Safe,
      label: t('vibes.safe'),
      icon: 'shield-check',
      color: '#10b981',
      description: t('vibes.safeDesc'),
    },
    {
      type: VibeType.Calm,
      label: t('vibes.calm'),
      icon: 'cloud-snow',
      color: '#3b82f6',
      description: t('vibes.calmDesc'),
    },
    {
      type: VibeType.Lively,
      label: t('vibes.lively'),
      icon: 'music',
      color: '#eab308',
      description: t('vibes.livelyDesc'),
    },
    {
      type: VibeType.Festive,
      label: t('vibes.festive'),
      icon: 'party-popper',
      color: '#f59e0b',
      description: t('vibes.festiveDesc'),
    },
    {
      type: VibeType.Crowded,
      label: t('vibes.crowded'),
      icon: 'users',
      color: '#f97316',
      description: t('vibes.crowdedDesc'),
    },
    {
      type: VibeType.Suspicious,
      label: t('vibes.suspicious'),
      icon: 'eye-off',
      color: '#a855f7',
      description: t('vibes.suspiciousDesc'),
    },
    {
      type: VibeType.Dangerous,
      label: t('vibes.dangerous'),
      icon: 'alert-triangle',
      color: '#ef4444',
      description: t('vibes.dangerousDesc'),
    },
    {
      type: VibeType.Noisy,
      label: t('vibes.noisy'),
      icon: 'volume-2',
      color: '#06b6d4',
      description: t('vibes.noisyDesc'),
    },
    {
      type: VibeType.Quiet,
      label: t('vibes.quiet'),
      icon: 'volume-x',
      color: '#2dd4bf',
      description: t('vibes.quietDesc'),
    },
    // Infrastructure report types
    {
      type: VibeType.Streetlight,
      label: t('infrastructure.streetlight.label'),
      icon: 'lightbulb',
      color: '#f59e0b',
      description: t('infrastructure.streetlight.description'),
    },
    {
      type: VibeType.Sidewalk,
      label: t('infrastructure.sidewalk.label'),
      icon: 'route',
      color: '#f59e0b',
      description: t('infrastructure.sidewalk.description'),
    },
    {
      type: VibeType.Construction,
      label: t('infrastructure.construction.label'),
      icon: 'wrench',
      color: '#f59e0b',
      description: t('infrastructure.construction.description'),
    },
    {
      type: VibeType.Pothole,
      label: t('infrastructure.pothole.label'),
      icon: 'triangle',
      color: '#f59e0b',
      description: t('infrastructure.pothole.description'),
    },
    {
      type: VibeType.Traffic,
      label: t('infrastructure.traffic.label'),
      icon: 'car',
      color: '#f59e0b',
      description: t('infrastructure.traffic.description'),
    },
    {
      type: VibeType.Other,
      label: t('infrastructure.other.label'),
      icon: 'settings',
      color: '#f59e0b',
      description: t('infrastructure.other.description'),
    },
    // Canadian winter / climate categories
    {
      type: VibeType.SnowAccumulation,
      label: t('infrastructure.snowAccumulation.label'),
      icon: 'snowflake',
      color: '#bfdbfe',
      description: t('infrastructure.snowAccumulation.description'),
    },
    {
      type: VibeType.IcySidewalk,
      label: t('infrastructure.icySidewalk.label'),
      icon: 'ice',
      color: '#93c5fd',
      description: t('infrastructure.icySidewalk.description'),
    },
    {
      type: VibeType.UnplowedRoad,
      label: t('infrastructure.unplowedRoad.label'),
      icon: 'road',
      color: '#60a5fa',
      description: t('infrastructure.unplowedRoad.description'),
    },
    {
      type: VibeType.Flooding,
      label: t('infrastructure.flooding.label'),
      icon: 'droplets',
      color: '#1d4ed8',
      description: t('infrastructure.flooding.description'),
    },
  ];

  // Detect device capabilities for 3D effects
  useEffect(() => {
    const detectCapabilities = () => {
      // Check for 3D transform support
      const testEl = document.createElement('div');
      const supports3D = 'WebkitPerspective' in testEl.style ||
                        'MozPerspective' in testEl.style ||
                        'perspective' in testEl.style;

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Check for low-end device indicators
      const isLowEndDevice = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 2 : false;

      setDeviceCapabilities({
        supports3D,
        isLowEndDevice,
        prefersReducedMotion,
      });
    };

    detectCapabilities();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);

          try {
            // Try to get a readable address
            const address = await reverseGeocode(latitude, longitude);
            setLocation(address);
          } catch (error) {
            // Fallback to user-friendly message if geocoding fails
            console.warn('Geocoding failed, using address not available message');
            setLocation(t('reports.addressNotAvailable', 'Address not available'));
          }

          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: true },
      );
    } else {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedVibe(null);
      setNotes('');
      setLocation('');
      setUserLocation(null);
      setSelectedFile(null);
      setMediaPreview('');
      setIsSubmitting(false);
      setLocationLoading(false);

      // Use current location from props as initial fallback
      if (currentLocation) {
        setUserLocation(currentLocation);
        reverseGeocode(currentLocation[0], currentLocation[1])
          .then(address => setLocation(address))
          .catch(() => setLocation(t('reports.addressNotAvailable', 'Address not available')));
      } else {
        // Get user's current location if no location prop provided
        getCurrentLocation();
      }
    }
  }, [isOpen, currentLocation, t]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setSelectedFile(null);
    setMediaPreview('');
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getVibeIconComponent = (iconName: string) => {
    switch (iconName) {
    case 'shield-check':
      return <ShieldCheck size={24} />;
    case 'cloud-snow':
      return <CloudSnow size={24} />;
    case 'music':
      return <Music size={24} />;
    case 'party-popper':
      return <PartyPopper size={24} />;
    case 'users':
      return <Users size={24} />;
    case 'eye-off':
      return <EyeOff size={24} />;
    case 'alert-triangle':
      return <AlertTriangle size={24} />;
    case 'volume-2':
      return <Volume2 size={24} />;
    case 'volume-x':
      return <VolumeX size={24} />;
    case 'lightbulb':
      return <Lightbulb size={24} />;
    case 'route':
      return <Route size={24} />;
    case 'wrench':
      return <Wrench size={24} />;
    case 'triangle':
      return <Triangle size={24} />;
    case 'car':
      return <Car size={24} />;
    case 'settings':
      return <Settings size={24} />;
    default:
      return <ShieldCheck size={24} />;
    }
  };

  const handleSubmit = async () => {
    if (!selectedVibe) {
      return;
    }

    // If location is not available but loading, wait for it
    if (!userLocation && locationLoading) {
      // Wait for location to be available (with timeout)
      let attempts = 0;
      while (!userLocation && attempts < 50) { // 5 seconds max
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!userLocation) {
        return;
      } // Still no location after waiting
    }

    if (!userLocation) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if this is an infrastructure report
      const isInfrastructureReport = [
        VibeType.Streetlight,
        VibeType.Sidewalk,
        VibeType.Construction,
        VibeType.Pothole,
        VibeType.Traffic,
        VibeType.Other,
        VibeType.SnowAccumulation,
        VibeType.IcySidewalk,
        VibeType.UnplowedRoad,
        VibeType.Flooding,
      ].includes(selectedVibe);

      if (isInfrastructureReport) {
        // Submit infrastructure report as a regular vibe report
        await reportsService.createReport({
          vibe_type: selectedVibe,
          latitude: userLocation[0],
          longitude: userLocation[1],
          notes: notes.trim() || `Infrastructure issue: ${selectedVibe}`,
          location: location.trim() || undefined,
          emergency: false,
        });
      } else {
        // Submit regular vibe report
        let mediaUrl = '';
        if (selectedFile) {
          mediaUrl = await SupabaseStorageService.uploadReportMedia(selectedFile, Date.now().toString());
        }

        await reportsService.createReport({
          vibe_type: selectedVibe,
          latitude: userLocation[0],
          longitude: userLocation[1],
          notes: notes.trim() || undefined,
          location: location.trim() || undefined,
          media_url: mediaUrl || undefined,
          emergency: false,
        });
      }

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Error creating report:', error);
      setIsSubmitting(false);
    }
  };

  // Don't render anything if modal is not open
  if (!isOpen && !showSuccess) {
    return null;
  }

  if (showSuccess) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: window.innerWidth < 480 ? '16px' : '20px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: window.innerWidth < 480 ? '20px' : '24px',
          width: '100%',
          maxWidth: window.innerWidth < 480 ? '90vw' : '400px',
          padding: window.innerWidth < 480 ? '2rem 1.5rem' : '3rem 2rem',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), 0 15px 35px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Premium Background Gradient */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(34, 197, 94, 0.06) 50%, rgba(16, 185, 129, 0.04) 100%)',
            pointerEvents: 'none',
          }}></div>

          {/* Premium Inner Shadow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
            pointerEvents: 'none',
            borderRadius: '24px',
          }}></div>

          {/* Success Checkmark Animation */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: window.innerWidth < 480 ? '1.5rem' : '2rem',
          }}>
            <div style={{
              width: window.innerWidth < 480 ? '80px' : '100px',
              height: window.innerWidth < 480 ? '80px' : '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3), 0 10px 20px rgba(16, 185, 129, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
              animation: 'successPulse 2s ease-in-out infinite',
            }}>
              <svg
                width={window.innerWidth < 480 ? '32' : '40'}
                height={window.innerWidth < 480 ? '32' : '40'}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                }}
              >
                <polyline points="20,6 9,17 4,12" style={{
                  strokeDasharray: '24',
                  strokeDashoffset: '24',
                  animation: 'successCheck 0.8s ease-in-out 0.2s forwards',
                }}></polyline>
              </svg>
            </div>
          </div>

          {/* Success Text */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{
              margin: '0 0 0.75rem 0',
              color: '#065f46',
              fontSize: window.innerWidth < 480 ? '1.25rem' : '1.5rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em',
              lineHeight: '1.2',
            }}>
              {t('modals.vibeReport.successTitle')}
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: window.innerWidth < 480 ? '0.9rem' : '1rem',
              fontWeight: '500',
              margin: '0',
              lineHeight: '1.5',
              maxWidth: '280px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              {t('modals.vibeReport.successMessage')}
            </p>
          </div>

          {/* Premium CSS Animations */}
          <style>{`
            @keyframes successPulse {
              0%, 100% {
                transform: scale(1);
                box-shadow: 0 20px 40px rgba(16, 185, 129, 0.3), 0 10px 20px rgba(16, 185, 129, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2);
              }
              50% {
                transform: scale(1.05);
                box-shadow: 0 25px 50px rgba(16, 185, 129, 0.4), 0 15px 30px rgba(16, 185, 129, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.3);
              }
            }

            @keyframes successCheck {
              0% {
                stroke-dashoffset: 24;
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% {
                stroke-dashoffset: 0;
                opacity: 1;
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0, 0, 0, 0.5)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
      p={4}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Box
        bg="white"
        borderRadius="20px"
        maxW="600px"
        w="full"
        maxH="90vh"
        overflow="hidden"
        boxShadow="0 20px 25px rgba(0, 0, 0, 0.1)"
      >
        {/* Header */}
        <Box
          bg="white"
          p={6}
          borderBottom="1px solid"
          borderColor="gray.200"
          position="sticky"
          top={0}
          zIndex={10}
        >
          <HStack justify="space-between" align="center">
            <HStack gap={3}>
              <Box w="10" h="10" borderRadius="8px" bg="blue.100" display="flex" alignItems="center" justifyContent="center">
                <FileText size={16} color="#2563eb" />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="18px" fontWeight="700" color="gray.900">
                  {t('modals.vibeReport.title')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  {t('modals.vibeReport.subtitle')}
                </Text>
              </VStack>
            </HStack>
            <Button
              aria-label="Close modal"
              variant="ghost"
              size="sm"
              onClick={onClose}
              borderRadius="full"
              p={2}
              minW="auto"
              h="auto"
            >
              <X size={16} />
            </Button>
          </HStack>
        </Box>

        {/* Content */}
        <Box p={6} overflowY="auto" maxH="calc(70vh - 140px)">
          <VStack gap={6} align="stretch">
            {/* Vibe Type Selection */}
            <Box>
              <Text fontSize="16px" fontWeight="600" color="gray.900" mb={4}>
                {t('modals.vibeReport.selectVibeType')}
              </Text>
              <Grid templateColumns="repeat(auto-fit, minmax(140px, 1fr))" gap={3}>
                {vibeOptions.map((vibe) => (
                  <Box
                    key={vibe.type}
                    onClick={() => setSelectedVibe(vibe.type)}
                    p={4}
                    borderRadius="12px"
                    border="2px solid"
                    borderColor={selectedVibe === vibe.type ? `${vibe.color}80` : 'gray.200'}
                    bg={selectedVibe === vibe.type ? `${vibe.color}10` : 'white'}
                    cursor="pointer"
                    transition="all 0.2s"
                    textAlign="center"
                    _hover={{
                      transform: 'translateY(-1px)',
                      boxShadow: `0 4px 12px ${vibe.color}30`,
                      borderColor: `${vibe.color}60`,
                    }}
                  >
                    <Box
                      w="12"
                      h="12"
                      borderRadius="full"
                      bg={`linear-gradient(135deg, ${vibe.color}20 0%, ${vibe.color}40 100%)`}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mx="auto"
                      mb={3}
                      boxShadow={`0 4px 8px ${vibe.color}30`}
                    >
                      {getVibeIconComponent(vibe.icon)}
                    </Box>
                    <Text fontSize="14px" fontWeight="600" color="gray.900" mb={1}>
                      {vibe.label}
                    </Text>
                    <Text fontSize="12px" color="gray.600" lineHeight="1.3">
                      {vibe.description}
                    </Text>
                  </Box>
                ))}
              </Grid>
            </Box>

            {/* Media Upload */}
            <Box>
              <Text fontSize="14px" fontWeight="600" color="gray.700" mb={3}>
                {t('modals.vibeReport.addPhotoOptional')}
              </Text>
              {!selectedFile ? (
                <Box
                  border="2px dashed"
                  borderColor="gray.300"
                  borderRadius="12px"
                  p={8}
                  textAlign="center"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
                  onClick={() => setShowCamera(true)}
                >
                  <Camera size={48} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                  <Text fontSize="16px" fontWeight="500" color="gray.700" mb={1}>
                    {t('modals.vibeReport.takePhoto')}
                  </Text>
                  <Text fontSize="14px" color="gray.600">
                    {t('modals.vibeReport.captureEvidence')}
                  </Text>
                </Box>
              ) : (
                <Box position="relative" borderRadius="12px" overflow="hidden" maxW="300px" mx="auto">
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                    }}
                  />
                  <Button
                    aria-label="Remove photo"
                    size="xs"
                    position="absolute"
                    top={2}
                    right={2}
                    borderRadius="full"
                    bg="red.500"
                    color="white"
                    _hover={{ bg: 'red.600' }}
                    onClick={removeMedia}
                    p={1}
                    minW="auto"
                    h="auto"
                  >
                    <X size={12} />
                  </Button>
                </Box>
              )}
            </Box>

            {/* Location */}
            <Box>
              <Text fontSize="14px" fontWeight="600" color="gray.700" mb={2}>
                {t('modals.vibeReport.location')}
              </Text>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('modals.vibeReport.locationPlaceholder')}
                borderRadius="12px"
                border="1px solid"
                borderColor="gray.200"
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
              />
            </Box>

            {/* Notes */}
            <Box>
              <Text fontSize="14px" fontWeight="600" color="gray.700" mb={2}>
                {t('modals.vibeReport.additionalDetails')}
              </Text>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('modals.vibeReport.detailsPlaceholder')}
                rows={3}
                borderRadius="12px"
                border="1px solid"
                borderColor="gray.200"
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                resize="vertical"
                maxLength={500}
              />
              <Text fontSize="12px" color="gray.500" mt={1}>
                {t('modals.vibeReport.characterCount', '{{count}}/500 characters', { count: notes.length })}
              </Text>
            </Box>
          </VStack>
        </Box>

        {/* Actions */}
        <Box
          p={6}
          borderTop="1px solid"
          borderColor="gray.200"
          bg="gray.50"
        >
          <HStack gap={3}>
            <Button
              flex={1}
              variant="outline"
              onClick={onClose}
              borderRadius="12px"
              border="1px solid"
              borderColor="gray.200"
              disabled={isSubmitting}
            >
              {t('modals.vibeReport.cancel')}
            </Button>
            <Button
              flex={2}
              bg="blue.500"
              color="white"
              onClick={handleSubmit}
              borderRadius="12px"
              _hover={{ bg: 'blue.600' }}
              disabled={!selectedVibe || (!userLocation && !locationLoading) || isSubmitting}
            >
              {isSubmitting ? t('modals.vibeReport.submitting') : t('modals.vibeReport.submitReport')}
            </Button>
          </HStack>
        </Box>
      </Box>

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </Box>
  );
};

export default VibeReportModal;
