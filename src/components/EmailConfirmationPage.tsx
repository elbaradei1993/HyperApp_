import React, { useEffect, useState } from 'react';
import { Box, Text, VStack, Button as ChakraButton } from '@chakra-ui/react';
import { motion, Variants } from 'framer-motion';
import { Mail, CheckCircle, RefreshCw, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

interface EmailConfirmationPageProps {}

const EmailConfirmationPage: React.FC<EmailConfirmationPageProps> = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [email, setEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Get email from URL params or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('pendingVerificationEmail', emailParam);
    } else {
      const storedEmail = localStorage.getItem('pendingVerificationEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, []);

  // Mouse tracking for dynamic background
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

  // Check if user is already verified
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      setIsVerified(true);
      // Clear stored email
      localStorage.removeItem('pendingVerificationEmail');
      // Redirect after showing success
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }
  }, [user, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (isResending || resendCooldown > 0) {
      return;
    }

    setIsResending(true);
    try {
      // Note: Supabase doesn't have a direct resend method, but we can show the UI
      // In a real implementation, you'd call a backend function to resend
      console.log('Resending verification email to:', email);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      console.error('Error resending verification:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleContinueToApp = () => {
    navigate('/');
  };

  const handleUseDifferentEmail = () => {
    localStorage.removeItem('pendingVerificationEmail');
    signOut();
    navigate('/');
  };

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

  const contentVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: i * 0.1,
      },
    }),
    hover: {
      scale: 1.05,
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 30px rgba(59, 130, 246, 0.3)',
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 },
    },
  };

  if (isVerified) {
    return (
      <Box
        minH="100vh"
        position="relative"
        overflow="hidden"
        bg="radial-gradient(ellipse at center, #10b981 0%, #059669 25%, #047857 50%, #065f46 75%, #064e3b 100%)"
      >
        {/* Success background */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg={`radial-gradient(circle at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, rgba(16, 185, 129, 0.4) 0%, rgba(5, 150, 105, 0.3) 25%, rgba(4, 120, 87, 0.2) 50%, transparent 70%)`}
          transition="all 0.3s ease"
        />

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
            style={{ width: '100%', maxWidth: '500px' }}
          >
            <VStack w="full" align="center" gap={8}>
              <motion.div variants={logoVariants}>
                <VStack align="center" gap={4}>
                  <Box position="relative">
                    <Box
                      w={{ base: '100px', md: '140px' }}
                      h={{ base: '100px', md: '140px' }}
                      bg="linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.2))"
                      borderRadius="30px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      backdropFilter="blur(25px)"
                      border="1px solid rgba(255, 255, 255, 0.4)"
                      boxShadow="0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                      position="relative"
                      overflow="hidden"
                    >
                      <CheckCircle size={60} color="white" />
                    </Box>
                  </Box>

                  <VStack align="center" gap={2}>
                    <Text
                      fontSize={{ base: '2xl', md: '3xl' }}
                      fontWeight="800"
                      color="white"
                      textAlign="center"
                      textShadow="0 4px 8px rgba(0, 0, 0, 0.4)"
                      letterSpacing="-1px"
                    >
                      {t('auth.emailVerified', 'Email Verified!')}
                    </Text>
                    <Text
                      fontSize={{ base: 'md', md: 'lg' }}
                      color="rgba(255, 255, 255, 0.9)"
                      textAlign="center"
                      fontWeight="500"
                    >
                      {t('auth.verificationSuccess', 'Your email has been successfully verified. Redirecting to the app...')}
                    </Text>
                  </VStack>
                </VStack>
              </motion.div>
            </VStack>
          </motion.div>
        </Box>
      </Box>
    );
  }

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
      {[...Array(8)].map((_, i) => (
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
          style={{ width: '100%', maxWidth: '500px' }}
        >
          <VStack w="full" align="center" gap={[6, 8]}>
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
                    <Mail size={48} color="white" />
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
                    {t('auth.checkYourEmail', 'Check Your Email')}
                  </Text>
                  <Text
                    fontSize={{ base: 'xs', md: 'sm' }}
                    color="rgba(255, 255, 255, 0.7)"
                    textAlign="center"
                    fontWeight="500"
                    letterSpacing="0.5px"
                  >
                    {t('auth.verificationSent', 'We sent a verification link to your email')}
                  </Text>
                </VStack>
              </VStack>
            </motion.div>

            {/* Email Confirmation Content */}
            <motion.div variants={contentVariants}>
              <VStack w="full" align="center" gap={6}>
                {/* Email Display */}
                <Box
                  bg="linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1))"
                  backdropFilter="blur(20px)"
                  border="1px solid rgba(255, 255, 255, 0.2)"
                  borderRadius="20px"
                  p={6}
                  w="full"
                  textAlign="center"
                  boxShadow="0 15px 35px rgba(0, 0, 0, 0.2)"
                >
                  <Text
                    fontSize="lg"
                    fontWeight="600"
                    color="white"
                    mb={2}
                  >
                    {t('auth.verificationSentTo', 'Verification sent to:')}
                  </Text>
                  <Text
                    fontSize="xl"
                    fontWeight="700"
                    color="white"
                    textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                  >
                    {email}
                  </Text>
                </Box>

                {/* Instructions */}
                <Box
                  bg="linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))"
                  backdropFilter="blur(20px)"
                  border="1px solid rgba(255, 255, 255, 0.15)"
                  borderRadius="20px"
                  p={6}
                  w="full"
                  boxShadow="0 15px 35px rgba(0, 0, 0, 0.15)"
                >
                  <VStack align="start" gap={4} w="full">
                    <Text
                      fontSize="lg"
                      fontWeight="700"
                      color="white"
                      textAlign="center"
                      w="full"
                      mb={2}
                    >
                      {t('auth.followTheseSteps', 'Follow these steps:')}
                    </Text>

                    <VStack align="start" gap={3} w="full">
                      <Box display="flex" alignItems="flex-start" gap={3}>
                        <Box
                          w="24px"
                          h="24px"
                          bg="linear-gradient(135deg, #3b82f6, #1d4ed8)"
                          borderRadius="50%"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                          mt="1px"
                        >
                          <Text fontSize="sm" fontWeight="700" color="white">1</Text>
                        </Box>
                        <Text fontSize="md" color="rgba(255, 255, 255, 0.9)" lineHeight="1.5">
                          {t('auth.checkInbox', 'Check your email inbox for a message from HyperApp')}
                        </Text>
                      </Box>

                      <Box display="flex" alignItems="flex-start" gap={3}>
                        <Box
                          w="24px"
                          h="24px"
                          bg="linear-gradient(135deg, #3b82f6, #1d4ed8)"
                          borderRadius="50%"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                          mt="1px"
                        >
                          <Text fontSize="sm" fontWeight="700" color="white">2</Text>
                        </Box>
                        <Text fontSize="md" color="rgba(255, 255, 255, 0.9)" lineHeight="1.5">
                          {t('auth.clickVerificationLink', 'Click the "Verify Email" link in the email')}
                        </Text>
                      </Box>

                      <Box display="flex" alignItems="flex-start" gap={3}>
                        <Box
                          w="24px"
                          h="24px"
                          bg="linear-gradient(135deg, #3b82f6, #1d4ed8)"
                          borderRadius="50%"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                          mt="1px"
                        >
                          <Text fontSize="sm" fontWeight="700" color="white">3</Text>
                        </Box>
                        <VStack align="start" gap={1}>
                          <Text fontSize="md" color="rgba(255, 255, 255, 0.9)" lineHeight="1.5">
                            {t('auth.ifNotFound', 'If you don\'t see the email:')}
                          </Text>
                          <Text fontSize="sm" color="rgba(255, 255, 255, 0.7)" ml={4}>
                            • {t('auth.checkSpam', 'Check your spam or junk folder')}
                          </Text>
                          <Text fontSize="sm" color="rgba(255, 255, 255, 0.7)" ml={4}>
                            • {t('auth.waitFewMinutes', 'Wait a few minutes and check again')}
                          </Text>
                        </VStack>
                      </Box>
                    </VStack>
                  </VStack>
                </Box>

                {/* Action Buttons */}
                <VStack w="full" gap={4}>
                  {/* Resend Button */}
                  <motion.div
                    custom={0}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    style={{ width: '100%' }}
                  >
                    <ChakraButton
                      onClick={handleResendVerification}
                      disabled={isResending || resendCooldown > 0}
                      w="full"
                      h={{ base: '50px', md: '60px' }}
                      bg="linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))"
                      backdropFilter="blur(30px)"
                      border="1px solid rgba(255, 255, 255, 0.25)"
                      borderRadius="20px"
                      color="white"
                      fontSize={{ base: 'md', md: 'lg' }}
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
                      justifyContent="center"
                      px={{ base: 4, md: 8 }}
                      boxShadow="0 15px 35px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                      position="relative"
                      overflow="hidden"
                    >
                      {isResending ? (
                        <RefreshCw size={20} className="animate-spin" />
                      ) : resendCooldown > 0 ? (
                        <Text>{t('auth.resendIn', 'Resend in')} {resendCooldown}s</Text>
                      ) : (
                        <>
                          <RefreshCw size={18} style={{ marginRight: '8px' }} />
                          {t('auth.resendVerification', 'Resend Verification')}
                        </>
                      )}
                    </ChakraButton>
                  </motion.div>

                  {/* Continue to App Button */}
                  <motion.div
                    custom={1}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    style={{ width: '100%' }}
                  >
                    <ChakraButton
                      onClick={handleContinueToApp}
                      w="full"
                      h={{ base: '50px', md: '60px' }}
                      bg="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                      border="none"
                      borderRadius="20px"
                      color="white"
                      fontSize={{ base: 'md', md: 'lg' }}
                      fontWeight="700"
                      letterSpacing="0.5px"
                      _hover={{
                        bg: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                      }}
                      transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      px={{ base: 4, md: 8 }}
                      boxShadow="0 15px 35px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                      position="relative"
                      overflow="hidden"
                    >
                      <Text mr={2}>{t('auth.continueToApp', 'Continue to App')}</Text>
                      <ArrowRight size={18} />
                    </ChakraButton>
                  </motion.div>

                  {/* Use Different Email */}
                  <ChakraButton
                    onClick={handleUseDifferentEmail}
                    variant="ghost"
                    color="rgba(255, 255, 255, 0.7)"
                    fontSize="sm"
                    _hover={{ color: 'white' }}
                    mt={2}
                  >
                    {t('auth.useDifferentEmail', 'Use a different email')}
                  </ChakraButton>
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

export default EmailConfirmationPage;
