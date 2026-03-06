import React, { useEffect, useState } from 'react';
import { Box, Text, VStack, Button as ChakraButton, Image } from '@chakra-ui/react';
import { motion, Variants } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';

interface LanguageSelectionScreenProps {
  onLanguageSelect: (language: 'en' | 'ar' | 'fr') => void;
}

const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({ onLanguageSelect }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1.2,
        ease: [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.15,
      },
    },
  };

  const logoVariants: Variants = {
    hidden: { opacity: 0, y: -50, rotate: -10 },
    visible: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, x: -50, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: i * 0.1,
      },
    }),
    hover: {
      scale: 1.08,
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 30px rgba(255, 255, 255, 0.1)',
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 },
    },
  };

  return (
    <Box
      minH="100vh"
      position="relative"
      overflow="hidden"
      bg="radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #1a1a2e 75%, #16213e 100%)"
    >
      {/* Dynamic background with mouse tracking */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg={`radial-gradient(circle at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, rgba(120, 119, 198, 0.3) 0%, rgba(255, 177, 153, 0.2) 25%, rgba(56, 178, 172, 0.1) 50%, transparent 70%)`}
        transition="all 0.3s ease"
      />

      {/* Animated mesh gradient background */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="linear-gradient(45deg, rgba(120, 119, 198, 0.1) 0%, rgba(255, 177, 153, 0.1) 50%, rgba(56, 178, 172, 0.1) 100%)"
        opacity="0.6"
        animation="gradientShift 8s ease-in-out infinite"
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <Box
          key={i}
          position="absolute"
          w={`${Math.random() * 4 + 2}px`}
          h={`${Math.random() * 4 + 2}px`}
          bg="rgba(255, 255, 255, 0.6)"
          borderRadius="50%"
          top={`${Math.random() * 100}%`}
          left={`${Math.random() * 100}%`}
          animation={`floatParticle ${Math.random() * 10 + 10}s linear infinite`}
          style={{
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      {/* Main content */}
      <Box
        position="relative"
        zIndex="10"
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ width: '100%', maxWidth: '450px' }}
        >
          <VStack w="full" align="center" gap={[8, 12]}>
            {/* Premium Logo Section */}
            <motion.div variants={logoVariants}>
              <VStack align="center" gap={[3, 4]}>
                {/* Icon with glow effect */}
                <Box position="relative">
                  <Box
                    w={{ base: '80px', md: '120px' }}
                    h={{ base: '80px', md: '120px' }}
                    bg="linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))"
                    borderRadius="30px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    backdropFilter="blur(25px)"
                    border="1px solid rgba(255, 255, 255, 0.3)"
                    boxShadow="0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                    position="relative"
                    overflow="hidden"
                    p={2}
                  >
                    {/* Inner glow */}
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      w={{ base: '50px', md: '80px' }}
                      h={{ base: '50px', md: '80px' }}
                      bg="radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)"
                      borderRadius="50%"
                    />
                    <Image
                      src="/hyperapp-logo.png"
                      alt="HyperApp Logo"
                      w={{ base: '50px', md: '80px' }}
                      h={{ base: '50px', md: '80px' }}
                      borderRadius="20px"
                      objectFit="cover"
                      position="relative"
                      zIndex="1"
                      boxShadow="0 8px 24px rgba(0, 0, 0, 0.2)"
                    />
                  </Box>

                  {/* Sparkle effects */}
                  <Sparkles
                    size={16}
                    color="rgba(255, 255, 255, 0.8)"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      animation: 'sparkle 2s ease-in-out infinite',
                    }}
                  />
                </Box>

                {/* Title with premium typography */}
                <VStack align="center" gap={1}>
                  <Text
                    fontSize={{ base: '2xl', md: '4xl' }}
                    fontWeight="800"
                    color="white"
                    textAlign="center"
                    textShadow="0 4px 8px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1)"
                    letterSpacing="-1px"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    HyperApp
                  </Text>
                  <Text
                    fontSize={{ base: 'xs', md: 'sm' }}
                    color="rgba(255, 255, 255, 0.7)"
                    textAlign="center"
                    fontWeight="500"
                    letterSpacing="0.5px"
                  >
                    Stay Safe...Stay Connected
                  </Text>
                </VStack>
              </VStack>
            </motion.div>

            {/* Language Selection */}
            <motion.div variants={titleVariants}>
              <VStack w="full" align="center" gap={[6, 8]}>
                <Text
                  fontSize={{ base: 'md', md: 'xl' }}
                  fontWeight="600"
                  color="white"
                  textAlign="center"
                  opacity={0.95}
                  textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                >
                  Choose your language
                  {/* Mobile responsive update */}
                </Text>

                <VStack w="full" maxW="320px" gap={{ base: 3, md: 5 }}>
                  {[
                    { code: 'en' as const, label: 'English', flag: '🇨🇦' },
                    { code: 'fr' as const, label: 'Français', flag: '🇨🇦' },
                    { code: 'ar' as const, label: 'العربية', flag: '🌍' },
                  ].map(({ code, label, flag }, i) => (
                    <motion.div
                      key={code}
                      custom={i}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      style={{ width: '100%' }}
                    >
                      <ChakraButton
                        onClick={() => onLanguageSelect(code)}
                        w="full"
                        h={{ base: '50px', md: '70px' }}
                        bg="linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))"
                        backdropFilter="blur(30px)"
                        border="1px solid rgba(255, 255, 255, 0.25)"
                        borderRadius="20px"
                        color="white"
                        fontSize={{ base: 'sm', md: 'lg' }}
                        fontWeight="700"
                        letterSpacing="0.5px"
                        _hover={{
                          bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.2))',
                          borderColor: 'rgba(255, 255, 255, 0.4)',
                        }}
                        _active={{
                          bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))',
                        }}
                        transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        px={{ base: 4, md: 8 }}
                        boxShadow="0 15px 35px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                        position="relative"
                        overflow="hidden"
                      >
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          right="0"
                          bottom="0"
                          bg="linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%)"
                          opacity="0"
                          transition="opacity 0.3s ease"
                          _groupHover={{ opacity: 1 }}
                        />
                        <Text fontSize={{ base: 'sm', md: 'lg' }} fontWeight="700" zIndex="1">
                          {flag} {label}
                        </Text>
                        <ChevronRight size={18} style={{ zIndex: 1 }} />
                      </ChakraButton>
                    </motion.div>
                  ))}
                </VStack>
              </VStack>
            </motion.div>
          </VStack>
        </motion.div>
      </Box>

      <style>
        {`
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }

          @keyframes floatParticle {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
          }

          @keyframes sparkle {
            0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
            50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
          }
        `}
      </style>
    </Box>
  );
};

export default LanguageSelectionScreen;
