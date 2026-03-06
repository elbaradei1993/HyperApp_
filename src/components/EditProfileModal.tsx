import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, Input } from '@chakra-ui/react';
import { Geolocation } from '@capacitor/geolocation';
import { User, MapPin, Phone, FileText, Camera, X } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { uploadService } from '../services/upload';
import { userLocationService } from '../services/userLocationService';
import { reverseGeocode } from '../lib/geocoding';
import { INTEREST_CATEGORIES } from '../types';

// Arabic translations for interests
const INTEREST_TRANSLATIONS: { [key: string]: string } = {
  // Sports & Fitness
  'Running': 'الجري',
  'Gym': 'النادي الرياضي',
  'Yoga': 'اليوغا',
  'Football': 'كرة القدم',
  'Basketball': 'كرة السلة',
  'Swimming': 'السباحة',
  'Cycling': 'ركوب الدراجة',
  'Tennis': 'التنس',
  'Martial Arts': 'الفنون القتالية',
  'Dance': 'الرقص',
  // Music & Arts
  'Concerts': 'الحفلات الموسيقية',
  'Theater': 'المسرح',
  'Painting': 'الرسم',
  'Photography': 'التصوير',
  'Music Production': 'إنتاج الموسيقى',
  'Film': 'الأفلام',
  'Writing': 'الكتابة',
  'Sculpture': 'النحت',
  'Design': 'التصميم',
  'Crafts': 'الحرف اليدوية',
  // Food & Dining
  'Restaurants': 'المطاعم',
  'Cooking': 'الطبخ',
  'Baking': 'الخبز',
  'Coffee Shops': 'مقاهي القهوة',
  'Fine Dining': 'الطعام الفاخر',
  'Street Food': 'طعام الشارع',
  'Vegan': 'النباتي',
  'Wine': 'النبيذ',
  'Beer': 'البيرة',
  'Cocktails': 'الكوكتيلات',
  // Education & Learning
  'Courses': 'الدورات',
  'Workshops': 'ورش العمل',
  'Books': 'الكتب',
  'Online Learning': 'التعلم عبر الإنترنت',
  'Languages': 'اللغات',
  'Science': 'العلم',
  'History': 'التاريخ',
  'Technology': 'التكنولوجيا',
  'Business': 'الأعمال',
  'Art History': 'تاريخ الفن',
  // Environment & Nature
  'Hiking': 'التنزه',
  'Camping': 'التخييم',
  'Gardening': 'البستنة',
  'Sustainability': 'الاستدامة',
  'Wildlife': 'الحياة البرية',
  'Conservation': 'الحفاظ على البيئة',
  'Fishing': 'الصيد',
  'Bird Watching': 'مراقبة الطيور',
  'Eco-friendly Living': 'الحياة الصديقة للبيئة',
  // Gaming & Tech
  'Video Games': 'ألعاب الفيديو',
  'Programming': 'البرمجة',
  'Gadgets': 'الأدوات التقنية',
  'AI/ML': 'الذكاء الاصطناعي/التعلم الآلي',
  'Cybersecurity': 'الأمن السيبراني',
  'Mobile Apps': 'تطبيقات الهاتف',
  'Web Development': 'تطوير الويب',
  'Hardware': 'الأجهزة',
  'Virtual Reality': 'الواقع الافتراضي',
  'Board Games': 'ألعاب الطاولة',
  // Social & Community
  'Meetups': 'اللقاءات',
  'Volunteering': 'التطوع',
  'Clubs': 'النوادي',
  'Networking': 'التواصل',
  'Charity': 'الجمعيات الخيرية',
  'Community Events': 'فعاليات المجتمع',
  'Book Clubs': 'نوادي الكتب',
  'Sports Teams': 'الفرق الرياضية',
  'Cultural Events': 'الفعاليات الثقافية',
  'Religious Groups': 'المجموعات الدينية',
  // Shopping & Lifestyle
  'Markets': 'الأسواق',
  'Fashion': 'الأزياء',
  'Beauty': 'الجمال',
  'Home Decor': 'ديكور المنزل',
  'Antiques': 'القطع الأثرية',
  'Vintage': 'العتيق',
  'Luxury': 'الفاخر',
  'Thrifting': 'التسوق الرخيص',
  'Art Galleries': 'معارض الفن',
  'Craft Markets': 'أسواق الحرف اليدوية',
  // Transportation
  'Public Transport': 'النقل العام',
  'Electric Vehicles': 'المركبات الكهربائية',
  'Motorcycles': 'الدراجات النارية',
  'Car Sharing': 'مشاركة السيارات',
  'Ride Sharing': 'مشاركة الركوب',
  'Walking': 'المشي',
  'Scooters': 'السكوترات',
  'Boats': 'القوارب',
  'Aviation': 'الطيران',
  // Home & Garden
  'DIY': 'الصنع بنفسك',
  'Home Improvement': 'تحسين المنزل',
  'Interior Design': 'تصميم الديكور الداخلي',
  'Landscaping': 'تصميم الحدائق',
  'Furniture': 'الأثاث',
  'Tools': 'الأدوات',
  'Renovation': 'التجديد',
  'Smart Home': 'المنزل الذكي',
  'Pets': 'الحيوانات الأليفة',
};

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    interests: [] as string[],
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [detectedCoordinates, setDetectedCoordinates] = useState<[number, number] | null>(null);

  // Load current user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: typeof user.location === 'string' ? user.location : '',
        interests: user.interests || [],
      });
      setProfilePicturePreview(user.profile_picture_url || '');

      // Auto-detect location when modal opens
      detectUserLocation();
    }
  }, [isOpen, user]);

  // Function to detect and set user location
  const detectUserLocation = async () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    setLocationLoading(true);

    try {
      console.log('Requesting location permission and detection...');

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      });

      const { latitude, longitude } = position.coords;
      console.log('Location detected:', latitude, longitude);

      // Store coordinates for later use
      setDetectedCoordinates([latitude, longitude]);

      // Try to reverse geocode to get address
      try {
        const address = await reverseGeocode(latitude, longitude);
        console.log('Address resolved:', address);

        // Update location field with detected address
        setFormData(prev => ({ ...prev, location: address }));
      } catch (geocodeError) {
        console.error('Reverse geocoding failed:', geocodeError);
        // Fallback to coordinates as string
        const coordsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setFormData(prev => ({ ...prev, location: coordsString }));
        console.log('Using coordinates due to geocoding error:', coordsString);
      }
    } catch (error: any) {
      console.error('Location detection failed:', error);
      // Don't show error to user, just leave location field as is
    } finally {
      setLocationLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(user?.profile_picture_url || '');
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let profilePictureUrl = user?.profile_picture_url || '';

      // Upload new profile picture if selected
      if (profilePicture) {
        const uploadResult = await uploadService.uploadProfilePicture(profilePicture, user?.id || 'temp');
        profilePictureUrl = uploadResult.url;
      }

      // Update profile
      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        interests: formData.interests,
        profile_picture_url: profilePictureUrl,
      });

      // Update user location in user_locations table if coordinates were detected
      if (detectedCoordinates && user?.id) {
        try {
          await userLocationService.updateUserLocation(
            user.id,
            detectedCoordinates[0],
            detectedCoordinates[1],
          );
          console.log('User location updated in database');
        } catch (locationError) {
          console.error('Error updating user location:', locationError);
          // Don't fail the save if location update fails
        }
      }

      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
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
                  {t('profile.editProfileModal.title')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  {t('profile.editProfileModal.subtitle')}
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
        <Box p={6} overflowY="auto" maxH="calc(90vh - 200px)">
          <VStack gap={6} align="stretch">
            {/* Profile Picture */}
            <Box textAlign="center">
              <Box position="relative" display="inline-block" mb={4}>
                <Box
                  w="100px"
                  h="100px"
                  borderRadius="50%"
                  border="3px solid"
                  borderColor="gray.200"
                  overflow="hidden"
                  mx="auto"
                >
                  {profilePicturePreview ? (
                    <img
                      src={profilePicturePreview}
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

                {/* Remove button if there's a custom picture */}
                {profilePicturePreview && profilePicturePreview !== user?.profile_picture_url && (
                  <Button
                    aria-label="Remove picture"
                    size="xs"
                    position="absolute"
                    top={2}
                    right={2}
                    borderRadius="full"
                    bg="red.500"
                    color="white"
                    _hover={{ bg: 'red.600' }}
                    onClick={removeProfilePicture}
                    p={1}
                    minW="auto"
                    h="auto"
                  >
                    <X size={12} />
                  </Button>
                )}
              </Box>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                style={{ display: 'none' }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                borderRadius="12px"
                mx="auto"
                display="block"
              >
                <HStack gap={2}>
                  <Camera size={14} />
                  <Text>{t('profile.editProfileModal.changePhoto')}</Text>
                </HStack>
              </Button>
            </Box>

            {/* Name Fields */}
            <VStack gap={4} align="stretch">
              <HStack gap={3} align="stretch">
                <Box flex={1}>
                  <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                    {t('profile.editProfileModal.firstName')}
                  </Text>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder={t('profile.editProfileModal.firstNamePlaceholder')}
                    borderRadius="12px"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                  />
                </Box>
                <Box flex={1}>
                  <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                    {t('profile.editProfileModal.lastName')}
                  </Text>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder={t('profile.editProfileModal.lastNamePlaceholder')}
                    borderRadius="12px"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                  />
                </Box>
              </HStack>

              {/* Email */}
              <Box>
                <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                  {t('profile.editProfileModal.emailAddress')}
                </Text>
                <Input
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('profile.editProfileModal.emailPlaceholder')}
                  type="email"
                  borderRadius="12px"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                />
              </Box>

              {/* Phone */}
              <Box>
                <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                  {t('profile.editProfileModal.phoneNumber')}
                </Text>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={t('profile.editProfileModal.phonePlaceholder')}
                  type="tel"
                  borderRadius="12px"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                />
              </Box>

              {/* Location */}
              <Box>
                <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                  {t('profile.editProfileModal.location')}
                </Text>
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder={t('profile.editProfileModal.locationPlaceholder')}
                  borderRadius="12px"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                />
              </Box>
            </VStack>

            {/* Interests Section */}
            <Box>
              <Text fontSize="14px" fontWeight="600" color="gray.900" mb={3}>
                {t('profile.editProfileModal.interestsTitle')}
              </Text>
              <Text fontSize="12px" color="gray.500" mb={4}>
                {t('profile.editProfileModal.interestsDescription')}
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
                          variant={formData.interests.includes(item) ? 'solid' : 'outline'}
                          size="sm"
                          onClick={() => toggleInterest(item)}
                          borderRadius="16px"
                          fontSize="12px"
                          fontWeight="500"
                          px={3}
                          py={1}
                          h="auto"
                          bg={formData.interests.includes(item) ? 'blue.500' : 'transparent'}
                          color={formData.interests.includes(item) ? 'white' : 'gray.600'}
                          borderColor={formData.interests.includes(item) ? 'blue.500' : 'gray.200'}
                          _hover={{
                            bg: formData.interests.includes(item) ? 'blue.600' : 'gray.50',
                            borderColor: formData.interests.includes(item) ? 'blue.600' : 'gray.300',
                          }}
                        >
                          {INTEREST_TRANSLATIONS[item] || item}
                        </Button>
                      ))}
                    </HStack>
                  </Box>
                ))}
              </VStack>
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
            >
              {t('profile.editProfileModal.cancel')}
            </Button>
            <Button
              flex={1}
              bg="blue.500"
              color="white"
              onClick={handleSave}
              borderRadius="12px"
              _hover={{ bg: 'blue.600' }}
              disabled={isLoading}
            >
              {isLoading ? t('profile.editProfileModal.saving') : t('profile.editProfileModal.saveChanges')}
            </Button>
          </HStack>
        </Box>
      </Box>
    </Box>
  );
};

export default EditProfileModal;
