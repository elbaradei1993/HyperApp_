import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, Input, Textarea } from '@chakra-ui/react';
import {
  AlertTriangle,
  Heart,
  MapPin,
  MessageSquare,
  Send,
  X,
  CheckCircle,
} from 'lucide-react';

import { LoadingSpinner } from './shared';

interface GuardianEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendAlert: (alertType: string, message: string, shareLocation: boolean) => Promise<void>;
}

interface EmergencyType {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  color: string;
  description: string;
}

const GuardianEmergencyModal: React.FC<GuardianEmergencyModalProps> = ({
  isOpen,
  onClose,
  onSendAlert,
}) => {
  const { t } = useTranslation();
  const [selectedEmergency, setSelectedEmergency] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [shareLocation, setShareLocation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const emergencyTypes: EmergencyType[] = [
    {
      id: 'medical',
      label: t('guardian.emergency.medical', 'Medical Emergency'),
      icon: AlertTriangle,
      color: '#dc2626',
      description: t('guardian.emergency.medicalDesc', 'Need immediate medical attention'),
    },
    {
      id: 'safety',
      label: t('guardian.emergency.safety', 'Personal Safety'),
      icon: Heart,
      color: '#ea580c',
      description: t('guardian.emergency.safetyDesc', 'Feel unsafe or threatened'),
    },
    {
      id: 'location',
      label: t('guardian.emergency.location', 'Location Check-in'),
      icon: MapPin,
      color: '#059669',
      description: t('guardian.emergency.locationDesc', 'Let guardians know your location'),
    },
    {
      id: 'custom',
      label: t('guardian.emergency.custom', 'Custom Alert'),
      icon: MessageSquare,
      color: '#7c3aed',
      description: t('guardian.emergency.customDesc', 'Send a custom message'),
    },
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedEmergency(null);
      setMessage('');
      setShareLocation(true);
      setIsSubmitting(false);
      setShowSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedEmergency) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendAlert(selectedEmergency, message.trim(), shareLocation);

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Error sending guardian alert:', error);
      setIsSubmitting(false);
      // Error handling will be done by parent component
    }
  };

  // Don't render anything if modal is not open and not showing success
  if (!isOpen && !showSuccess) {
    return null;
  }

  if (showSuccess) {
    return (
      <div className="app-modal-overlay" style={{
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
        <div className="app-modal-dialog app-modal-scroll" style={{
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

          {/* Success Icon Animation */}
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
              animation: 'guardianSuccessPulse 2s ease-in-out infinite',
            }}>
              <CheckCircle size={window.innerWidth < 480 ? '32' : '40'} color="white" />
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
              {t('guardian.alertSent', 'Alert Sent Successfully!')}
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
              {t('guardian.alertSentDesc', 'Your guardians have been notified and help is on the way.')}
            </p>
          </div>

          {/* Premium CSS Animations */}
          <style>{`
            @keyframes guardianSuccessPulse {
              0%, 100% {
                transform: scale(1);
                box-shadow: 0 20px 40px rgba(239, 68, 68, 0.3), 0 10px 20px rgba(239, 68, 68, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2);
              }
              50% {
                transform: scale(1.05);
                box-shadow: 0 25px 50px rgba(239, 68, 68, 0.4), 0 15px 30px rgba(239, 68, 68, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.3);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <Box
      className="app-modal-overlay"
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
    >
      <Box
        className="app-modal-dialog"
        bg="white"
        borderRadius="20px"
        maxW="500px"
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
                  {t('guardian.emergency.title', 'Send Emergency Alert')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  {t('guardian.emergency.description', 'Choose the type of emergency and notify your guardians instantly.')}
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
        <Box className="app-modal-scroll" p={6} overflowY="auto" flex={1} minH={0}>
          <VStack gap={6} align="stretch">
            {/* Emergency Type Selection */}
            <Box>
              <Text fontSize="16px" fontWeight="600" color="gray.900" mb={4}>
                {t('guardian.emergency.selectType', 'What type of emergency?')}
              </Text>
              <VStack gap={3} align="stretch">
                {emergencyTypes.map((emergency) => {
                  const IconComponent = emergency.icon;
                  return (
                    <Button
                      key={emergency.id}
                      onClick={() => setSelectedEmergency(emergency.id)}
                      variant={selectedEmergency === emergency.id ? 'solid' : 'outline'}
                      bg={selectedEmergency === emergency.id ? `${emergency.color}10` : 'white'}
                      borderColor={selectedEmergency === emergency.id ? emergency.color : 'gray.200'}
                      color={selectedEmergency === emergency.id ? emergency.color : 'gray.700'}
                      borderRadius="12px"
                      p={4}
                      h="auto"
                      justifyContent="flex-start"
                      _hover={{
                        bg: selectedEmergency === emergency.id ? `${emergency.color}15` : 'gray.50',
                        borderColor: selectedEmergency === emergency.id ? emergency.color : 'gray.300',
                      }}
                    >
                      <VStack gap={2} align="start" w="full">
                        <HStack gap={3} w="full">
                          <IconComponent size={20} color={selectedEmergency === emergency.id ? emergency.color : '#6b7280'} />
                          <VStack align="start" gap={0} flex={1}>
                            <Text fontSize="14px" fontWeight="600" color={selectedEmergency === emergency.id ? emergency.color : 'gray.900'}>
                              {emergency.label}
                            </Text>
                            <Text fontSize="12px" color="gray.600" textAlign="left">
                              {emergency.description}
                            </Text>
                          </VStack>
                        </HStack>
                      </VStack>
                    </Button>
                  );
                })}
              </VStack>
            </Box>

            {/* Message Input */}
            <Box>
              <Text fontSize="14px" fontWeight="600" color="gray.900" mb={2}>
                {t('guardian.emergency.message', 'Additional Message (Optional)')}
              </Text>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('guardian.emergency.messagePlaceholder', 'Provide more details about your situation...')}
                borderRadius="12px"
                border="1px solid"
                borderColor="gray.200"
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                minH="80px"
                resize="vertical"
                maxLength={500}
              />
              <Text fontSize="12px" color="gray.500" textAlign="right" mt={1}>
                {message.length}/500
              </Text>
            </Box>

            {/* Location Sharing Toggle */}
            <Box
              p={4}
              bg="gray.50"
              borderRadius="12px"
              border="1px solid"
              borderColor="gray.200"
            >
              <HStack gap={3} align="flex-start">
                <input
                  type="checkbox"
                  id="shareLocation"
                  checked={shareLocation}
                  onChange={(e) => setShareLocation(e.target.checked)}
                  style={{ marginTop: '2px', width: '16px', height: '16px' }}
                />
                <VStack gap={1} align="start">
                  <HStack gap={2}>
                    <MapPin size={16} color="#6b7280" />
                    <Text fontSize="14px" fontWeight="600" color="gray.900">
                      {t('guardian.emergency.shareLocation', 'Share my current location with guardians')}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
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
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              flex={1}
              bg={selectedEmergency ? 'red.500' : 'gray.400'}
              color="white"
              onClick={handleSubmit}
              borderRadius="12px"
              _hover={{ bg: selectedEmergency ? 'red.600' : 'gray.500' }}
              disabled={!selectedEmergency || isSubmitting}
            >
              {isSubmitting ? (
                <HStack gap={2}>
                  <LoadingSpinner size="sm" />
                  <Text>{t('guardian.emergency.sending', 'Sending...')}</Text>
                </HStack>
              ) : (
                <HStack gap={2}>
                  <Send size={16} />
                  <Text>{t('guardian.emergency.sendAlert', 'Send Alert')}</Text>
                </HStack>
              )}
            </Button>
          </HStack>
        </Box>
      </Box>
    </Box>
  );
};

export default GuardianEmergencyModal;
