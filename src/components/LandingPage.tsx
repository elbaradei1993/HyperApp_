import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Text, Button, Image, SimpleGrid, VStack, HStack } from '@chakra-ui/react';
import { Megaphone, Map, ShieldCheck, ArrowRight } from 'lucide-react';
import styles from './LandingPage.module.css';

interface LandingPageProps {
  onSignIn: () => void;
  onJoin: () => void;
}

const VALUE_PROPS = [
  {
    icon: Megaphone,
    titleKey: 'landing.reportTitle',
    bodyKey: 'landing.reportBody',
  },
  {
    icon: Map,
    titleKey: 'landing.mapTitle',
    bodyKey: 'landing.mapBody',
  },
  {
    icon: ShieldCheck,
    titleKey: 'landing.guardianTitle',
    bodyKey: 'landing.guardianBody',
  },
] as const;

const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onJoin }) => {
  const { t } = useTranslation();

  return (
    <Box className={styles.page}>
      {/* Hero */}
      <Box as="section" className={styles.hero}>
        <VStack gap={5} maxW="720px" mx="auto" px={6} textAlign="center">
          <Image
            src="/hyperapp-logo.png"
            alt="HyperApp"
            boxSize="72px"
            borderRadius="20px"
            boxShadow="0 10px 28px rgba(37, 99, 235, 0.25)"
            className={styles.heroLogo}
          />
          <Text className={styles.eyebrow}>{t('landing.eyebrow')}</Text>
          <Text as="h1" className={styles.headline}>
            {t('landing.headline')}
          </Text>
          <Text className={styles.subhead}>{t('landing.subhead')}</Text>
          <HStack gap={3} mt={2} flexWrap="wrap" justify="center">
            <Button
              size="lg"
              bg="#3b82f6"
              color="white"
              borderRadius="full"
              px={8}
              _hover={{ bg: '#2563eb' }}
              _active={{ bg: '#1d4ed8' }}
              onClick={onJoin}
            >
              {t('landing.joinCta')} <ArrowRight size={18} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              borderRadius="full"
              px={8}
              borderColor="#bfdbfe"
              color="#1d4ed8"
              _hover={{ bg: '#eff6ff' }}
              onClick={onSignIn}
            >
              {t('auth.signIn')}
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Value props */}
      <Box as="section" maxW="1080px" mx="auto" px={6} pb={16}>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={5}>
          {VALUE_PROPS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <Box key={titleKey} className={styles.card}>
              <Box className={styles.cardIcon}>
                <Icon size={22} color="#2563eb" />
              </Box>
              <Text fontWeight={700} fontSize="1.05rem" color="gray.900" mb={2}>
                {t(titleKey)}
              </Text>
              <Text fontSize="0.95rem" color="gray.600" lineHeight={1.6}>
                {t(bodyKey)}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        {/* Privacy note */}
        <Box className={styles.privacyNote}>
          <ShieldCheck size={18} color="#2563eb" />
          <Text fontSize="0.9rem" color="gray.600">
            {t('landing.privacyNote')}
          </Text>
        </Box>

        {/* Final CTA */}
        <VStack gap={4} mt={14} textAlign="center">
          <Text fontWeight={800} fontSize="1.5rem" color="gray.900" letterSpacing="-0.01em">
            {t('landing.finalHeadline')}
          </Text>
          <Button
            size="lg"
            bg="#3b82f6"
            color="white"
            borderRadius="full"
            px={10}
            _hover={{ bg: '#2563eb' }}
            _active={{ bg: '#1d4ed8' }}
            onClick={onJoin}
          >
            {t('landing.joinCta')} <ArrowRight size={18} />
          </Button>
        </VStack>
      </Box>

      {/* Footer */}
      <Box as="footer" className={styles.footer}>
        <Text fontSize="0.85rem" color="gray.500">
          HyperApp — {t('landing.tagline')}
        </Text>
      </Box>
    </Box>
  );
};

export default LandingPage;
