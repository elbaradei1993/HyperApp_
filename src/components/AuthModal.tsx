import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { Box, VStack, HStack, Text, Button, Input } from '@chakra-ui/react';
import { X, User, Mail, Lock, UserPlus, Camera, MapPin, Phone, FileText } from 'lucide-react';

import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { INTEREST_CATEGORIES } from '../types';
import { uploadService } from '../services/upload';

import InputComponent from './shared/Input';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle, resetPassword, isLoading, updateProfile } = useAuth();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    loginEmail: '',
    loginPassword: '',
    signupUsername: '',
    signupEmail: '',
    signupPassword: '',
    signupPasswordConfirm: '',
    signupFirstName: '',
    signupLastName: '',
    signupPhone: '',
    signupLocation: '',
    resetEmail: '',
  });
  const [signupInterests, setSignupInterests] = useState<string[]>([]);
  const [signupProfilePicture, setSignupProfilePicture] = useState<File | null>(null);
  const [signupProfilePicturePreview, setSignupProfilePicturePreview] = useState('');
  const [signupMarketingConsent, setSignupMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect location when signup tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'signup' && !locationDetected && !locationLoading) {
      detectUserLocation();
    }
  }, [isOpen, activeTab, locationDetected, locationLoading]);

  // Function to detect and set user location
  const detectUserLocation = async () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    setLocationLoading(true);

    // Check if we're on a mobile device for better messaging
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
      console.log('Requesting location permission and detection...');

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout for mobile
            maximumAge: 300000, // 5 minutes
          },
        );
      });

      const { latitude, longitude } = position.coords;
      console.log('Location detected:', latitude, longitude);

      // Try to reverse geocode to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        );
        const data = await response.json();

        if (data && data.display_name) {
          // Use the full address
          setFormData(prev => ({ ...prev, signupLocation: data.display_name }));
          console.log('Address resolved:', data.display_name);
        } else {
          // Fallback to coordinates
          const coordsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setFormData(prev => ({ ...prev, signupLocation: coordsString }));
          console.log('Using coordinates as fallback:', coordsString);
        }
      } catch (geocodeError) {
        console.error('Reverse geocoding failed:', geocodeError);
        // Fallback to coordinates
        const coordsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setFormData(prev => ({ ...prev, signupLocation: coordsString }));
        console.log('Using coordinates due to geocoding error:', coordsString);
      }

      setLocationDetected(true);
    } catch (error: any) {
      console.error('Location detection failed:', error);

      // Provide user feedback for mobile devices
      if (isMobile && error.code === 1) { // PERMISSION_DENIED
        console.log('Location permission denied on mobile - user will see guidance');
        // The LocationPermissionModal will be shown by the app if needed
      }

      // Don't show error to user, just leave location field empty
      setLocationDetected(true); // Mark as "detected" even if failed to prevent retry loops
    } finally {
      setLocationLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignupProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignupProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleInterest = (interest: string) => {
    setSignupInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest],
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.loginEmail || !formData.loginPassword) {
      setError(t('auth.fillAllFields') as string);
      return;
    }

    try {
      console.log('Attempting login for:', formData.loginEmail);
      await signIn(formData.loginEmail, formData.loginPassword);
      console.log('Login successful');
      onClose();
      setFormData(prev => ({ ...prev, loginEmail: '', loginPassword: '' }));
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = t('auth.loginFailed');

      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = t('auth.invalidCredentials');
      } else if (error.message?.includes('User not found')) {
        errorMessage = t('auth.accountNotFound');
      } else {
        // Show the actual error for debugging
        errorMessage = `Login failed: ${error.message}`;
      }

      setError(errorMessage);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.signupFirstName || !formData.signupLastName || !formData.signupUsername || !formData.signupEmail || !formData.signupPassword || !formData.signupPasswordConfirm) {
      setError(t('auth.fillAllFields') as string);
      return;
    }

    if (formData.signupPassword !== formData.signupPasswordConfirm) {
      setError(t('auth.passwordsNotMatch') as string);
      return;
    }

    if (formData.signupPassword.length < 6) {
      setError(t('auth.passwordTooShort') as string);
      return;
    }

    try {
      console.log('Attempting signup for:', formData.signupEmail);

      // Upload profile picture if provided
      let profilePictureUrl = '';
      if (signupProfilePicture) {
        try {
          const uploadResult = await uploadService.uploadProfilePicture(signupProfilePicture, 'temp-user');
          profilePictureUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Profile picture upload failed:', uploadError);
          // Continue with signup even if profile picture upload fails
        }
      }

      // Get current language from i18n
      const currentLanguage = i18next.language || 'en';

      const response = await signUp(formData.signupEmail, formData.signupPassword, formData.signupUsername, signupMarketingConsent, currentLanguage);
      console.log('Signup response:', response);

      if (response.data.user && !response.data.session) {
        // Email confirmation required - save user profile data for when they confirm
        console.log('Email confirmation required for user:', response.data.user.email);

        // Save profile data to localStorage for when email is confirmed
        const profileData = {
          first_name: formData.signupFirstName,
          last_name: formData.signupLastName,
          phone: formData.signupPhone,
          location: formData.signupLocation,
          interests: signupInterests,
          profile_completed_at: new Date().toISOString(),
        };
        localStorage.setItem(`pendingProfile_${response.data.user.id}`, JSON.stringify(profileData));

        // Clear form and close modal
        setFormData(prev => ({
          ...prev,
          signupUsername: '',
          signupEmail: '',
          signupPassword: '',
          signupPasswordConfirm: '',
          signupFirstName: '',
          signupLastName: '',
          signupPhone: '',
          signupLocation: '',
        }));
        setSignupInterests([]);
        setSignupProfilePicture(null);
        setSignupProfilePicturePreview('');

        setError(''); // Clear any errors
        onClose(); // Close the modal

        // Show success message for email confirmation
        addNotification({
          type: 'success',
          title: t('auth.accountCreated'),
          message: t('auth.checkEmailForConfirmation'),
          duration: 4000,
        });
      } else if (response.data.session) {
        // Auto-confirmed (if disabled in Supabase) - save profile immediately
        console.log('Auto-confirmed signup successful');

        // Save the profile data immediately since user is confirmed
        try {
          const profileData = {
            first_name: formData.signupFirstName,
            last_name: formData.signupLastName,
            phone: formData.signupPhone,
            location: formData.signupLocation,
            interests: signupInterests,
            profile_completed_at: new Date().toISOString(),
          };

          // Update profile in database
          if (response.data.user) {
            await updateProfile(profileData);
          }

          console.log('Profile data saved successfully');
        } catch (profileError) {
          console.error('Error saving profile data:', profileError);
          // Continue with signup success even if profile save fails
        }

        addNotification({
          type: 'success',
          title: t('auth.accountCreated'),
          message: t('auth.welcomeMessage'),
          duration: 5000,
        });

        setActiveTab('login');
        setFormData(prev => ({
          ...prev,
          signupUsername: '',
          signupEmail: '',
          signupPassword: '',
          signupPasswordConfirm: '',
          signupFirstName: '',
          signupLastName: '',
          signupPhone: '',
          signupLocation: '',
        }));
        setSignupInterests([]);
        setSignupProfilePicture(null);
        setSignupProfilePicturePreview('');
      } else {
        // Unexpected response
        console.warn('Unexpected signup response:', response);
        setError(t('auth.signupError'));
      }
    } catch (error: any) {
      console.error('Signup error:', error);

      let errorMessage = t('auth.signupFailed');

      if (error.message?.includes('User already registered')) {
        errorMessage = t('auth.accountExists');
        setActiveTab('login');
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = t('auth.passwordMinLength');
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = t('auth.invalidEmail');
      } else {
        // Show the actual error for debugging
        errorMessage = `Signup failed: ${error.message}`;
      }

      setError(errorMessage);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.resetEmail?.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }

    try {
      console.log('Attempting password reset for:', formData.resetEmail);
      await resetPassword(formData.resetEmail);
      console.log('Password reset email sent');

      addNotification({
        type: 'success',
        title: t('auth.passwordResetSent'),
        message: t('auth.passwordResetInstructions'),
        duration: 4000,
      });

      setShowForgotPassword(false);
      setFormData(prev => ({ ...prev, resetEmail: '' }));
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(`Failed to send reset email: ${error.message}`);
    }
  };

  if (!isOpen) {
    return null;
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
    >
      <Box
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
              <Box w="10" h="10" borderRadius="8px" bg="blue.100" display="flex" alignItems="center" justifyContent="center">
                <User size={16} color="#2563eb" />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="18px" fontWeight="700" color="gray.900">
                  {t('auth.welcome')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  {t('auth.joinCommunity')}
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

          {/* Tab Navigation */}
          <HStack gap={0} mt={4} bg="gray.100" borderRadius="12px" p={1}>
            <Button
              flex={1}
              variant={activeTab === 'login' ? 'solid' : 'ghost'}
              bg={activeTab === 'login' ? 'blue.500' : 'transparent'}
              color={activeTab === 'login' ? 'white' : 'gray.600'}
              _hover={{ bg: activeTab === 'login' ? 'blue.600' : 'gray.200' }}
              borderRadius="10px"
              size="sm"
              onClick={() => setActiveTab('login')}
              fontSize="14px"
              fontWeight="600"
            >
              {t('auth.login')}
            </Button>
            <Button
              flex={1}
              variant={activeTab === 'signup' ? 'solid' : 'ghost'}
              bg={activeTab === 'signup' ? 'blue.500' : 'transparent'}
              color={activeTab === 'signup' ? 'white' : 'gray.600'}
              _hover={{ bg: activeTab === 'signup' ? 'blue.600' : 'gray.200' }}
              borderRadius="10px"
              size="sm"
              onClick={() => setActiveTab('signup')}
              fontSize="14px"
              fontWeight="600"
            >
              {t('auth.signup')}
            </Button>
          </HStack>
        </Box>

        {/* Content */}
        <Box p={6} overflowY="auto" maxH="calc(90vh - 200px)">
          <VStack gap={6} align="stretch">
            {error && (
              <Box
                p={4}
                bg={error.includes('successful') ? 'green.50' : 'red.50'}
                borderRadius="12px"
                border="1px solid"
                borderColor={error.includes('successful') ? 'green.200' : 'red.200'}
              >
                <Text fontSize="14px" color={error.includes('successful') ? 'green.800' : 'red.800'}>
                  {error}
                </Text>
              </Box>
            )}

            {showForgotPassword ? (
              <VStack gap={4} align="stretch" as="form" onSubmit={handleResetPassword}>
                <VStack gap={2} align="center">
                  <Text fontSize="18px" fontWeight="700" color="gray.900">
                    {t('auth.resetPassword')}
                  </Text>
                  <Text fontSize="14px" color="gray.600" textAlign="center">
                    {t('auth.resetPasswordDesc')}
                  </Text>
                </VStack>

                <Box>
                  <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                    {t('auth.emailAddress')}
                  </Text>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={formData.resetEmail}
                    onChange={(e) => handleInputChange('resetEmail', e.target.value)}
                    placeholder={t('auth.enterEmailAddress')}
                    borderRadius="12px"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                    required
                  />
                </Box>
              </VStack>
            ) : activeTab === 'login' ? (
              <VStack gap={4} align="stretch" as="form" onSubmit={handleLogin}>
                <Box>
                  <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                    {t('auth.email')}
                  </Text>
                  <Input
                    id="loginEmail"
                    type="email"
                    value={formData.loginEmail}
                    onChange={(e) => handleInputChange('loginEmail', e.target.value)}
                    placeholder={t('auth.enterEmail')}
                    borderRadius="12px"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                    required
                  />
                </Box>

                <Box>
                  <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                    {t('auth.password')}
                  </Text>
                  <Input
                    id="loginPassword"
                    type="password"
                    value={formData.loginPassword}
                    onChange={(e) => handleInputChange('loginPassword', e.target.value)}
                    placeholder={t('auth.enterPassword')}
                    borderRadius="12px"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                    required
                  />
                </Box>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForgotPassword(true)}
                  color="blue.500"
                  alignSelf="flex-start"
                  p={0}
                  fontSize="14px"
                  fontWeight="500"
                  _hover={{ bg: 'transparent', textDecoration: 'underline' }}
                >
                  {t('auth.forgotPassword')}
                </Button>
              </VStack>
            ) : (
              <VStack gap={6} align="stretch">
                {/* Profile Picture Section */}
                <Box textAlign="center">
                  <Box position="relative" display="inline-block">
                    <Box
                      w="100px"
                      h="100px"
                      borderRadius="50%"
                      border="3px solid"
                      borderColor="gray.200"
                      overflow="hidden"
                      mx="auto"
                      mb={4}
                    >
                      {signupProfilePicturePreview ? (
                        <img
                          src={signupProfilePicturePreview}
                          alt="Profile preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Box
                          w="full"
                          h="full"
                          bg="gray.100"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <User size={32} color="#9ca3af" />
                        </Box>
                      )}
                    </Box>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      style={{ display: 'none' }}
                      aria-label="Profile picture upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      borderRadius="12px"
                      mb={2}
                    >
                      <HStack gap={2}>
                        <Camera size={14} />
                        <Text>{signupProfilePicture ? t('profile.changePhoto') : t('profile.addProfilePicture')}</Text>
                      </HStack>
                    </Button>
                    <Text fontSize="12px" color="gray.500">
                      {t('profile.uploadProfilePictureOptional')}
                    </Text>
                  </Box>
                </Box>

                <VStack gap={4} align="stretch" as="form" onSubmit={handleSignup}>
                  {/* Basic Info */}
                  <HStack gap={3} align="stretch">
                    <Box flex={1}>
                      <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                        {t('profile.firstName')}
                      </Text>
                      <Input
                        id="signupFirstName"
                        type="text"
                        value={formData.signupFirstName}
                        onChange={(e) => handleInputChange('signupFirstName', e.target.value)}
                        placeholder={t('profile.enterFirstName')}
                        borderRadius="12px"
                        border="1px solid"
                        borderColor="gray.200"
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                        required
                      />
                    </Box>
                    <Box flex={1}>
                      <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                        {t('profile.lastName')}
                      </Text>
                      <Input
                        id="signupLastName"
                        type="text"
                        value={formData.signupLastName}
                        onChange={(e) => handleInputChange('signupLastName', e.target.value)}
                        placeholder={t('profile.enterLastName')}
                        borderRadius="12px"
                        border="1px solid"
                        borderColor="gray.200"
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                        required
                      />
                    </Box>
                  </HStack>

                  <Box>
                    <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                      {t('auth.username')}
                    </Text>
                    <Input
                      id="signupUsername"
                      type="text"
                      value={formData.signupUsername}
                      onChange={(e) => handleInputChange('signupUsername', e.target.value)}
                      placeholder={t('auth.chooseUsername')}
                      borderRadius="12px"
                      border="1px solid"
                      borderColor="gray.200"
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                      required
                    />
                  </Box>

                  <Box>
                    <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                      {t('auth.email')}
                    </Text>
                    <Input
                      id="signupEmail"
                      type="email"
                      value={formData.signupEmail}
                      onChange={(e) => handleInputChange('signupEmail', e.target.value)}
                      placeholder={t('auth.enterEmail')}
                      borderRadius="12px"
                      border="1px solid"
                      borderColor="gray.200"
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                      required
                    />
                  </Box>

                  <HStack gap={3} align="stretch">
                    <Box flex={1}>
                      <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                        {t('profile.phoneNumber')}
                      </Text>
                      <Input
                        id="signupPhone"
                        type="tel"
                        value={formData.signupPhone}
                        onChange={(e) => handleInputChange('signupPhone', e.target.value)}
                        placeholder={t('profile.phonePlaceholder')}
                        borderRadius="12px"
                        border="1px solid"
                        borderColor="gray.200"
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                      />
                    </Box>
                    <Box flex={1}>
                      <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                        {t('profile.location')}
                      </Text>
                      <Input
                        id="signupLocation"
                        type="text"
                        value={formData.signupLocation}
                        onChange={(e) => handleInputChange('signupLocation', e.target.value)}
                        placeholder={locationLoading ? t('auth.detectingLocation') : t('profile.enterLocation')}
                        borderRadius="12px"
                        border="1px solid"
                        borderColor="gray.200"
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                        disabled={locationLoading}
                      />
                    </Box>
                  </HStack>

                  {/* Password Fields */}
                  <Box>
                    <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                      {t('auth.password')}
                    </Text>
                    <Input
                      id="signupPassword"
                      type="password"
                      value={formData.signupPassword}
                      onChange={(e) => handleInputChange('signupPassword', e.target.value)}
                      placeholder={t('auth.createPassword')}
                      borderRadius="12px"
                      border="1px solid"
                      borderColor="gray.200"
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                      required
                    />
                  </Box>

                  <Box>
                    <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                      {t('auth.confirmPassword')}
                    </Text>
                    <Input
                      id="signupPasswordConfirm"
                      type="password"
                      value={formData.signupPasswordConfirm}
                      onChange={(e) => handleInputChange('signupPasswordConfirm', e.target.value)}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      borderRadius="12px"
                      border="1px solid"
                      borderColor="gray.200"
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                      required
                    />
                  </Box>

                  {/* Interests Section */}
                  <Box>
                    <Text fontSize="14px" fontWeight="600" color="gray.700" mb={2}>
                      {t('profile.interestsOptional')}
                    </Text>
                    <Text fontSize="12px" color="gray.500" mb={4}>
                      {t('profile.selectActivities')}
                    </Text>
                    <VStack gap={3} align="stretch">
                      {Object.entries(INTEREST_CATEGORIES).slice(0, 3).map(([key, category]) => (
                        <Box key={key}>
                          <Text fontSize="14px" fontWeight="600" color="gray.700" mb={2}>
                            {category.icon} {t(`profile.interests.categories.${key}`)}
                          </Text>
                          <HStack gap={2} flexWrap="wrap">
                            {category.items.slice(0, 4).map((item) => (
                              <Button
                                key={item}
                                variant={signupInterests.includes(item) ? 'solid' : 'outline'}
                                size="sm"
                                onClick={() => toggleInterest(item)}
                                borderRadius="16px"
                                fontSize="12px"
                                fontWeight="500"
                                px={3}
                                py={1}
                                h="auto"
                                bg={signupInterests.includes(item) ? 'blue.500' : 'transparent'}
                                color={signupInterests.includes(item) ? 'white' : 'gray.600'}
                                borderColor={signupInterests.includes(item) ? 'blue.500' : 'gray.200'}
                                _hover={{
                                  bg: signupInterests.includes(item) ? 'blue.600' : 'gray.50',
                                  borderColor: signupInterests.includes(item) ? 'blue.600' : 'gray.300',
                                }}
                              >
                                {t(`profile.interests.items.${item}`)}
                              </Button>
                            ))}
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  </Box>

                  {/* Marketing Consent */}
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
                        id="signupMarketingConsent"
                        checked={signupMarketingConsent}
                        onChange={(e) => setSignupMarketingConsent(e.target.checked)}
                        style={{ marginTop: '2px', width: '16px', height: '16px' }}
                      />
                      <VStack gap={1} align="start">
                        <Text fontSize="14px" fontWeight="600" color="gray.900">
                          {t('profile.marketingConsent.title')}
                        </Text>
                        <Text fontSize="12px" color="gray.600" lineHeight="1.4">
                          {t('profile.marketingConsent.description')}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </VStack>
              </VStack>
            )}
          </VStack>
        </Box>

        {/* Actions */}
        <Box
          p={6}
          borderTop="1px solid"
          borderColor="gray.200"
          bg="gray.50"
          position="sticky"
          bottom={0}
          zIndex={10}
        >
          {showForgotPassword ? (
            <HStack gap={3}>
              <Button
                flex={1}
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                borderRadius="12px"
                border="1px solid"
                borderColor="gray.200"
              >
                {t('auth.backToLogin')}
              </Button>
              <Button
                flex={1}
                bg="blue.500"
                color="white"
                onClick={handleResetPassword}
                borderRadius="12px"
                _hover={{ bg: 'blue.600' }}
                disabled={isLoading}
              >
                {isLoading ? t('auth.sending') : t('auth.sendResetLink')}
              </Button>
            </HStack>
          ) : activeTab === 'login' ? (
            <Button
              w="full"
              bg="blue.500"
              color="white"
              onClick={handleLogin}
              borderRadius="12px"
              _hover={{ bg: 'blue.600' }}
              disabled={isLoading}
            >
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          ) : (
            <Button
              w="full"
              bg="blue.500"
              color="white"
              onClick={handleSignup}
              borderRadius="12px"
              _hover={{ bg: 'blue.600' }}
              disabled={isLoading}
            >
              {isLoading ? t('auth.creatingAccount') : t('auth.signup')}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AuthModal;
