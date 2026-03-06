import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, Input, Textarea, Grid, GridItem } from '@chakra-ui/react';
import {
  AlertTriangle,
  Flame,
  Ambulance,
  Shield,
  Car,
  Triangle,
  HelpCircle,
  Send,
  Camera,
  X,
  MapPin,
  FileText,
} from 'lucide-react';

import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { reverseGeocode, formatCoordinates } from '../lib/geocoding';
import { SupabaseStorageService } from '../services/upload';

import CameraModal from './CameraModal';

interface EmergencyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EmergencyType {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  color: string;
  description: string;
}

const EmergencyReportModal: React.FC<EmergencyReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [selectedEmergency, setSelectedEmergency] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);

  const emergencyTypes: EmergencyType[] = [
    {
      id: 'fire',
      label: t('emergency.fire'),
      icon: Flame,
      color: 'var(--danger)',
      description: t('emergency.fireDesc'),
    },
    {
      id: 'medical',
      label: t('emergency.medical'),
      icon: Ambulance,
      color: '#dc2626',
      description: t('emergency.medicalDesc'),
    },
    {
      id: 'crime',
      label: t('emergency.crime'),
      icon: Shield,
      color: '#7c2d12',
      description: t('emergency.crimeDesc'),
    },
    {
      id: 'accident',
      label: t('emergency.accident'),
      icon: Car,
      color: '#ea580c',
      description: t('emergency.accidentDesc'),
    },
    {
      id: 'hazard',
      label: t('emergency.hazard'),
      icon: Triangle,
      color: '#d97706',
      description: t('emergency.hazardDesc'),
    },
    {
      id: 'other',
      label: t('emergency.other'),
      icon: HelpCircle,
      color: 'var(--text-muted)',
      description: t('emergency.otherDesc'),
    },
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedEmergency(null);
      setUrgency('medium');
      setDescription('');
      setLocation('');
      setUserLocation(null);
      setSelectedFile(null);
      setMediaPreview('');
      setIsSubmitting(false);
      setLocationLoading(false);

      // Get user's current location
      getCurrentLocation();
    }
  }, [isOpen]);

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
            setLocation(t('reports.addressNotAvailable'));
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

  const handleSubmit = async () => {
    if (!selectedEmergency || !description.trim()) {
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
      let mediaUrl = '';
      if (selectedFile) {
        mediaUrl = await SupabaseStorageService.uploadReportMedia(selectedFile, Date.now().toString());
      }

      const selectedType = emergencyTypes.find(type => type.id === selectedEmergency);
      const emergencyNotes = [
        `EMERGENCY: ${selectedType?.label}`,
        `Urgency: ${urgency.toUpperCase()}`,
        description.trim(),
      ].filter(Boolean).join(' | ');

      await reportsService.createReport({
        vibe_type: VibeType.Dangerous, // Use dangerous as the vibe type for emergencies
        latitude: userLocation[0],
        longitude: userLocation[1],
        notes: emergencyNotes,
        location: location.trim() || undefined,
        media_url: mediaUrl || undefined,
        emergency: true,
      });

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Error creating emergency report:', error);
      // TODO: Show error notification
      setIsSubmitting(false);
    }
  };

  // Don't render anything if modal is not open and not showing success
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
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.06) 50%, rgba(185, 28, 28, 0.04) 100%)',
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

          {/* Emergency Success Icon Animation */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: window.innerWidth < 480 ? '1.5rem' : '2rem',
          }}>
            <div style={{
              width: window.innerWidth < 480 ? '80px' : '100px',
              height: window.innerWidth < 480 ? '80px' : '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 20px 40px rgba(239, 68, 68, 0.3), 0 10px 20px rgba(239, 68, 68, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
              animation: 'emergencySuccessPulse 2s ease-in-out infinite',
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
                  animation: 'emergencySuccessCheck 0.8s ease-in-out 0.2s forwards',
                }}></polyline>
              </svg>
            </div>
          </div>

          {/* Success Text */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{
              margin: '0 0 0.75rem 0',
              color: '#7f1d1d',
              fontSize: window.innerWidth < 480 ? '1.25rem' : '1.5rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em',
              lineHeight: '1.2',
            }}>
              {t('modals.emergencyReport.successTitle', 'Emergency Report Submitted Successfully!')}
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
              {t('modals.emergencyReport.successMessage', 'Emergency services have been notified. Help is on the way.')}
            </p>
          </div>

          {/* Premium CSS Animations */}
          <style>{`
            @keyframes emergencySuccessPulse {
              0%, 100% {
                transform: scale(1);
                box-shadow: 0 20px 40px rgba(239, 68, 68, 0.3), 0 10px 20px rgba(239, 68, 68, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2);
              }
              50% {
                transform: scale(1.05);
                box-shadow: 0 25px 50px rgba(239, 68, 68, 0.4), 0 15px 30px rgba(239, 68, 68, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.3);
              }
            }

            @keyframes emergencySuccessCheck {
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
              <Box w="10" h="10" borderRadius="8px" bg="red.100" display="flex" alignItems="center" justifyContent="center">
                <AlertTriangle size={16} color="#dc2626" />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="18px" fontWeight="700" color="gray.900">
                  {t('modals.emergencyReport.title')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  {t('modals.emergencyReport.subtitle')}
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
            {/* Emergency Warning Banner */}
            <Box p={4} bg="red.50" borderRadius="12px" border="1px solid" borderColor="red.200">
              <HStack gap={3} align="center" justify="center">
                <AlertTriangle size={24} color="#dc2626" />
                <VStack gap={1} align="center">
                  <Text fontSize="16px" fontWeight="700" color="red.900">
                    {t('modals.emergencyReport.emergencyAlert')}
                  </Text>
                  <Text fontSize="14px" color="red.800" textAlign="center">
                    {t('modals.emergencyReport.emergencyAlertDesc')}
                  </Text>
                </VStack>
              </HStack>
            </Box>

            {/* Emergency Type Selection */}
            <Box>
              <Text fontSize="16px" fontWeight="600" color="gray.900" mb={4}>
                {t('modals.emergencyReport.selectEmergencyType')}
              </Text>
              <Grid templateColumns="repeat(auto-fit, minmax(140px, 1fr))" gap={3}>
                {emergencyTypes.map((emergency) => {
                  const IconComponent = emergency.icon;
                  return (
                    <Box
                      key={emergency.id}
                      onClick={() => setSelectedEmergency(emergency.id)}
                      p={4}
                      borderRadius="12px"
                      border="2px solid"
                      borderColor={selectedEmergency === emergency.id ? 'red.400' : 'gray.200'}
                      bg={selectedEmergency === emergency.id ? 'red.50' : 'white'}
                      cursor="pointer"
                      transition="all 0.2s"
                      textAlign="center"
                      _hover={{
                        transform: 'translateY(-1px)',
                        boxShadow: `0 4px 12px ${emergency.color}30`,
                        borderColor: `${emergency.color}60`,
                      }}
                    >
                      <Box
                        w="12"
                        h="12"
                        borderRadius="full"
                        bg={`linear-gradient(135deg, ${emergency.color}20 0%, ${emergency.color}40 100%)`}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        mx="auto"
                        mb={3}
                        boxShadow={`0 4px 8px ${emergency.color}30`}
                      >
                        <IconComponent size={24} />
                      </Box>
                      <Text fontSize="14px" fontWeight="600" color="gray.900">
                        {emergency.label}
                      </Text>
                    </Box>
                  );
                })}
              </Grid>
            </Box>

            {/* Urgency Level */}
            <Box>
              <Text fontSize="16px" fontWeight="600" color="gray.900" mb={4}>
                {t('modals.emergencyReport.urgencyLevel')}
              </Text>
              <HStack gap={3} justify="center">
                {[
                  { value: 'low' as const, label: t('modals.emergencyReport.urgencyLow'), color: '#10b981' },
                  { value: 'medium' as const, label: t('modals.emergencyReport.urgencyMedium'), color: '#f59e0b' },
                  { value: 'high' as const, label: t('modals.emergencyReport.urgencyHigh'), color: '#ef4444' },
                ].map((level) => (
                  <Box
                    key={level.value}
                    onClick={() => setUrgency(level.value)}
                    px={6}
                    py={3}
                    borderRadius="12px"
                    border="2px solid"
                    borderColor={urgency === level.value ? `${level.color}80` : 'gray.200'}
                    bg={urgency === level.value ? `${level.color}10` : 'white'}
                    cursor="pointer"
                    transition="all 0.2s"
                    textAlign="center"
                    _hover={{
                      transform: 'translateY(-1px)',
                      boxShadow: `0 4px 12px ${level.color}30`,
                      borderColor: `${level.color}60`,
                    }}
                  >
                    <Text fontSize="14px" fontWeight="600" color="gray.900">
                      {level.label}
                    </Text>
                  </Box>
                ))}
              </HStack>
            </Box>

            {/* Location */}
            <Box>
              <Text fontSize="14px" fontWeight="600" color="gray.700" mb={2}>
                {t('modals.emergencyReport.location')}
              </Text>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('modals.emergencyReport.locationPlaceholder')}
                borderRadius="12px"
                border="1px solid"
                borderColor="gray.200"
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
              />
            </Box>

            {/* Description */}
            <Box>
              <Text fontSize="14px" fontWeight="600" color="gray.700" mb={2}>
                {t('modals.emergencyReport.descriptionLabel')}
              </Text>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('modals.emergencyReport.descriptionPlaceholder')}
                rows={4}
                borderRadius="12px"
                border="1px solid"
                borderColor="gray.200"
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                resize="vertical"
                maxLength={500}
              />
              <Text fontSize="12px" color="gray.500" mt={1}>
                {t('modals.emergencyReport.characterCount', '{{count}}/500 characters', { count: description.length })}
              </Text>
            </Box>

            {/* Media Upload */}
            <Box>
              <Text fontSize="14px" fontWeight="600" color="gray.700" mb={3}>
                {t('modals.emergencyReport.addPhotoOptional')}
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
                    {t('modals.emergencyReport.takePhoto')}
                  </Text>
                  <Text fontSize="14px" color="gray.600">
                    {t('modals.emergencyReport.captureEvidence')}
                  </Text>
                </Box>
              ) : (
                <Box position="relative" borderRadius="12px" overflow="hidden" maxW="300px" mx="auto">
                  <img
                    src={mediaPreview}
                    alt="Emergency preview"
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
              {t('modals.emergencyReport.cancel')}
            </Button>
            <Button
              flex={2}
              bg="red.500"
              color="white"
              onClick={handleSubmit}
              borderRadius="12px"
              _hover={{ bg: 'red.600' }}
              disabled={!selectedEmergency || !description.trim() || (!userLocation && !locationLoading) || isSubmitting}
            >
              <HStack gap={2}>
                <Send size={16} />
                <Text>{isSubmitting ? t('modals.emergencyReport.submitting') : t('modals.emergencyReport.submitReport')}</Text>
              </HStack>
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

export default EmergencyReportModal;
