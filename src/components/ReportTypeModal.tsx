import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, VStack, HStack, Text, Button, IconButton } from '@chakra-ui/react';
import { FileText, X, Smile, AlertTriangle } from 'lucide-react';

interface ReportTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVibe: () => void;
  onSelectEmergency: () => void;
}

const ReportTypeModal: React.FC<ReportTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectVibe,
  onSelectEmergency,
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
              <Box w="10" h="10" borderRadius="8px" bg="blue.100" display="flex" alignItems="center" justifyContent="center">
                <FileText size={16} color="#2563eb" />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="18px" fontWeight="700" color="gray.900">
                  {t('modals.reportType.title')}
                </Text>
                <Text fontSize="12px" color="gray.600">
                  {t('modals.reportType.subtitle')}
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
        <Box p={6}>
          <VStack gap={4} align="stretch">
            {/* Vibe Report Option */}
            <Box
              onClick={() => {
                onClose();
                onSelectVibe();
              }}
              p={6}
              borderRadius="16px"
              border="2px solid"
              borderColor="gray.200"
              bg="white"
              cursor="pointer"
              transition="all 0.2s"
              textAlign="center"
              position="relative"
              overflow="hidden"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.15)',
                borderColor: 'blue.300',
              }}
            >
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                height="4px"
                bg="linear-gradient(90deg, #3b82f6, #8b5cf6)"
                transform="scaleX(0)"
                transition="transform 0.3s ease"
                _groupHover={{ transform: 'scaleX(1)' }}
              />
              <Box
                w="16"
                h="16"
                borderRadius="full"
                bg="linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
                mb={4}
                boxShadow="0 8px 20px rgba(0, 0, 0, 0.1)"
              >
                <Smile size={32} color="#1d4ed8" />
              </Box>
              <Text fontSize="18px" fontWeight="700" color="gray.900">
                {t('modals.reportType.vibe')}
              </Text>
              <Text fontSize="14px" color="gray.600" mt={1}>
                {t('modals.reportType.vibeDesc')}
              </Text>
            </Box>

            {/* Emergency Report Option */}
            <Box
              onClick={() => {
                onClose();
                onSelectEmergency();
              }}
              p={6}
              borderRadius="16px"
              border="2px solid"
              borderColor="gray.200"
              bg="white"
              cursor="pointer"
              transition="all 0.2s"
              textAlign="center"
              position="relative"
              overflow="hidden"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(239, 68, 68, 0.15)',
                borderColor: 'red.300',
              }}
            >
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                height="4px"
                bg="linear-gradient(90deg, #ef4444, #dc2626)"
                transform="scaleX(0)"
                transition="transform 0.3s ease"
                _groupHover={{ transform: 'scaleX(1)' }}
              />
              <Box
                w="16"
                h="16"
                borderRadius="full"
                bg="linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
                mb={4}
                boxShadow="0 8px 20px rgba(0, 0, 0, 0.1)"
              >
                <AlertTriangle size={32} color="#dc2626" />
              </Box>
              <Text fontSize="18px" fontWeight="700" color="gray.900">
                {t('modals.reportType.emergency')}
              </Text>
              <Text fontSize="14px" color="gray.600" mt={1}>
                {t('modals.reportType.emergencyDesc')}
              </Text>
            </Box>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(ReportTypeModal);
