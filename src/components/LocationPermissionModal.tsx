import React, { useEffect, useRef, useState } from 'react';
import { Box, VStack, HStack, Text, Button } from '@chakra-ui/react';
import { MapPin, X, AlertTriangle } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualLocation: () => void;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onManualLocation,
}) => {
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Focus management and body scroll prevention
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Focus on primary button when modal opens
      setTimeout(() => {
        primaryActionRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Enhanced Try Again logic
  const handleTryAgain = async () => {
    setIsLoading(true);
    onClose();

    try {
      // Modern API with better error handling
      if ('permissions' in navigator && 'geolocation' in navigator) {
        const permissionStatus = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });

        if (permissionStatus.state === 'prompt') {
          // Get location with proper error handling
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Location granted:', position);
              window.location.reload();
            },
            (error) => {
              console.error('Location error:', error);
              setIsLoading(false);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            },
          );
        } else {
          setIsLoading(false);
        }
      } else {
        // Fallback for browsers without Permissions API
        console.warn('Permissions API not supported');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setIsLoading(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
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
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
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
              <Box w="10" h="10" borderRadius="8px" bg="red.100" display="flex" alignItems="center" justifyContent="center">
                <AlertTriangle size={16} color="#dc2626" />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="18px" fontWeight="700" color="gray.900">
                  Location Access Required
                </Text>
                <Text fontSize="12px" color="gray.600">
                  Enable location to see nearby safety reports
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
            {/* Why we need location */}
            <Box p={4} bg="blue.50" borderRadius="12px" border="1px solid" borderColor="blue.200">
              <Text fontSize="16px" fontWeight="600" color="blue.900" mb={3}>
                Why we need your location:
              </Text>
              <VStack align="start" gap={2}>
                <Text fontSize="14px" color="blue.800">• Show safety reports near you</Text>
                <Text fontSize="14px" color="blue.800">• Help others find your reports</Text>
                <Text fontSize="14px" color="blue.800">• Provide location-based alerts</Text>
                <Text fontSize="14px" color="blue.800">• Improve community safety mapping</Text>
              </VStack>
            </Box>

            {/* How to enable location */}
            <Box p={4} bg="orange.50" borderRadius="12px" border="1px solid" borderColor="orange.200">
              <Text fontSize="16px" fontWeight="600" color="orange.900" mb={3}>
                How to enable location:
              </Text>
              <VStack align="start" gap={2}>
                <Text fontSize="14px" color="orange.800">
                  <strong>iOS:</strong> Settings → Privacy → Location Services → Safari → Allow
                </Text>
                <Text fontSize="14px" color="orange.800">
                  <strong>Android:</strong> Settings → Apps → [Browser] → Permissions → Location → Allow
                </Text>
                <Text fontSize="14px" color="orange.800">
                  <strong>Desktop:</strong> Click the location icon in your browser's address bar
                </Text>
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
          <VStack gap={3}>
            <Button
              ref={primaryActionRef}
              w="full"
              bg="blue.500"
              color="white"
              onClick={onManualLocation}
              borderRadius="12px"
              _hover={{ bg: 'blue.600' }}
            >
              Set Location Manually
            </Button>

            <Button
              w="full"
              variant="outline"
              onClick={onClose}
              borderRadius="12px"
              border="1px solid"
              borderColor="gray.200"
            >
              Continue Without Location
            </Button>

            <Button
              w="full"
              variant="ghost"
              onClick={handleTryAgain}
              borderRadius="12px"
              disabled={isLoading}
              color="blue.500"
              _hover={{ bg: 'blue.50' }}
            >
              {isLoading ? 'Trying...' : 'Try Again'}
            </Button>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(LocationPermissionModal, (prevProps, nextProps) => {
  return prevProps.isOpen === nextProps.isOpen;
});
