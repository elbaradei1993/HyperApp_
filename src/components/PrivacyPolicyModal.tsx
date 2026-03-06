import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, IconButton } from '@chakra-ui/react';
import { FileText, X } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const { t } = useTranslation();

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
                  {t('privacy.title')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  {t('privacy.subtitle', 'How we protect your data and privacy')}
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
            {/* Key Privacy Points */}
            <VStack gap={4} align="stretch">
              <Box p={4} bg="blue.50" borderRadius="12px" border="1px solid" borderColor="blue.200">
                <Text fontSize="16px" fontWeight="600" color="blue.900" mb={2}>
                  🔒 {t('privacy.dataProtectionTitle', 'Data Protection')}
                </Text>
                <Text fontSize="14px" color="blue.800">
                  {t('privacy.dataProtectionDesc', 'We use end-to-end encryption and strict security measures to protect your personal information and community safety data.')}
                </Text>
              </Box>

              <Box p={4} bg="green.50" borderRadius="12px" border="1px solid" borderColor="green.200">
                <Text fontSize="16px" fontWeight="600" color="green.900" mb={2}>
                  📍 {t('privacy.locationPrivacyTitle', 'Location Privacy')}
                </Text>
                <Text fontSize="14px" color="green.800">
                  {t('privacy.locationPrivacyDesc', 'Your location data is only used to provide community safety insights and is never sold to third parties.')}
                </Text>
              </Box>

              <Box p={4} bg="purple.50" borderRadius="12px" border="1px solid" borderColor="purple.200">
                <Text fontSize="16px" fontWeight="600" color="purple.900" mb={2}>
                  👥 {t('privacy.communityDataTitle', 'Community Data')}
                </Text>
                <Text fontSize="14px" color="purple.800">
                  {t('privacy.communityDataDesc', 'Safety reports are aggregated and anonymized to provide community insights while protecting individual privacy.')}
                </Text>
              </Box>

              <Box p={4} bg="orange.50" borderRadius="12px" border="1px solid" borderColor="orange.200">
                <Text fontSize="16px" fontWeight="600" color="orange.900" mb={2}>
                  ⚖️ {t('privacy.userRightsTitle', 'Your Rights')}
                </Text>
                <Text fontSize="14px" color="orange.800">
                  {t('privacy.userRightsDesc', 'You have the right to access, update, or delete your personal data. Contact us to exercise your privacy rights.')}
                </Text>
              </Box>
            </VStack>

            {/* Full Policy Note */}
            <Box p={4} bg="gray.50" borderRadius="12px" textAlign="center">
              <Text fontSize="14px" color="gray.700">
                {t('privacy.fullPolicyNote', 'For complete details, please visit our website to read the full Privacy Policy.')}
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
            >
              {t('common.close', 'Close')}
            </Button>
            <Button
              flex={1}
              bg="blue.500"
              color="white"
              onClick={() => {
                onAccept?.();
                onClose();
              }}
              borderRadius="12px"
              _hover={{ bg: 'blue.600' }}
            >
              {t('privacy.acceptButton', 'Accept Privacy Policy')}
            </Button>
          </HStack>
        </Box>
      </Box>
    </Box>
  );
};

export default PrivacyPolicyModal;
