import React from 'react';
import { Button as ChakraButton, useBreakpointValue } from '@chakra-ui/react';

interface ButtonProps {
  variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props
}) => {
  // Improved responsive sizing with better mobile scaling
  const responsiveSize = useBreakpointValue({
    base: size === 'lg' ? 'md' : size, // Only reduce large buttons on mobile
    sm: size,
    md: size,
  }) as 'sm' | 'md' | 'lg';

  // Map our custom variants to Chakra variants
  const getChakraVariant = (variant: string) => {
    switch (variant) {
    case 'primary':
      return 'solid';
    case 'secondary':
      return 'solid';
    case 'outline':
      return 'outline';
    case 'ghost':
      return 'ghost';
    default:
      return 'solid';
    }
  };

  const getChakraColorScheme = (variant: string) => {
    switch (variant) {
    case 'primary':
      return 'brand';
    case 'success':
      return 'green';
    case 'danger':
      return 'red';
    case 'secondary':
      return 'gray';
    default:
      return 'brand';
    }
  };

  // Improved size configurations with consistent scaling
  const getSizeStyles = (size: string) => {
    switch (size) {
    case 'sm':
      return {
        fontSize: 'sm',
        px: 3,
        py: 2,
        minH: '40px', // Increased for better touch targets
        minW: '40px',
      };
    case 'lg':
      return {
        fontSize: 'md', // Reduced from lg to maintain proportion
        px: 5,
        py: 2.5,
        minH: '48px', // Reduced from 52px for better proportion
        minW: '48px',
      };
    default: // md
      return {
        fontSize: 'md',
        px: 4,
        py: 2.5,
        minH: '44px',
        minW: '44px',
      };
    }
  };

  const sizeStyles = getSizeStyles(responsiveSize);

  return (
    <ChakraButton
      variant={getChakraVariant(variant)}
      colorScheme={getChakraColorScheme(variant)}
      width={fullWidth ? 'full' : 'auto'}
      fontWeight="semibold"
      borderRadius="lg"
      boxShadow={variant === 'primary' ? 'md' : 'sm'}
      _hover={{
        transform: 'translateY(-1px)',
        boxShadow: variant === 'primary' ? 'lg' : 'md',
      }}
      _active={{
        transform: 'translateY(0)',
      }}
      transition="all 0.2s ease"
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitAppearance: 'none',
        touchAction: 'manipulation',
      }}
      {...sizeStyles}
      {...props}
    >
      {children}
    </ChakraButton>
  );
};

export default Button;
