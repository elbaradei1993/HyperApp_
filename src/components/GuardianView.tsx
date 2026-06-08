import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Box, Button, Text, VStack, HStack, Grid, GridItem, Badge, Input, Textarea } from '@chakra-ui/react';
import {
  Shield,
  Plus,
  Users,
  MapPin,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Settings,
  Heart,
  Phone,
  Mail,
  MessageSquare,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { guardianService, GuardianRelationship, GuardianInvitation, GuardianSOSAlert } from '../services/guardian';

import { LoadingSpinner } from './shared';
import EmergencyReportModal from './EmergencyReportModal';


// Custom Guardian Emergency Modal that uses the same UI as EmergencyReportModal
// but sends alerts to guardians instead of creating community reports
const GuardianEmergencyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSendAlert: (alertType: string, message: string, shareLocation: boolean) => Promise<void>;
}> = ({ isOpen, onClose, onSendAlert }) => {
  const { t } = useTranslation();
  const [selectedEmergency, setSelectedEmergency] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const emergencyTypes = [
    {
      id: 'medical',
      label: t('guardian.emergencyTypes.medical'),
      icon: AlertTriangle,
      color: '#dc2626',
      description: t('guardian.emergencyTypes.medicalDesc'),
    },
    {
      id: 'safety',
      label: t('guardian.emergencyTypes.personalSafety'),
      icon: Heart,
      color: '#ea580c',
      description: t('guardian.emergencyTypes.personalSafetyDesc'),
    },
    {
      id: 'location',
      label: t('guardian.emergencyTypes.locationCheckIn'),
      icon: MapPin,
      color: '#059669',
      description: t('guardian.emergencyTypes.locationCheckInDesc'),
    },
    {
      id: 'custom',
      label: t('guardian.emergencyTypes.custom'),
      icon: MessageSquare,
      color: '#7c3aed',
      description: t('guardian.emergencyTypes.customDesc'),
    },
  ];

  useEffect(() => {
    if (isOpen) {
      setSelectedEmergency(null);
      setUrgency('medium');
      setDescription('');
      setLocation('');
      setUserLocation(null);
      setIsSubmitting(false);
      setLocationLoading(false);
      setShowSuccess(false);

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
          setLocation(`Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocation('Location not available');
          setLocationLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: true },
      );
    } else {
      setLocation('Location not available');
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmergency || !description.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendAlert(selectedEmergency, description.trim(), !!userLocation);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Error sending guardian alert:', error);
      setIsSubmitting(false);
    }
  };

  // Use the same UI structure as EmergencyReportModal but simplified
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
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.06) 50%, rgba(185, 28, 28, 0.04) 100%)',
            pointerEvents: 'none',
          }}></div>

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
              {t('guardian.alertSent')}
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
              {t('guardian.alertSentDesc')}
            </p>
          </div>

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          aria-label="Close modal"
        >
          ×
        </button>

        <div style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
            }}>
              <AlertTriangle size={28} color="white" />
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
            }}>
              {t('guardian.modal.sendEmergencyAlert')}
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
              margin: 0,
              lineHeight: '1.5',
            }}>
              {t('guardian.modal.chooseEmergencyType')}
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
            }}>
              {t('guardian.modal.whatType')}
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
            }}>
              {emergencyTypes.map((emergency) => {
                const IconComponent = emergency.icon;
                return (
                  <button
                    key={emergency.id}
                    onClick={() => setSelectedEmergency(emergency.id)}
                    style={{
                      padding: '16px',
                      border: `2px solid ${selectedEmergency === emergency.id ? emergency.color : '#e5e7eb'}`,
                      borderRadius: '12px',
                      background: selectedEmergency === emergency.id ? `${emergency.color}08` : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      minHeight: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <IconComponent size={24} color={selectedEmergency === emergency.id ? emergency.color : '#6b7280'} />
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: selectedEmergency === emergency.id ? emergency.color : 'var(--text-primary)',
                    }}>
                      {emergency.label}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      lineHeight: '1.3',
                    }}>
                      {emergency.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}>
              {t('guardian.modal.messageRequired')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('guardian.modal.describeSituation')}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                outline: 'none',
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              maxLength={500}
            />
            <div style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              textAlign: 'right',
              marginTop: '4px',
            }}>
              {description.length}/500
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '12px',
          }}>
            <input
              type="checkbox"
              id="shareLocation"
              checked={!!userLocation}
              disabled
              style={{
                width: '18px',
                height: '18px',
                accentColor: '#3b82f6',
              }}
            />
            <label htmlFor="shareLocation" style={{
              fontSize: '14px',
              color: 'var(--text-primary)',
              flex: 1,
            }}>
              <MapPin size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              {locationLoading ? t('guardian.modal.gettingLocation') : (userLocation ? t('guardian.modal.shareLocation') : t('guardian.modal.locationNotAvailable'))}
            </label>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                background: 'white',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                minHeight: '44px',
              }}
            >
              {t('common.cancel')}
            </button>

            <button
              onClick={handleSubmit}
              disabled={!selectedEmergency || !description.trim() || isSubmitting}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: isSubmitting || !selectedEmergency || !description.trim() ? '#9ca3af' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting || !selectedEmergency || !description.trim() ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('guardian.modal.sending')}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {t('guardian.modal.sendAlert')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GuardianStats {
  totalGuardians: number;
  activeSOSAlerts: number;
  pendingInvitations: number;
}

const GuardianView: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [guardians, setGuardians] = useState<GuardianRelationship[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<GuardianInvitation[]>([]);
  const [sosAlerts, setSosAlerts] = useState<GuardianSOSAlert[]>([]);
  const [stats, setStats] = useState<GuardianStats>({
    totalGuardians: 0,
    activeSOSAlerts: 0,
    pendingInvitations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sosMessage, setSosMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [sendingSOS, setSendingSOS] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (user?.id) {
      loadGuardianData();
    }
  }, [user?.id]);

  const loadGuardianData = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoading(true);
      const [guardiansData, invitationsData, alertsData, statsData] = await Promise.all([
        guardianService.getUserGuardians(user.id),
        guardianService.getPendingInvitations(user.id),
        guardianService.getSOSAlerts(user.id),
        guardianService.getGuardianStats(user.id),
      ]);

      setGuardians(guardiansData);
      setPendingInvitations(invitationsData);
      setSosAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading guardian data:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load guardian data. Please try again.',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteGuardian = async () => {
    if (!user?.id || !inviteEmail.trim()) {
      return;
    }

    try {
      setInviting(true);
      const result = await guardianService.addGuardian(user.id, inviteEmail.trim(), 'guardian', {
        locationSharing: false,
        sosAlerts: true,
      });

      if (result.invitation) {
        setPendingInvitations(prev => [...prev, result.invitation!]);
        setStats(prev => ({ ...prev, pendingInvitations: prev.pendingInvitations + 1 }));
        addNotification({
          type: 'success',
          title: 'Invitation Sent!',
          message: `Guardian invitation sent to ${inviteEmail}`,
          duration: 5000,
        });
      } else if (result.relationship) {
        setGuardians(prev => [...prev, result.relationship!]);
        setStats(prev => ({ ...prev, totalGuardians: prev.totalGuardians + 1 }));
        addNotification({
          type: 'success',
          title: 'Guardian Added!',
          message: `${inviteEmail} has been added as your guardian`,
          duration: 5000,
        });
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
    } catch (error) {
      console.error('Error inviting guardian:', error);
      addNotification({
        type: 'error',
        title: 'Invitation Failed',
        message: 'Failed to send guardian invitation. Please try again.',
        duration: 5000,
      });
    } finally {
      setInviting(false);
    }
  };

  const handleSendSOS = async (alertType: 'sos' | 'emergency' | 'check_in') => {
    if (!user?.id) {
      return;
    }

    try {
      setSendingSOS(true);
      const alerts = await guardianService.sendSOSAlert(user.id, alertType, undefined, sosMessage.trim() || undefined);

      if (alerts.length > 0) {
        setSosAlerts(prev => [...alerts, ...prev]);
        setStats(prev => ({ ...prev, activeSOSAlerts: prev.activeSOSAlerts + alerts.length }));
        addNotification({
          type: 'success',
          title: 'SOS Alert Sent!',
          message: `Emergency alert sent to ${alerts.length} guardian${alerts.length > 1 ? 's' : ''}`,
          duration: 5000,
        });
      }

      setShowSOSModal(false);
      setSosMessage('');
    } catch (error) {
      console.error('Error sending SOS:', error);
      addNotification({
        type: 'error',
        title: 'SOS Failed',
        message: 'Failed to send emergency alert. Please try again.',
        duration: 5000,
      });
    } finally {
      setSendingSOS(false);
    }
  };

  const handleSendGuardianAlert = async (alertType: string, message: string, shareLocation: boolean) => {
    if (!user?.id) {
      return;
    }

    try {
      setSendingSOS(true);

      // Get current location if sharing is enabled
      let location = undefined;
      if (shareLocation && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true,
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        } catch (locationError) {
          console.warn('Could not get location:', locationError);
          // Continue without location
        }
      }

      const result = await guardianService.sendGuardianAlert(user.id, alertType, message, shareLocation, location);

      addNotification({
        type: 'success',
        title: 'Alert Sent Successfully!',
        message: `Emergency alert sent to ${result.totalGuardians} guardian${result.totalGuardians > 1 ? 's' : ''} (${result.pushSent} push, ${result.emailSent} email)`,
        duration: 5000,
      });

      setShowSOSModal(false);
    } catch (error) {
      console.error('Error sending guardian alert:', error);
      addNotification({
        type: 'error',
        title: 'Alert Failed',
        message: 'Failed to send emergency alert. Please try again.',
        duration: 5000,
      });
      throw error; // Re-throw to let the modal handle the error
    } finally {
      setSendingSOS(false);
    }
  };

  const handleRemoveGuardian = async (guardianId: string) => {
    if (!user?.id) {
      return;
    }

    try {
      await guardianService.removeGuardian(user.id, guardianId);
      setGuardians(prev => prev.filter(g => g.guardian_id !== guardianId));
      setStats(prev => ({ ...prev, totalGuardians: prev.totalGuardians - 1 }));
      addNotification({
        type: 'success',
        title: 'Guardian Removed',
        message: 'Guardian has been removed from your network',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error removing guardian:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove guardian. Please try again.',
        duration: 5000,
      });
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await guardianService.cancelGuardianInvitation(invitationId);
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      setStats(prev => ({ ...prev, pendingInvitations: prev.pendingInvitations - 1 }));
      addNotification({
        type: 'success',
        title: 'Invitation Cancelled',
        message: 'Guardian invitation has been cancelled',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to cancel invitation. Please try again.',
        duration: 5000,
      });
    }
  };

  const handleResolveSOS = async (alertId: number) => {
    if (!user?.id) {
      return;
    }

    try {
      await guardianService.resolveSOSAlert(alertId, user.id);
      setSosAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, status: 'resolved' as const } : alert,
      ));
      setStats(prev => ({ ...prev, activeSOSAlerts: Math.max(0, prev.activeSOSAlerts - 1) }));
      addNotification({
        type: 'success',
        title: 'Alert Resolved',
        message: 'SOS alert has been marked as resolved',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error resolving SOS alert:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to resolve alert. Please try again.',
        duration: 5000,
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" gap={4}>
        <LoadingSpinner />
        <Text color="gray.600" fontSize="14px">{t('guardian.loadingGuardianNetwork')}</Text>
      </Box>
    );
  }

  return (
    <Box maxW="500px" mx="auto" bg="var(--bg-base)" minH="100vh" position="relative" borderX="1px solid" borderColor="var(--wire)" style={{ color: 'var(--t1)' }}>
      {/* Header */}
      <Box bg="var(--bg-surface)" color="var(--t1)" p={6} position="sticky" top={0} zIndex={100} borderBottom="1px solid" borderColor="var(--wire)">
        <HStack justify="space-between" align="center">
          <Box>
            <Text fontSize="22px" fontWeight="600" letterSpacing="-0.3px">
              {t('guardian.title')}
            </Text>
            <Text fontSize="13px" color="gray.600" mt={1} letterSpacing="0.3px">
              {t('guardian.subtitle')}
            </Text>
          </Box>
          <HStack gap={3}>
            <Button
              variant="ghost"
              size="sm"
              borderRadius="12px"
              border="1px solid"
              borderColor="gray.200"
              onClick={() => setShowInviteModal(true)}
            >
              <Plus size={16} />
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* Main Content */}
      <Box p={6} minH="calc(100vh - 180px)">
        {/* Stats Cards */}
        <Grid templateColumns="repeat(2, 1fr)" gap={3} mb={6}>
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
            <HStack gap={3} mb={3}>
              <Box w="40px" h="40px" borderRadius="12px" bg="blue.100" display="flex" alignItems="center" justifyContent="center">
                <Users size={18} color="#3b82f6" />
              </Box>
              <Box>
                <Text fontWeight="600" fontSize="16px">{t('guardian.stats.guardians')}</Text>
                <Text fontSize="24px" fontWeight="700">{stats.totalGuardians}</Text>
              </Box>
            </HStack>
          </Box>

          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
            <HStack gap={3} mb={3}>
              <Box w="40px" h="40px" borderRadius="12px" bg="red.100" display="flex" alignItems="center" justifyContent="center">
                <AlertTriangle size={18} color="#ef4444" />
              </Box>
              <Box>
                <Text fontWeight="600" fontSize="16px">{t('guardian.stats.activeAlerts')}</Text>
                <Text fontSize="24px" fontWeight="700">{stats.activeSOSAlerts}</Text>
              </Box>
            </HStack>
          </Box>
        </Grid>

        {/* Guardians List */}
        <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" mb={6}>
          <HStack gap={3} mb={5}>
            <Box w="40px" h="40px" borderRadius="12px" bg="green.100" display="flex" alignItems="center" justifyContent="center">
              <Heart size={18} color="#10b981" />
            </Box>
            <Text fontWeight="600" fontSize="16px">{t('guardian.yourGuardians')}</Text>
          </HStack>

          {guardians.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Shield size={48} color="#e5e7eb" />
              <Text fontSize="16px" color="gray.600" mt={4}>
                {t('guardian.noGuardiansYet')}
              </Text>
              <Text fontSize="14px" color="gray.500" mt={2}>
                {t('guardian.addTrustedPeople')}
              </Text>
            </Box>
          ) : (
            <VStack gap={3} align="stretch">
              {guardians.map((guardian) => (
                <HStack key={guardian.id} justify="space-between" align="center" p={4} bg="gray.50" borderRadius="12px" border="1px solid" borderColor="gray.200">
                  <Box flex={1}>
                    <Text fontWeight="600" mb={1}>
                      {guardian.guardian_profile?.first_name && guardian.guardian_profile?.last_name
                        ? `${guardian.guardian_profile.first_name} ${guardian.guardian_profile.last_name}`
                        : guardian.guardian_profile?.email || 'Unknown Guardian'
                      }
                    </Text>
                    <Text fontSize="14px" color="gray.600" mb={2}>
                      {guardian.guardian_profile?.email}
                    </Text>
                    <HStack gap={2}>
                      {guardian.location_sharing_enabled && (
                        <Badge bg="blue.50" color="blue.700" px={2} py={1} borderRadius="6px" fontSize="11px">
                          <HStack gap={1}>
                            <MapPin size={10} />
                            <Text>{t('guardian.location')}</Text>
                          </HStack>
                        </Badge>
                      )}
                      {guardian.sos_alerts_enabled && (
                        <Badge bg="yellow.50" color="yellow.700" px={2} py={1} borderRadius="6px" fontSize="11px">
                          <HStack gap={1}>
                            <Bell size={10} />
                            <Text>{t('guardian.alerts')}</Text>
                          </HStack>
                        </Badge>
                      )}
                    </HStack>
                  </Box>
                  <Button
                    variant="ghost"
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleRemoveGuardian(guardian.guardian_id)}
                  >
                    <XCircle size={16} />
                  </Button>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" mb={6}>
            <HStack gap={3} mb={5}>
              <Box w="40px" h="40px" borderRadius="12px" bg="orange.100" display="flex" alignItems="center" justifyContent="center">
                <Clock size={18} color="#f59e0b" />
              </Box>
              <Text fontWeight="600" fontSize="16px">{t('guardian.pendingInvitations')}</Text>
            </HStack>

            <VStack gap={3} align="stretch">
              {pendingInvitations.map((invitation) => (
                <HStack key={invitation.id} justify="space-between" align="center" p={4} bg="orange.50" borderRadius="12px" border="1px solid" borderColor="orange.200">
                  <Box>
                    <Text fontWeight="600" mb={1}>{invitation.invitee_email}</Text>
                    <Text fontSize="14px" color="gray.600">
                      {t('guardian.expires')} {new Date(invitation.expires_at).toLocaleDateString()}
                    </Text>
                  </Box>
                  <Button
                    variant="ghost"
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    <XCircle size={16} />
                  </Button>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box p={5} textAlign="center" color="gray.500" fontSize="11px" borderTop="1px solid" borderColor="gray.200" bg="white">
        <HStack gap={1} justify="center">
          <Shield size={12} />
          <Text>{t('guardian.allDataEncrypted')}</Text>
        </HStack>
      </Box>

      {/* Invite Modal */}
      {showInviteModal && (
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
          onClick={() => setShowInviteModal(false)}
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
            p={6}
          >
            <VStack gap={6} align="stretch">
              <Box textAlign="center">
                <Text fontSize="18px" fontWeight="600">{t('guardian.inviteGuardianAngel')}</Text>
                <Text fontSize="14px" color="gray.600" mt={2}>
                  {t('guardian.addTrustedPerson')}
                </Text>
              </Box>

              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="14px" fontWeight="500" mb={2}>{t('guardian.emailAddress')}</Text>
                  <Input
                    type="email"
                    placeholder={t('guardian.guardianExample')}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    borderRadius="12px"
                    border="2px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </Box>

                <Box>
                  <Text fontSize="14px" fontWeight="500" mb={2}>{t('guardian.nameOptional')}</Text>
                  <Input
                    type="text"
                    placeholder={t('guardian.theirName')}
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    borderRadius="12px"
                    border="2px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </Box>
              </VStack>

              <HStack gap={3}>
                <Button
                  variant="outline"
                  flex={1}
                  onClick={() => setShowInviteModal(false)}
                  borderRadius="12px"
                >
                  {t('guardian.cancel')}
                </Button>
                <Button
                  bg="green.500"
                  color="white"
                  flex={1}
                  onClick={handleInviteGuardian}
                  disabled={inviting || !inviteEmail.trim()}
                  borderRadius="12px"
                  _hover={{ bg: 'green.600' }}
                >
                  {inviting ? t('guardian.sending') : t('guardian.sendInvite')}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}

      {/* Guardian Emergency Modal */}
      <GuardianEmergencyModal
        isOpen={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        onSendAlert={handleSendGuardianAlert}
      />
    </Box>
  );
};

export default GuardianView;
