import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Text, Button, VStack } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          p={8}
          textAlign="center"
          bg="red.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="red.200"
        >
          <VStack gap={4}>
            <Text fontSize="lg" fontWeight="bold" color="red.800">
              Something went wrong
            </Text>
            <Text color="red.600">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <Button
              colorScheme="red"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try Again
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
