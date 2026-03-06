import React, { useEffect, useState } from 'react';
import { Box, Text, VStack, Button, Spinner } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

import { supabase } from '../lib/supabase';

interface MagicLinkAuthProps {}

const MagicLinkAuth: React.FC<MagicLinkAuthProps> = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your magic link...');

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const email = urlParams.get('email');

        if (!token || !email) {
          setStatus('error');
          setMessage('Invalid magic link - missing token or email');
          return;
        }

        console.log('Processing validated magic link for:', email);

        // Since the token was already validated by the Edge Function,
        // we can proceed with authentication. Let's try OTP sign-in
        // which should work since the email is already verified
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            data: {
              magic_link_verified: true,
            },
          },
        });

        if (error) {
          console.error('Magic link auth error:', error);
          setStatus('error');
          setMessage('Failed to authenticate. Please try logging in normally.');
          return;
        }

        setStatus('success');
        setMessage('Successfully authenticated! Redirecting...');

        // Redirect to main app after success
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);

      } catch (error: any) {
        console.error('Magic link processing error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to process magic link');
      }
    };

    handleMagicLink();
  }, []);

  const handleRetry = () => {
    window.location.href = '/';
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #1a1a2e 75%, #16213e 100%)"
      p={4}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <VStack
          gap={6}
          bg="rgba(255, 255, 255, 0.1)"
          backdropFilter="blur(20px)"
          borderRadius="24px"
          border="1px solid rgba(255, 255, 255, 0.2)"
          p={8}
          textAlign="center"
          maxW="400px"
          w="full"
          boxShadow="0 20px 40px rgba(0, 0, 0, 0.3)"
        >
          {status === 'loading' && (
            <>
              <Box position="relative">
                <Box
                  w="80px"
                  h="80px"
                  bg="linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))"
                  borderRadius="20px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  backdropFilter="blur(20px)"
                  border="1px solid rgba(255, 255, 255, 0.3)"
                >
                  <Spinner size="lg" color="white" />
                </Box>
              </Box>
              <VStack gap={2}>
                <Text fontSize="xl" fontWeight="600" color="white">
                  Verifying Magic Link
                </Text>
                <Text fontSize="md" color="rgba(255, 255, 255, 0.8)">
                  {message}
                </Text>
              </VStack>
            </>
          )}

          {status === 'success' && (
            <>
              <Box position="relative">
                <Box
                  w="80px"
                  h="80px"
                  bg="linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.2))"
                  borderRadius="20px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  backdropFilter="blur(20px)"
                  border="1px solid rgba(34, 197, 94, 0.4)"
                >
                  <CheckCircle size={40} color="#22c55e" />
                </Box>
              </Box>
              <VStack gap={2}>
                <Text fontSize="xl" fontWeight="600" color="white">
                  Welcome Back!
                </Text>
                <Text fontSize="md" color="rgba(255, 255, 255, 0.8)">
                  {message}
                </Text>
              </VStack>
            </>
          )}

          {status === 'error' && (
            <>
              <Box position="relative">
                <Box
                  w="80px"
                  h="80px"
                  bg="linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.2))"
                  borderRadius="20px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  backdropFilter="blur(20px)"
                  border="1px solid rgba(239, 68, 68, 0.4)"
                >
                  <AlertCircle size={40} color="#ef4444" />
                </Box>
              </Box>
              <VStack gap={4}>
                <VStack gap={2}>
                  <Text fontSize="xl" fontWeight="600" color="white">
                    Authentication Failed
                  </Text>
                  <Text fontSize="md" color="rgba(255, 255, 255, 0.8)">
                    {message}
                  </Text>
                </VStack>
                <Button
                  onClick={handleRetry}
                  bg="rgba(255, 255, 255, 0.2)"
                  color="white"
                  border="1px solid rgba(255, 255, 255, 0.3)"
                  _hover={{
                    bg: 'rgba(255, 255, 255, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  }}
                >
                  Go to Login
                </Button>
              </VStack>
            </>
          )}
        </VStack>
      </motion.div>
    </Box>
  );
};

export default MagicLinkAuth;
