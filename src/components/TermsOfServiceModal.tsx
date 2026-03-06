import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button } from '@chakra-ui/react';
import { FileText, X, Shield, Users, AlertTriangle } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
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
                  {t('terms.title')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  {t('terms.subtitle', 'Guidelines for using our community safety platform')}
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
            {/* Key Terms Points */}
            <VStack gap={4} align="stretch">
              <Box p={4} bg="blue.50" borderRadius="12px" border="1px solid" borderColor="blue.200">
                <Text fontSize="16px" fontWeight="600" color="blue.900" mb={2}>
                  🛡️ {t('terms.communitySafetyTitle', 'Community Safety First')}
                </Text>
                <Text fontSize="14px" color="blue.800">
                  {t('terms.communitySafetyDesc', 'Use HyperApp responsibly to help keep your community safe. Report accurate information and respect others.')}
                </Text>
              </Box>

              <Box p={4} bg="green.50" borderRadius="12px" border="1px solid" borderColor="green.200">
                <Text fontSize="16px" fontWeight="600" color="green.900" mb={2}>
                  👥 {t('terms.respectTitle', 'Respect & Responsibility')}
                </Text>
                <Text fontSize="14px" color="green.800">
                  {t('terms.respectDesc', 'Be respectful to all community members. Do not harass, threaten, or post inappropriate content.')}
                </Text>
              </Box>

              <Box p={4} bg="orange.50" borderRadius="12px" border="1px solid" borderColor="orange.200">
                <Text fontSize="16px" fontWeight="600" color="orange.900" mb={2}>
                  🚨 {t('terms.emergencyNoticeTitle', 'Emergency Services Notice')}
                </Text>
                <Text fontSize="14px" color="orange.800">
                  {t('terms.emergencyNoticeDesc', 'HyperApp is not a replacement for emergency services. Call 911 or local emergency numbers for immediate help.')}
                </Text>
              </Box>

              <Box p={4} bg="purple.50" borderRadius="12px" border="1px solid" borderColor="purple.200">
                <Text fontSize="16px" fontWeight="600" color="purple.900" mb={2}>
                  ⚖️ {t('terms.accountContentTitle', 'Account & Content')}
                </Text>
                <Text fontSize="14px" color="purple.800">
                  {t('terms.accountContentDesc', 'You own your content but grant us permission to display it. Keep your account secure and information accurate.')}
                </Text>
              </Box>
            </VStack>

            {/* Important Notice */}
            <Box p={4} bg="red.50" borderRadius="12px" border="1px solid" borderColor="red.200">
              <HStack gap={3} align="start">
                <AlertTriangle size={20} color="#dc2626" />
                <Box>
                  <Text fontSize="16px" fontWeight="600" color="red.900" mb={2}>
                    {t('terms.criticalSafetyTitle', 'Critical Safety Notice')}
                  </Text>
                  <Text fontSize="14px" color="red.800">
                    {t('terms.criticalSafetyDesc', 'HyperApp provides community safety information but cannot guarantee response times or emergency assistance. Always contact professional emergency services directly in dangerous situations.')}
                  </Text>
                </Box>
              </HStack>
            </Box>

            {/* Full Terms Link */}
            <Box p={4} bg="gray.50" borderRadius="12px" textAlign="center">
              <Text fontSize="14px" color="gray.700">
                {t('terms.fullTermsNote', 'For complete terms and conditions, please visit our website to read the full Terms of Service.')}
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
              {t('terms.acceptButton', 'Accept Terms')}
            </Button>
          </HStack>
        </Box>
      </Box>
    </Box>
  );
};

export default TermsOfServiceModal;
