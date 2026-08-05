import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button } from '@chakra-ui/react';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, Settings, UserCog, Sliders, Shield, LogOut, Key, Trash, Bell, MapPin, FileText, ShieldCheck, X } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { authService } from '../services/auth';
import { pushNotificationService } from '../services/pushNotificationService';
import { notificationService } from '../services/notificationService';
import { storageManager } from '../lib/storage';

import ToggleSwitch from './shared/ToggleSwitch';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';


interface SettingsViewProps {
  embedded?: boolean;
}

const SettingsView: React.FC<SettingsViewProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsOfServiceModal, setShowTermsOfServiceModal] = useState(false);
  const [showLocationSharingAgreement, setShowLocationSharingAgreement] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<'granted' | 'denied' | 'default' | 'unknown'>('unknown');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [preferenceStatus, setPreferenceStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Check permission statuses on mount
  useEffect(() => {
    const checkPermissions = async () => {
      // Check notification permission
      if ('Notification' in window) {
        setNotificationPermissionStatus(Notification.permission);
      }

      // Check location permission
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          setLocationPermissionStatus(result.state);
        } catch (error) {
          console.warn('Could not check location permission:', error);
        }
      }
    };

    checkPermissions();
  }, []);

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword) {
      alert('Enter your current password.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert(t('settings.passwordsNotMatch'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert(t('settings.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      if (!user?.email) {
        throw new Error('No signed-in email address was found.');
      }

      await authService.signIn(user.email, passwordForm.currentPassword);
      const { error } = await authService.updatePassword(passwordForm.newPassword);
      if (error) {
        alert('Error updating password: ' + error.message);
      } else {
        alert('Password updated successfully!');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      alert('Error updating password');
    } finally {
      setLoading(false);
    }
  };

  const persistSettings = async (updates: Parameters<typeof updateSettings>[0]) => {
    setPreferenceStatus('saving');
    try {
      await updateSettings(updates);
      setPreferenceStatus('saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      setPreferenceStatus('error');
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await authService.deleteAccount(user.id);
      if (error) {
        alert('Error deleting account: ' + error.message);
      } else {
        alert('Account deleted successfully. You will be logged out.');
        await signOut();
      }
    } catch (error) {
      alert('Error deleting account');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    setIsRequestingPermission(true);

    try {
      if (enabled) {
        if (user?.id) {
          await storageManager.remove(`notificationPermissionRequested_${user.id}`);
        }

        let permissionGranted = notificationPermissionStatus === 'granted';

        if (!permissionGranted && Capacitor.isNativePlatform() && user?.id) {
          await pushNotificationService.initialize(user.id);
          permissionGranted = true;
        } else if (!permissionGranted && 'Notification' in window) {
          const permission = await Notification.requestPermission();
          setNotificationPermissionStatus(permission);
          permissionGranted = permission === 'granted';
        }

        if (permissionGranted) {
          await pushNotificationService.updatePreferences({
            emergency_alerts: true,
            safety_reports: true,
          });
        }
        await persistSettings({ notifications: permissionGranted });
      } else {
        await pushNotificationService.updatePreferences({
          emergency_alerts: false,
          safety_reports: false,
        });
        await persistSettings({ notifications: false });
      }
    } catch (error) {
      console.error('Notification preference could not be saved:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleLocationToggle = async (enabled: boolean) => {
    if (enabled) {
      // Show agreement dialog when enabling location sharing
      setShowLocationSharingAgreement(true);
    } else {
      // Disable location sharing immediately
      try {
        await persistSettings({ locationSharing: false });
      } catch {
        // The context restores the previous value when the server write fails.
      }
    }
  };

  const confirmLocationSharing = async () => {
    setShowLocationSharingAgreement(false);
    let permissionGranted = locationPermissionStatus === 'granted';

    // Request location permission if not already granted
    if (locationPermissionStatus !== 'granted') {
      if (navigator.geolocation) {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              () => {
                setLocationPermissionStatus('granted');
                permissionGranted = true;
                resolve(void 0);
              },
              (error) => {
                setLocationPermissionStatus('denied');
                reject(error);
              },
              { timeout: 10000 },
            );
          });
        } catch (error) {
          setLocationPermissionStatus('denied');
          permissionGranted = false;
        }
      }
    }

    if (!permissionGranted) {
      setPreferenceStatus('error');
      return;
    }

    try {
      await persistSettings({ locationSharing: true });
    } catch {
      return;
    }

    if (user?.id) {
      notificationService.setCurrentUserId(user.id);
    }
  };

  return (
    <Box
      className={embedded ? 'settings-embedded' : 'page-view page-view--settings'}
      maxW={embedded ? 'none' : '920px'}
      w="full"
      mx="auto"
      bg={embedded ? 'transparent' : '#f4f5f2'}
      minH={embedded ? 'auto' : '100%'}
      position="relative"
      borderX={embedded ? '0' : '1px solid'}
      borderColor="var(--wire)"
      style={{ color: 'var(--t1)' }}
    >
      {/* Header */}
      {!embedded && <Box
        className="page-view__header"
        bg="var(--bg-surface)"
        color="var(--t1)"
        px={{ base: 4, md: 6 }}
        py={{ base: 4, md: 5 }}
        position="sticky"
        top={0}
        zIndex={20}
        borderBottom="1px solid"
        borderColor="gray.200"
        boxShadow="0 1px 0 rgba(15, 23, 42, 0.02)"
      >
        <HStack gap={3.5} align="center">
          <Box
            w={{ base: '40px', md: '44px' }}
            h={{ base: '40px', md: '44px' }}
            flexShrink={0}
            borderRadius="13px"
            bg="#111318"
            color="white"
            display="grid"
            placeItems="center"
            boxShadow="0 9px 22px rgba(17, 19, 24, 0.16)"
          >
            <Settings size={18} />
          </Box>
          <Box minW={0}>
            <Text fontSize={{ base: '20px', md: '23px' }} fontWeight="750" letterSpacing="-0.5px" lineHeight="1.15">
              {t('settings.title')}
            </Text>
            <Text fontSize="12px" color="gray.500" mt={1} letterSpacing="0.1px" fontWeight="500">
              {t('settings.subtitle')}
            </Text>
          </Box>
        </HStack>
      </Box>}

      {/* Main Content */}
      <Box
        px={embedded ? { base: 0, md: 0 } : { base: 3, md: 6 }}
        pt={embedded ? 0 : { base: 4, md: 5 }}
        pb={embedded ? 0 : { base: 'calc(var(--app-mobile-nav-height) + 20px)', lg: 5 }}
        minH="calc(100vh - 180px)"
      >
        <VStack className="settings-sections" gap={4} align="stretch">
          {/* Account Management Section */}
          <Box
            className="settings-section"
            bg="white"
            borderRadius="16px"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)"
            overflow="hidden"
          >
            <HStack justify="space-between" align="center" px={5} py={4}>
              <HStack gap={3}>
                <Box w="36px" h="36px" borderRadius="11px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <UserCog size={16} />
                </Box>
                <Box>
                  <Text fontWeight="650" fontSize="15px">{t('settings.accountManagementTitle')}</Text>
                  <Text fontSize="11px" color="gray.500" mt={0.5}>{t('settings.accountDescription', 'Security and account access')}</Text>
                </Box>
              </HStack>
            </HStack>

            <VStack gap={0} align="stretch" borderTop="1px solid" borderColor="gray.100">
              {/* Change Password */}
              <HStack gap={4} w="full" minH="82px" px={{ base: 4, md: 5 }} py={4} justify="space-between" align="center">
                <HStack gap={3} minW={0} flex={1} align="center">
                  <Box
                    w="36px"
                    h="36px"
                    flexShrink={0}
                    borderRadius="10px"
                    bg="blue.50"
                    border="1px solid"
                    borderColor="blue.100"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Key size={15} color="#2563eb" />
                  </Box>
                  <Box minW={0}>
                    <Text fontSize="14px" fontWeight="650" color="gray.900">
                      {t('settings.passwordTitle', 'Password')}
                    </Text>
                    <Text mt={0.5} fontSize="12px" lineHeight="1.45" color="gray.500">
                      {t('settings.passwordDescription', 'Update your password and keep your account secure.')}
                    </Text>
                  </Box>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  h="34px"
                  minW={{ base: '112px', md: '132px' }}
                  flexShrink={0}
                  borderRadius="9px"
                  borderColor="gray.300"
                  bg="white"
                  color="gray.800"
                  px={3}
                  fontSize="12px"
                  fontWeight="600"
                  onClick={() => setShowPasswordModal(true)}
                  _hover={{ bg: 'gray.50', borderColor: 'gray.400' }}
                  _active={{ bg: 'gray.100' }}
                  transition="all 0.2s"
                >
                  {t('settings.changePasswordButton', 'Change password')}
                </Button>
              </HStack>

              {/* Delete Account */}
              <HStack
                gap={4}
                w="full"
                minH="82px"
                px={{ base: 4, md: 5 }}
                py={4}
                justify="space-between"
                align="center"
                borderTop="1px solid"
                borderColor="red.100"
                bg="rgba(254, 242, 242, 0.48)"
              >
                <HStack gap={3} minW={0} flex={1} align="center">
                  <Box
                    w="36px"
                    h="36px"
                    flexShrink={0}
                    borderRadius="10px"
                    bg="red.50"
                    border="1px solid"
                    borderColor="red.100"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Trash size={15} color="#dc2626" />
                  </Box>
                  <Box minW={0}>
                    <Text fontSize="14px" fontWeight="650" color="gray.900">
                      {t('settings.deleteAccountTitle', 'Delete account')}
                    </Text>
                    <Text mt={0.5} fontSize="12px" lineHeight="1.45" color="gray.500">
                      {t('settings.deleteAccountDescription', 'Permanently remove your account and all saved data.')}
                    </Text>
                  </Box>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  h="34px"
                  minW={{ base: '112px', md: '132px' }}
                  flexShrink={0}
                  borderRadius="9px"
                  borderColor="red.300"
                  bg="white"
                  color="red.600"
                  px={3}
                  fontSize="12px"
                  fontWeight="600"
                  onClick={() => setShowDeleteModal(true)}
                  _hover={{ bg: 'red.50', borderColor: 'red.400' }}
                  _active={{ bg: 'red.100' }}
                  transition="all 0.2s"
                >
                  {t('settings.deleteAccountButton', 'Delete account')}
                </Button>
              </HStack>
            </VStack>
          </Box>

          {/* App Preferences Section */}
          <Box className="settings-section" bg="white" borderRadius="16px" border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" overflow="hidden">
            <HStack justify="space-between" align="center" px={5} py={4}>
              <HStack gap={3}>
                <Box w="36px" h="36px" borderRadius="11px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <Sliders size={16} />
                </Box>
                <Box>
                  <Text fontWeight="650" fontSize="15px">{t('settings.appPreferencesTitle')}</Text>
                  <Text fontSize="11px" color="gray.500" mt={0.5}>{t('settings.preferencesDescription', 'Notification and location preferences')}</Text>
                </Box>
              </HStack>
              <Text
                aria-live="polite"
                minW="54px"
                px={2.5}
                py={1}
                borderRadius="full"
                textAlign="center"
                fontSize="10px"
                fontWeight="650"
                color={preferenceStatus === 'error' ? 'red.700' : preferenceStatus === 'saved' ? 'green.700' : 'gray.500'}
                bg={preferenceStatus === 'error' ? 'red.50' : preferenceStatus === 'saved' ? 'green.50' : 'gray.50'}
                visibility={preferenceStatus === 'idle' ? 'hidden' : 'visible'}
              >
                {preferenceStatus === 'saving' && 'Saving…'}
                {preferenceStatus === 'saved' && 'Saved'}
                {preferenceStatus === 'error' && 'Retry'}
              </Text>
            </HStack>

            <VStack gap={0} align="stretch" borderTop="1px solid" borderColor="gray.100">
              {/* Notifications */}
              <HStack justify="space-between" align="center" gap={4} minH="76px" px={{ base: 4, md: 5 }} py={3.5}>
                <HStack gap={3} minW={0} flex={1}>
                  <Box w="36px" h="36px" flexShrink={0} borderRadius="10px" bg="orange.50" border="1px solid" borderColor="orange.100" display="flex" alignItems="center" justifyContent="center">
                    <Bell size={15} color="#d97706" />
                  </Box>
                  <Box minW={0}>
                    <Text fontSize="14px" fontWeight="650" color="gray.900">{t('settings.notificationsTitle')}</Text>
                    <Text fontSize="12px" color={notificationPermissionStatus === 'denied' ? 'red.600' : 'gray.500'} lineHeight="1.4">
                      {notificationPermissionStatus === 'denied'
                        ? t('settings.notificationsPermissionDenied')
                        : t('settings.notificationsDescription', 'Choose whether HyperApp can send you updates.')}
                    </Text>
                  </Box>
                </HStack>
                <ToggleSwitch
                  checked={settings.notifications && notificationPermissionStatus === 'granted'}
                  onChange={handleNotificationToggle}
                  disabled={isRequestingPermission || settingsLoading}
                  size="md"
                />
              </HStack>
            </VStack>
          </Box>

          {/* Privacy & Security Section */}
          <Box className="settings-section" bg="white" borderRadius="16px" border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" overflow="hidden">
            <HStack justify="space-between" align="center" px={5} py={4}>
              <HStack gap={3}>
                <Box w="36px" h="36px" borderRadius="11px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <Shield size={16} />
                </Box>
                <Box>
                  <Text fontWeight="650" fontSize="15px">{t('settings.privacySecurityTitle')}</Text>
                  <Text fontSize="11px" color="gray.500" mt={0.5}>{t('settings.privacyDescription', 'Privacy, legal, and application information')}</Text>
                </Box>
              </HStack>
            </HStack>

            <VStack gap={0} align="stretch" borderTop="1px solid" borderColor="gray.100">
              {/* Location Sharing */}
              <HStack justify="space-between" align="center" gap={4} minH="76px" px={{ base: 4, md: 5 }} py={3.5}>
                <HStack gap={3} minW={0} flex={1}>
                  <Box w="36px" h="36px" flexShrink={0} borderRadius="10px" bg="green.50" border="1px solid" borderColor="green.100" display="flex" alignItems="center" justifyContent="center">
                    <MapPin size={15} color="#059669" />
                  </Box>
                  <Box minW={0}>
                    <Text fontSize="14px" fontWeight="650" color="gray.900">{t('settings.locationSharingTitle')}</Text>
                    <Text fontSize="12px" color="gray.500" lineHeight="1.4">{t('settings.locationSharingDescription', 'Share your location and see community members on the map.')}</Text>
                  </Box>
                </HStack>
                <ToggleSwitch
                  checked={settings.locationSharing}
                  onChange={handleLocationToggle}
                  disabled={settingsLoading || preferenceStatus === 'saving'}
                  size="md"
                />
              </HStack>

              {/* App Version */}
              <HStack justify="space-between" align="center" gap={4} minH="72px" px={{ base: 4, md: 5 }} py={3.5} borderTop="1px solid" borderColor="gray.100">
                <HStack gap={3} minW={0} flex={1}>
                  <Box w="36px" h="36px" flexShrink={0} borderRadius="10px" bg="gray.100" border="1px solid" borderColor="gray.200" display="flex" alignItems="center" justifyContent="center">
                    <Settings size={15} color="#475569" />
                  </Box>
                  <Box minW={0}>
                    <Text fontSize="14px" fontWeight="650" color="gray.900">{t('settings.appInformation', 'Application')}</Text>
                    <Text fontSize="12px" color="gray.500" lineHeight="1.4">{t('settings.appDescription')}</Text>
                  </Box>
                </HStack>
                <Text px={2.5} py={1} flexShrink={0} borderRadius="full" bg="gray.100" color="gray.600" fontSize="10px" fontWeight="700">
                  {t('settings.version')}
                </Text>
              </HStack>

              {/* Legal links */}
              <HStack justify="space-between" align="center" gap={4} minH="68px" px={{ base: 4, md: 5 }} py={3} borderTop="1px solid" borderColor="gray.100">
                <HStack gap={3} minW={0}>
                  <Box w="36px" h="36px" flexShrink={0} borderRadius="10px" bg="green.50" border="1px solid" borderColor="green.100" display="flex" alignItems="center" justifyContent="center">
                    <ShieldCheck size={15} color="#059669" />
                  </Box>
                  <Text fontSize="13px" fontWeight="600" color="gray.800">{t('settings.privacyPolicy')}</Text>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  h="32px"
                  borderRadius="8px"
                  color="gray.600"
                  fontSize="12px"
                  fontWeight="650"
                  onClick={() => setShowPrivacyPolicyModal(true)}
                  _hover={{ bg: 'gray.100', color: 'gray.900' }}
                >
                  {t('settings.viewAction', 'View')}
                </Button>
              </HStack>

              <HStack justify="space-between" align="center" gap={4} minH="68px" px={{ base: 4, md: 5 }} py={3} borderTop="1px solid" borderColor="gray.100">
                <HStack gap={3} minW={0}>
                  <Box w="36px" h="36px" flexShrink={0} borderRadius="10px" bg="orange.50" border="1px solid" borderColor="orange.100" display="flex" alignItems="center" justifyContent="center">
                    <FileText size={15} color="#d97706" />
                  </Box>
                  <Text fontSize="13px" fontWeight="600" color="gray.800">{t('settings.termsOfService')}</Text>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  h="32px"
                  borderRadius="8px"
                  color="gray.600"
                  fontSize="12px"
                  fontWeight="650"
                  onClick={() => setShowTermsOfServiceModal(true)}
                  _hover={{ bg: 'gray.100', color: 'gray.900' }}
                >
                  {t('settings.viewAction', 'View')}
                </Button>
              </HStack>
            </VStack>
          </Box>

          {/* Logout Section */}
          <Box className="settings-section settings-section--session" bg="white" borderRadius="16px" px={{ base: 4, md: 5 }} py={4} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
            <HStack justify="space-between" align="center" gap={4}>
              <Box minW={0}>
                <Text fontSize="13px" fontWeight="650" color="gray.800">{t('settings.sessionTitle', 'Current session')}</Text>
                <Text mt={0.5} fontSize="11px" color="gray.500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {user?.email || t('settings.signedIn', 'Signed in')}
                </Text>
              </Box>
            <Button
              size="sm"
              variant="outline"
              h="34px"
              flexShrink={0}
              borderRadius="9px"
              borderColor="gray.300"
              bg="white"
              color="gray.700"
              px={3}
              fontSize="12px"
              fontWeight="650"
              onClick={handleLogout}
              _hover={{ bg: 'gray.50', borderColor: 'gray.400', color: 'gray.900' }}
              _active={{ bg: 'gray.100' }}
            >
              <HStack gap={2} justify="center">
                <LogOut size={14} />
                <Text>{t('settings.logoutButton')}</Text>
              </HStack>
            </Button>
            </HStack>
          </Box>
        </VStack>
      </Box>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <Box
          className="app-modal-overlay"
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(15, 23, 42, 0.62)"
          backdropFilter="blur(7px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="var(--app-z-modal)"
          p={4}
        >
          <Box
            className="app-modal-dialog app-modal-scroll"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            bg="white"
            borderRadius="20px"
            p={{ base: 5, md: 6 }}
            maxW="420px"
            w="full"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="0 28px 80px rgba(15, 23, 42, 0.28)"
          >
            <VStack gap={5} align="stretch">
              <HStack justify="space-between" align="center">
                <HStack gap={3}>
                  <Box w="36px" h="36px" borderRadius="10px" bg="blue.50" border="1px solid" borderColor="blue.100" display="flex" alignItems="center" justifyContent="center">
                    <Key size={15} color="#2563eb" />
                  </Box>
                  <Text id="change-password-title" fontSize="17px" fontWeight="700" letterSpacing="-0.2px">{t('settings.modals.changePassword.title')}</Text>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t('settings.modals.changePassword.cancel')}
                  borderRadius="9px"
                  p={0}
                  minW="32px"
                  w="32px"
                  h="32px"
                  color="gray.500"
                  _hover={{ bg: 'gray.100', color: 'gray.900' }}
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  <X size={15} />
                </Button>
              </HStack>

              <VStack gap={3.5} align="stretch">
                <Box>
                  <Text fontSize="12px" color="gray.700" fontWeight="650" mb={1.5}>{t('settings.modals.changePassword.currentPassword')}</Text>
                  <input
                    className="settings-password-input"
                    type="password"
                    autoComplete="current-password"
                    aria-label={t('settings.modals.changePassword.currentPassword')}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder={t('settings.modals.changePassword.currentPlaceholder')}
                  />
                </Box>

                <Box>
                  <Text fontSize="12px" color="gray.700" fontWeight="650" mb={1.5}>{t('settings.modals.changePassword.newPassword')}</Text>
                  <input
                    className="settings-password-input"
                    type="password"
                    autoComplete="new-password"
                    aria-label={t('settings.modals.changePassword.newPassword')}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder={t('settings.modals.changePassword.newPlaceholder')}
                  />
                </Box>

                <Box>
                  <Text fontSize="12px" color="gray.700" fontWeight="650" mb={1.5}>{t('settings.modals.changePassword.confirmNewPassword')}</Text>
                  <input
                    className="settings-password-input"
                    type="password"
                    autoComplete="new-password"
                    aria-label={t('settings.modals.changePassword.confirmNewPassword')}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder={t('settings.modals.changePassword.confirmPlaceholder')}
                  />
                </Box>
              </VStack>

              <HStack gap={3}>
                <Button
                  flex={1}
                  variant="outline"
                  h="36px"
                  borderRadius="9px"
                  fontSize="12px"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  {t('settings.modals.changePassword.cancel')}
                </Button>
                <Button
                  flex={1}
                  h="36px"
                  bg="#111318"
                  color="white"
                  borderRadius="9px"
                  fontSize="12px"
                  onClick={handlePasswordChange}
                  disabled={loading}
                  _hover={{ bg: '#252830' }}
                >
                  {loading ? t('settings.modals.changePassword.changing') : t('settings.modals.changePassword.submit')}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <Box
          className="app-modal-overlay"
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(15, 23, 42, 0.62)"
          backdropFilter="blur(7px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="var(--app-z-modal)"
          p={4}
        >
          <Box
            className="app-modal-dialog app-modal-scroll"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            bg="white"
            borderRadius="20px"
            p={{ base: 5, md: 6 }}
            maxW="400px"
            w="full"
            border="1px solid"
            borderColor="red.100"
            boxShadow="0 28px 80px rgba(15, 23, 42, 0.28)"
          >
            <VStack gap={5} align="stretch">
              <HStack gap={3} align="flex-start">
                <Box w="36px" h="36px" flexShrink={0} borderRadius="10px" bg="red.50" border="1px solid" borderColor="red.100" display="flex" alignItems="center" justifyContent="center">
                  <AlertTriangle size={16} color="#dc2626" />
                </Box>
                <Box>
                  <Text id="delete-account-title" fontSize="17px" fontWeight="700" color="gray.900" letterSpacing="-0.2px">
                    {t('settings.deleteAccountTitle', 'Delete account')}
                  </Text>
                  <Text mt={1} fontSize="12px" color="red.600" fontWeight="600">
                    {t('settings.permanentAction', 'Permanent action')}
                  </Text>
                </Box>
              </HStack>

              <Box px={4} py={3.5} borderRadius="12px" bg="red.50" border="1px solid" borderColor="red.100">
                <Text fontSize="13px" color="gray.700" lineHeight="1.55">
                  {t('settings.deleteAccountWarning', 'This cannot be undone. Your reports, votes, profile, and account information will be permanently deleted.')}
                </Text>
                {user?.email && (
                  <Text mt={2} fontSize="11px" color="gray.500" fontWeight="600" overflowWrap="anywhere">
                    {user.email}
                  </Text>
                )}
              </Box>

              <HStack gap={3}>
                <Button
                  flex={1}
                  variant="outline"
                  h="36px"
                  borderRadius="9px"
                  fontSize="12px"
                  onClick={() => setShowDeleteModal(false)}
                >
                  {t('settings.modals.changePassword.cancel', 'Cancel')}
                </Button>
                <Button
                  flex={1}
                  h="36px"
                  bg="red.600"
                  color="white"
                  borderRadius="9px"
                  fontSize="12px"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  _hover={{ bg: 'red.700' }}
                >
                  {loading ? t('settings.deleting', 'Deleting…') : t('settings.deleteAccountButton', 'Delete account')}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicyModal}
        onClose={() => setShowPrivacyPolicyModal(false)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={showTermsOfServiceModal}
        onClose={() => setShowTermsOfServiceModal(false)}
      />

      {/* Location Sharing Agreement Modal */}
      {showLocationSharingAgreement && (
        <Box
          className="app-modal-overlay"
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(15, 23, 42, 0.62)"
          backdropFilter="blur(7px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="var(--app-z-modal)"
          p={4}
        >
          <Box
            className="app-modal-dialog app-modal-scroll"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-sharing-title"
            bg="white"
            borderRadius="20px"
            p={{ base: 5, md: 6 }}
            maxW="450px"
            w="full"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="0 28px 80px rgba(15, 23, 42, 0.28)"
          >
            <VStack gap={5} align="stretch">
              <HStack justify="space-between" align="center">
                <HStack gap={3}>
                  <Box w="36px" h="36px" borderRadius="10px" bg="green.50" border="1px solid" borderColor="green.100" display="flex" alignItems="center" justifyContent="center">
                    <MapPin size={15} color="#059669" />
                  </Box>
                  <Text id="location-sharing-title" fontSize="17px" fontWeight="700" letterSpacing="-0.2px">Location sharing</Text>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Close location sharing agreement"
                  borderRadius="9px"
                  p={0}
                  minW="32px"
                  w="32px"
                  h="32px"
                  color="gray.500"
                  _hover={{ bg: 'gray.100', color: 'gray.900' }}
                  onClick={() => setShowLocationSharingAgreement(false)}
                >
                  <X size={15} />
                </Button>
              </HStack>

              <VStack gap={3.5} align="stretch">
                <Text fontSize="13px" fontWeight="600" color="gray.800">
                  Enabling this setting allows HyperApp to:
                </Text>

                <VStack gap={2.5} align="start">
                  <HStack gap={3} align="start">
                    <Box w="20px" h="20px" borderRadius="full" bg="green.50" border="1px solid" borderColor="green.200" display="flex" alignItems="center" justifyContent="center" mt={0.5} flexShrink={0}>
                      <Text fontSize="10px" color="green.700" fontWeight="bold">✓</Text>
                    </Box>
                    <Text fontSize="12px" color="gray.600" lineHeight="1.5">
                      Share your location with other community members on the map
                    </Text>
                  </HStack>

                  <HStack gap={3} align="start">
                    <Box w="20px" h="20px" borderRadius="full" bg="green.50" border="1px solid" borderColor="green.200" display="flex" alignItems="center" justifyContent="center" mt={0.5} flexShrink={0}>
                      <Text fontSize="10px" color="green.700" fontWeight="bold">✓</Text>
                    </Box>
                    <Text fontSize="12px" color="gray.600" lineHeight="1.5">
                      Allow other users to see you as a nearby community member
                    </Text>
                  </HStack>

                  <HStack gap={3} align="start">
                    <Box w="20px" h="20px" borderRadius="full" bg="green.50" border="1px solid" borderColor="green.200" display="flex" alignItems="center" justifyContent="center" mt={0.5} flexShrink={0}>
                      <Text fontSize="10px" color="green.700" fontWeight="bold">✓</Text>
                    </Box>
                    <Text fontSize="12px" color="gray.600" lineHeight="1.5">
                      Help build a safer community by connecting with nearby users
                    </Text>
                  </HStack>
                </VStack>

                <Box p={3.5} bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="11px">
                  <Text fontSize="11px" color="gray.600" lineHeight="1.55">
                    <strong>Privacy Note:</strong> Your location data is used only for community safety features and is not shared with third parties. You can disable this at any time.
                  </Text>
                </Box>
              </VStack>

              <HStack gap={3}>
                <Button
                  flex={1}
                  variant="outline"
                  h="36px"
                  borderRadius="9px"
                  fontSize="12px"
                  onClick={() => setShowLocationSharingAgreement(false)}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  h="36px"
                  bg="#111318"
                  color="white"
                  borderRadius="9px"
                  fontSize="12px"
                  onClick={confirmLocationSharing}
                  _hover={{ bg: '#252830' }}
                >
                  Enable sharing
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SettingsView;
