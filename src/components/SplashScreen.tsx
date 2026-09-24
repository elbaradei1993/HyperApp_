import React, { useState, useEffect } from 'react';
import { Box, Text, Image } from '@chakra-ui/react';
import styles from './SplashScreen.module.css';

const STATUS_MESSAGES = [
  'Initializing safety systems',
  'Connecting to community network',
  'Securing your location',
];

const SplashScreen: React.FC = () => {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      className={styles.splash}
      role="status"
      aria-label="Loading HyperApp"
      display="flex"
      alignItems="center"
      justifyContent="center"
      height="100dvh"
      bg="radial-gradient(120% 90% at 50% 10%, #e8f1fe 0%, #f7faff 55%, #ffffff 100%)"
    >
      <Box textAlign="center" px={6} className={styles.fadeUp}>
        <Box position="relative" display="inline-block" mb={6}>
          <Box className={styles.logoGlow} aria-hidden="true" />
          <Image
            src="/hyperapp-logo.png"
            alt="HyperApp"
            boxSize="96px"
            borderRadius="24px"
            position="relative"
            boxShadow="0 12px 32px rgba(37, 99, 235, 0.28)"
          />
        </Box>

        <Text
          fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
          fontSize="2.5rem"
          fontWeight={800}
          letterSpacing="-0.03em"
          color="gray.900"
          lineHeight={1.1}
        >
          HyperApp
        </Text>
        <Text
          fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
          fontSize="1rem"
          color="gray.500"
          mt={2}
          letterSpacing="0.01em"
        >
          Stay safe. Stay connected.
        </Text>

        <Box
          mt={10}
          mx="auto"
          maxW="280px"
          bg="white"
          borderRadius="full"
          px={5}
          py={2.5}
          boxShadow="0 4px 16px rgba(15, 40, 90, 0.08)"
          border="1px solid"
          borderColor="gray.100"
        >
          <Text
            key={statusIndex}
            className={styles.statusText}
            fontSize="0.8rem"
            color="gray.600"
            fontWeight={500}
          >
            {STATUS_MESSAGES[statusIndex]}
          </Text>
          <Box
            mt={2}
            height="3px"
            borderRadius="full"
            bg="gray.100"
            overflow="hidden"
          >
            <Box
              key={`bar-${statusIndex}`}
              className={styles.progressBar}
              height="100%"
              borderRadius="full"
              bg="#3b82f6"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SplashScreen;
