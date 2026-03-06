import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, Input } from '@chakra-ui/react';
import { MapPin, X } from 'lucide-react';

interface LocationOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSet: (location: [number, number]) => void;
  currentLocation?: [number, number] | null;
}

const LocationOverrideModal: React.FC<LocationOverrideModalProps> = ({
  isOpen,
  onClose,
  onLocationSet,
  currentLocation,
}) => {
  const { t } = useTranslation();
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentLocations, setRecentLocations] = useState<Array<{name: string, lat: number, lng: number, timestamp: number}>>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstLocationButtonRef = useRef<HTMLButtonElement>(null);

  // Load recent locations on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentLocations');
    if (saved) {
      try {
        setRecentLocations(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to parse recent locations:', e);
      }
    }
  }, []);

  // Focus management and body scroll prevention
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Focus on first location button
      setTimeout(() => {
        firstLocationButtonRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const commonLocations = [
    { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357 },
    { name: 'Alexandria, Egypt', lat: 31.2001, lng: 29.9187 },
    { name: 'Giza, Egypt', lat: 30.0131, lng: 31.2089 },
    { name: 'Luxor, Egypt', lat: 25.6872, lng: 32.6396 },
    { name: 'Aswan, Egypt', lat: 24.0889, lng: 32.8998 },
    { name: 'Sharm El Sheikh, Egypt', lat: 27.9158, lng: 34.3299 },
    { name: 'Hurghada, Egypt', lat: 27.2579, lng: 33.8116 },
  ];

  // Simple validation
  const validateCoordinates = (lat: string, lng: string): boolean => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (lat === '' || lng === '') {
      setError('Both latitude and longitude are required');
      return false;
    }

    if (isNaN(latNum) || isNaN(lngNum)) {
      setError('Please enter valid numbers for coordinates');
      return false;
    }

    if (latNum < -90 || latNum > 90) {
      setError('Latitude must be between -90 and 90 degrees');
      return false;
    }

    if (lngNum < -180 || lngNum > 180) {
      setError('Longitude must be between -180 and 180 degrees');
      return false;
    }

    setError(null);
    return true;
  };

  const handleManualSubmit = async () => {
    if (!validateCoordinates(manualLat, manualLng)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);

      onLocationSet([lat, lng]);
      onClose();
    } catch (err) {
      setError('Failed to set location. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSelect = (location: { name: string; lat: number; lng: number }) => {
    // Add to recent locations
    const newRecent = [
      { ...location, timestamp: Date.now() },
      ...recentLocations.filter(loc =>
        loc.lat !== location.lat || loc.lng !== location.lng,
      ).slice(0, 4), // Keep only 5 most recent
    ];

    setRecentLocations(newRecent);
    localStorage.setItem('recentLocations', JSON.stringify(newRecent));

    onLocationSet([location.lat, location.lng]);
    onClose();
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
      onClick={onClose}
    >
      <Box
        ref={modalRef}
        bg="white"
        borderRadius="20px"
        maxW="500px"
        w="full"
        maxH="90vh"
        overflow="hidden"
        boxShadow="0 20px 25px rgba(0, 0, 0, 0.1)"
        onClick={(e) => e.stopPropagation()}
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
                <MapPin size={16} color="#2563eb" />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="18px" fontWeight="700" color="gray.900">
                  {t('locationModal.title', 'Set Your Location')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  Choose your location from the options below
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
            {/* Description */}
            <Text fontSize="14px" color="gray.600">
              GPS location is unavailable. Choose your location from the options below or enter coordinates manually.
            </Text>

            {currentLocation && (
              <Box
                p={4}
                bg="blue.50"
                borderRadius="12px"
                border="1px solid"
                borderColor="blue.200"
              >
                <Text fontSize="14px" fontWeight="600" color="blue.900" mb={1}>
                  Current Location (IP-based)
                </Text>
                <Text fontSize="12px" color="blue.800">
                  {currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}
                </Text>
              </Box>
            )}

            {/* Recent Locations */}
            {recentLocations.length > 0 && (
              <Box>
                <Text fontSize="16px" fontWeight="600" color="gray.900" mb={4}>
                  Recent Locations
                </Text>
                <VStack gap={2} align="stretch">
                  {recentLocations.slice(0, 3).map((location, index) => (
                    <Button
                      key={`recent-${location.timestamp}`}
                      ref={index === 0 ? firstLocationButtonRef : undefined}
                      onClick={() => handleLocationSelect(location)}
                      variant="outline"
                      borderRadius="12px"
                      p={4}
                      h="auto"
                      justifyContent="flex-start"
                      _hover={{ bg: 'blue.50', borderColor: 'blue.300' }}
                    >
                      <VStack align="start" gap={1} w="full">
                        <Text fontSize="14px" fontWeight="600" color="gray.900">
                          {location.name}
                        </Text>
                        <Text fontSize="12px" color="gray.600">
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </Text>
                      </VStack>
                    </Button>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Common Locations */}
            <Box>
              <Text fontSize="16px" fontWeight="600" color="gray.900" mb={4}>
                Popular Locations
              </Text>
              <VStack gap={2} align="stretch">
                {commonLocations.map((location, index) => (
                  <Button
                    key={index}
                    ref={!recentLocations.length && index === 0 ? firstLocationButtonRef : undefined}
                    onClick={() => handleLocationSelect(location)}
                    variant="outline"
                    borderRadius="12px"
                    p={4}
                    h="auto"
                    justifyContent="flex-start"
                    _hover={{ bg: 'blue.50', borderColor: 'blue.300' }}
                  >
                    <VStack align="start" gap={1} w="full">
                      <Text fontSize="14px" fontWeight="600" color="gray.900">
                        {location.name}
                      </Text>
                      <Text fontSize="12px" color="gray.600">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </Text>
                    </VStack>
                  </Button>
                ))}
              </VStack>
            </Box>

            {/* Manual Coordinates */}
            <Box>
              <Text fontSize="16px" fontWeight="600" color="gray.900" mb={4}>
                Enter Coordinates Manually
              </Text>

              <HStack gap={3} align="stretch" mb={4}>
                <Box flex={1}>
                  <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                    Latitude (-90 to 90)
                  </Text>
                  <Input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="30.0444"
                    borderRadius="12px"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                  />
                </Box>
                <Box flex={1}>
                  <Text fontSize="12px" fontWeight="600" color="gray.700" mb={2}>
                    Longitude (-180 to 180)
                  </Text>
                  <Input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="31.2357"
                    borderRadius="12px"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3b82f6' }}
                  />
                </Box>
              </HStack>

              {/* Error display */}
              {error && (
                <Box
                  p={3}
                  bg="red.50"
                  borderRadius="12px"
                  border="1px solid"
                  borderColor="red.200"
                  mb={4}
                >
                  <Text fontSize="14px" color="red.800">
                    {error}
                  </Text>
                </Box>
              )}

              <Button
                onClick={handleManualSubmit}
                disabled={(!manualLat || !manualLng) || isSubmitting}
                bg={(!manualLat || !manualLng) || isSubmitting ? 'gray.400' : 'blue.500'}
                color="white"
                borderRadius="12px"
                w="full"
                _hover={{ bg: (!manualLat || !manualLng) || isSubmitting ? 'gray.500' : 'blue.600' }}
                mb={4}
              >
                {isSubmitting ? (
                  <HStack gap={2}>
                    <Box
                      w="4"
                      h="4"
                      border="2px solid"
                      borderColor="whiteAlpha.300"
                      borderTopColor="white"
                      borderRadius="full"
                      animation="spin 1s linear infinite"
                    />
                    <Text>Setting Location...</Text>
                  </HStack>
                ) : (
                  'Set Custom Location'
                )}
              </Button>
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
          <Button
            onClick={onClose}
            variant="outline"
            borderRadius="12px"
            w="full"
            border="1px solid"
            borderColor="gray.200"
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LocationOverrideModal;
