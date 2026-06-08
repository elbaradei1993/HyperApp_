import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, Grid, GridItem, Select } from '@chakra-ui/react';
import { Capacitor } from '@capacitor/core';
import { Settings, UserCog, Sliders, Shield, Info, LogOut, Key, Trash, Globe, Bell, Users, MapPin, FileText, ShieldCheck } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/auth';
import { pushNotificationService } from '../services/pushNotificationService';
import { notificationService } from '../services/notificationService';
import { storageManager } from '../lib/storage';

import ToggleSwitch from './shared/ToggleSwitch';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';
import MarketingEmailAdmin from './MarketingEmailAdmin';


const SettingsView: React.FC = () => {
  const { t } = useTranslation();
  const { user, signOut, updateProfile } = useAuth();
  const { currentLanguage, changeLanguage, isChanging } = useLanguage();
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();
  const { theme } = useTheme();

  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
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
  const [showMarketingEmailAdmin, setShowMarketingEmailAdmin] = useState(false);
  const [showLocationSharingAgreement, setShowLocationSharingAgreement] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<'granted' | 'denied' | 'default' | 'unknown'>('unknown');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
  ];

  // Sync selectedLanguage with currentLanguage
  useEffect(() => {
    setSelectedLanguage(currentLanguage);
  }, [currentLanguage]);

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

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    await changeLanguage(language, updateProfile, user);
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

    const confirmDelete = window.confirm(
      t('settings.deleteConfirmMessage'),
    );

    if (!confirmDelete) {
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

    if (enabled) {
      if (user?.id) {
        await storageManager.remove(`notificationPermissionRequested_${user.id}`);
      }

      if (notificationPermissionStatus !== 'granted') {
        try {
          // TODO: Implement with Capacitor push notifications
          if (user?.id) {
            await pushNotificationService.initialize(user.id);
            setNotificationPermissionStatus('granted');
            updateSettings({ notifications: true });
          } else {
            setNotificationPermissionStatus('denied');
            updateSettings({ notifications: false });
          }
        } catch (error) {
          console.error('Notification permission error:', error);
          setNotificationPermissionStatus('denied');
          updateSettings({ notifications: false });
        }
      } else {
        updateSettings({ notifications: true });
      }
    } else {
      updateSettings({ notifications: false });
      try {
        await pushNotificationService.updatePreferences({
          emergency_alerts: false,
          safety_reports: false,
        });
      } catch (error) {
        console.error('Error updating push notification preferences:', error);
      }
    }

    setIsRequestingPermission(false);
  };

  const handleLocationToggle = async (enabled: boolean) => {
    if (enabled) {
      // Show agreement dialog when enabling location sharing
      setShowLocationSharingAgreement(true);
    } else {
      // Disable location sharing immediately
      updateSettings({ locationSharing: false });
    }
  };

  const confirmLocationSharing = async () => {
    setShowLocationSharingAgreement(false);
    updateSettings({ locationSharing: true });

    // Request location permission if not already granted
    if (locationPermissionStatus !== 'granted') {
      if (navigator.geolocation) {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              () => {
                setLocationPermissionStatus('granted');
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
        }
      }
    }

    if (user?.id) {
      notificationService.setCurrentUserId(user.id);
    }
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
        <VStack justify="center" align="center">
          <Text fontSize="24px" fontWeight="700" letterSpacing="-0.5px" lineHeight="1.2">
            {t('settings.title')}
          </Text>
          <Text fontSize="14px" color="gray.700" mt={2} letterSpacing="0.5px" fontWeight="500">
            {t('settings.subtitle')}
          </Text>
        </VStack>
      </Box>

      {/* Main Content */}
      <Box p={6} minH="calc(100vh - 180px)">
        <VStack gap={4} align="stretch">
          {/* Account Management Section */}
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" mb={4}>
            <HStack justify="space-between" align="center" mb={5}>
              <HStack gap={3}>
                <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <UserCog size={18} />
                </Box>
                <Text fontWeight="600" fontSize="16px">{t('settings.accountManagementTitle')}</Text>
              </HStack>
            </HStack>

            <VStack gap={3} align="stretch">
              {/* Change Password */}
              <HStack gap={3} w="full">
                <Box w="12" h="12" borderRadius="8px" bg="blue.100" display="flex" alignItems="center" justifyContent="center">
                  <Key size={16} color="#2563eb" />
                </Box>
                <Button
                  bg="blue.500"
                  color="white"
                  borderRadius="12px"
                  px={4}
                  py={3}
                  fontSize="16px"
                  fontWeight="600"
                  onClick={() => setShowPasswordModal(true)}
                  _hover={{ bg: 'blue.600', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  flex={1}
                >
                  {t('settings.changePasswordButton')}
                </Button>
              </HStack>

              {/* Delete Account */}
              <HStack gap={3} w="full">
                <Box w="12" h="12" borderRadius="8px" bg="red.100" display="flex" alignItems="center" justifyContent="center">
                  <Trash size={16} color="#dc2626" />
                </Box>
                <Button
                  bg="red.500"
                  color="white"
                  borderRadius="12px"
                  px={4}
                  py={3}
                  fontSize="16px"
                  fontWeight="600"
                  onClick={() => setShowDeleteModal(true)}
                  _hover={{ bg: 'red.600', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  flex={1}
                >
                  {t('settings.deleteAccountButton')}
                </Button>
              </HStack>
            </VStack>
          </Box>

          {/* App Preferences Section */}
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" mb={4}>
            <HStack justify="space-between" align="center" mb={5}>
              <HStack gap={3}>
                <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <Sliders size={18} />
                </Box>
                <Text fontWeight="600" fontSize="16px">{t('settings.appPreferencesTitle')}</Text>
              </HStack>
            </HStack>

            <VStack gap={4} align="stretch">
              {/* Language Selection */}
              <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                <HStack justify="space-between" align="center">
                  <HStack gap={3}>
                    <Box w="10" h="10" borderRadius="8px" bg="blue.100" display="flex" alignItems="center" justifyContent="center">
                      <Globe size={16} color="#2563eb" />
                    </Box>
                    <Box>
                      <Text fontSize="14px" fontWeight="600" color="gray.900">{t('settings.languageTitle')}</Text>
                      <Text fontSize="12px" color="gray.600">{t('settings.languageDescription')}</Text>
                    </Box>
                  </HStack>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    disabled={isChanging}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: isChanging ? '#f3f4f6' : 'white',
                      color: isChanging ? '#6b7280' : '#111827',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isChanging ? 'not-allowed' : 'pointer',
                      minWidth: '120px',
                      opacity: isChanging ? 0.6 : 1,
                    }}
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </HStack>
              </Box>

              {/* Notifications */}
              <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                <HStack justify="space-between" align="center">
                  <HStack gap={3}>
                    <Box w="10" h="10" borderRadius="8px" bg="orange.100" display="flex" alignItems="center" justifyContent="center">
                      <Bell size={16} color="#d97706" />
                    </Box>
                    <Box>
                      <Text fontSize="14px" fontWeight="600" color="gray.900">{t('settings.notificationsTitle')}</Text>
                      {notificationPermissionStatus === 'denied' && (
                        <Text fontSize="11px" color="red.600">{t('settings.notificationsPermissionDenied')}</Text>
                      )}
                    </Box>
                  </HStack>
                  <ToggleSwitch
                    checked={settings.notifications && notificationPermissionStatus === 'granted'}
                    onChange={handleNotificationToggle}
                    disabled={isRequestingPermission}
                    size="md"
                  />
                </HStack>
              </Box>


            </VStack>
          </Box>

          {/* Privacy & Security Section */}
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)" mb={4}>
            <HStack justify="space-between" align="center" mb={5}>
              <HStack gap={3}>
                <Box w="40px" h="40px" borderRadius="12px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <Shield size={18} />
                </Box>
                <Text fontWeight="600" fontSize="16px">{t('settings.privacySecurityTitle')}</Text>
              </HStack>
            </HStack>

            <VStack gap={4} align="stretch">
              {/* Location Sharing */}
              <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200">
                <HStack justify="space-between" align="center">
                  <HStack gap={3}>
                    <Box w="10" h="10" borderRadius="8px" bg="green.100" display="flex" alignItems="center" justifyContent="center">
                      <MapPin size={16} color="#059669" />
                    </Box>
                    <Box>
                      <Text fontSize="14px" fontWeight="600" color="gray.900">{t('settings.locationSharingTitle')}</Text>
                      <Text fontSize="12px" color="gray.600">Share your location and see other community members on the map</Text>
                    </Box>
                  </HStack>
                  <ToggleSwitch
                    checked={settings.locationSharing}
                    onChange={handleLocationToggle}
                    size="md"
                  />
                </HStack>
              </Box>
              {/* App Version */}
              <Box bg="gray.50" borderRadius="12px" p={4} border="1px solid" borderColor="gray.200" textAlign="center">
                <Box w="16" h="16" borderRadius="12px" bg="blue.500" display="flex" alignItems="center" justifyContent="center" mx="auto" mb={3}>
                  <Settings size={20} color="white" />
                </Box>
                <Text fontSize="18px" fontWeight="700" color="gray.900" mb={1}>{t('settings.version')}</Text>
                <Text fontSize="14px" color="gray.600">{t('settings.appDescription')}</Text>
              </Box>

              {/* Support Links */}
              <Grid templateColumns="1fr 1fr" gap={3}>
                <Button
                  bg="green.500"
                  color="white"
                  borderRadius="12px"
                  p={4}
                  h="auto"
                  onClick={() => setShowPrivacyPolicyModal(true)}
                  _hover={{ bg: 'green.600', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                >
                  <VStack gap={2}>
                    <ShieldCheck size={20} />
                    <Text fontSize="12px" fontWeight="600">{t('settings.privacyPolicy')}</Text>
                  </VStack>
                </Button>

                <Button
                  bg="orange.500"
                  color="white"
                  borderRadius="12px"
                  p={4}
                  h="auto"
                  onClick={() => setShowTermsOfServiceModal(true)}
                  _hover={{ bg: 'orange.600', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                >
                  <VStack gap={2}>
                    <FileText size={20} />
                    <Text fontSize="12px" fontWeight="600">{t('settings.termsOfService')}</Text>
                  </VStack>
                </Button>
              </Grid>
            </VStack>
          </Box>

          {/* Logout Section */}
          <Box bg="white" borderRadius="16px" p={5} border="1px solid" borderColor="gray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)">
            <Button
              bg="red.500"
              color="white"
              borderRadius="12px"
              px={6}
              py={4}
              fontSize="18px"
              fontWeight="700"
              onClick={handleLogout}
              w="full"
              _hover={{ bg: 'red.600', transform: 'translateY(-1px)' }}
              _active={{ transform: 'translateY(0)' }}
              transition="all 0.2s"
            >
              <HStack gap={3} justify="center">
                <LogOut size={20} />
                <Text>{t('settings.logoutButton')}</Text>
              </HStack>
            </Button>
          </Box>
        </VStack>
      </Box>

      {/* Change Password Modal */}
      {showPasswordModal && (
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
          zIndex={2000}
          p={4}
        >
          <Box
            bg="white"
            borderRadius="16px"
            p={6}
            maxW="420px"
            w="full"
            boxShadow="0 20px 25px rgba(0, 0, 0, 0.1)"
          >
            <VStack gap={6} align="stretch">
              <HStack justify="space-between" align="center">
                <HStack gap={3}>
                  <Box w="10" h="10" borderRadius="8px" bg="blue.100" display="flex" alignItems="center" justifyContent="center">
                    <Key size={16} color="#2563eb" />
                  </Box>
                  <Text fontSize="20px" fontWeight="700">{t('settings.modals.changePassword.title')}</Text>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  borderRadius="full"
                  p={2}
                  minW="auto"
                  h="auto"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  ✕
                </Button>
              </HStack>

              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="14px" fontWeight="600" mb={2}>{t('settings.modals.changePassword.currentPassword')}</Text>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder={t('settings.modals.changePassword.currentPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                  />
                </Box>

                <Box>
                  <Text fontSize="14px" fontWeight="600" mb={2}>{t('settings.modals.changePassword.newPassword')}</Text>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder={t('settings.modals.changePassword.newPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                  />
                </Box>

                <Box>
                  <Text fontSize="14px" fontWeight="600" mb={2}>{t('settings.modals.changePassword.confirmNewPassword')}</Text>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder={t('settings.modals.changePassword.confirmPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                  />
                </Box>
              </VStack>

              <HStack gap={3}>
                <Button
                  flex={1}
                  variant="outline"
                  borderRadius="8px"
                  py={3}
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  {t('settings.modals.changePassword.cancel')}
                </Button>
                <Button
                  flex={1}
                  bg="blue.500"
                  color="white"
                  borderRadius="8px"
                  py={3}
                  onClick={handlePasswordChange}
                  disabled={loading}
                  _hover={{ bg: 'blue.600' }}
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
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.5)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={2000}
          p={4}
        >
          <Box
            bg="white"
            borderRadius="16px"
            p={6}
            maxW="400px"
            w="full"
            boxShadow="0 20px 25px rgba(0, 0, 0, 0.1)"
          >
            <VStack gap={4} align="stretch">
              <Text fontSize="20px" fontWeight="700" color="red.600">⚠️ Delete Account</Text>

              <Text fontSize="14px" color="gray.700" lineHeight="1.5">
                This action cannot be undone. All your reports, votes, profile data, and account information will be permanently deleted.
              </Text>

              <HStack gap={3}>
                <Button
                  flex={1}
                  variant="outline"
                  borderRadius="8px"
                  py={3}
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  bg="red.500"
                  color="white"
                  borderRadius="8px"
                  py={3}
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  _hover={{ bg: 'red.600' }}
                >
                  {loading ? 'Deleting...' : 'Delete Account'}
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
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.5)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={2000}
          p={4}
        >
          <Box
            bg="white"
            borderRadius="16px"
            p={6}
            maxW="450px"
            w="full"
            boxShadow="0 20px 25px rgba(0, 0, 0, 0.1)"
          >
            <VStack gap={6} align="stretch">
              <HStack justify="space-between" align="center">
                <HStack gap={3}>
                  <Box w="10" h="10" borderRadius="8px" bg="green.100" display="flex" alignItems="center" justifyContent="center">
                    <MapPin size={16} color="#059669" />
                  </Box>
                  <Text fontSize="20px" fontWeight="700">Location Sharing Agreement</Text>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  borderRadius="full"
                  p={2}
                  minW="auto"
                  h="auto"
                  onClick={() => setShowLocationSharingAgreement(false)}
                >
                  ✕
                </Button>
              </HStack>

              <VStack gap={4} align="stretch">
                <Text fontSize="16px" fontWeight="600" color="gray.900">
                  By enabling location sharing, you agree to:
                </Text>

                <VStack gap={3} align="start">
                  <HStack gap={3} align="start">
                    <Box w="6" h="6" borderRadius="full" bg="green.500" display="flex" alignItems="center" justifyContent="center" mt={0.5} flexShrink={0}>
                      <Text fontSize="12px" color="white" fontWeight="bold">✓</Text>
                    </Box>
                    <Text fontSize="14px" color="gray.700">
                      Share your location with other community members on the map
                    </Text>
                  </HStack>

                  <HStack gap={3} align="start">
                    <Box w="6" h="6" borderRadius="full" bg="green.500" display="flex" alignItems="center" justifyContent="center" mt={0.5} flexShrink={0}>
                      <Text fontSize="12px" color="white" fontWeight="bold">✓</Text>
                    </Box>
                    <Text fontSize="14px" color="gray.700">
                      Allow other users to see you as a nearby community member
                    </Text>
                  </HStack>

                  <HStack gap={3} align="start">
                    <Box w="6" h="6" borderRadius="full" bg="green.500" display="flex" alignItems="center" justifyContent="center" mt={0.5} flexShrink={0}>
                      <Text fontSize="12px" color="white" fontWeight="bold">✓</Text>
                    </Box>
                    <Text fontSize="14px" color="gray.700">
                      Help build a safer community by connecting with nearby users
                    </Text>
                  </HStack>
                </VStack>

                <Box p={4} bg="gray.50" borderRadius="8px">
                  <Text fontSize="13px" color="gray.600" lineHeight="1.5">
                    <strong>Privacy Note:</strong> Your location data is used only for community safety features and is not shared with third parties. You can disable this at any time.
                  </Text>
                </Box>
              </VStack>

              <HStack gap={3}>
                <Button
                  flex={1}
                  variant="outline"
                  borderRadius="8px"
                  py={3}
                  onClick={() => setShowLocationSharingAgreement(false)}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  bg="green.500"
                  color="white"
                  borderRadius="8px"
                  py={3}
                  onClick={confirmLocationSharing}
                  _hover={{ bg: 'green.600' }}
                >
                  I Agree - Enable Sharing
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
