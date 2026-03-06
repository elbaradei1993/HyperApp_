// Chakra UI v3 theme - enhanced with tab navigation design tokens
const theme = {
  colors: {
    brand: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Your primary blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    green: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981', // Your secondary green
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Your danger red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
  },
  fonts: {
    heading: '\'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', \'Roboto\', sans-serif',
    body: '\'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', \'Roboto\', sans-serif',
  },
  shadows: {
    tab: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    tabHover: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
    tabActive: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    fab: '0 10px 25px rgba(59, 130, 246, 0.3), 0 4px 10px rgba(59, 130, 246, 0.2)',
    fabHover: '0 20px 40px rgba(59, 130, 246, 0.4), 0 8px 16px rgba(59, 130, 246, 0.3)',
  },
  radii: {
    tab: '12px',
    fab: '16px',
  },
  sizes: {
    tabMinHeight: '56px',
    tabMinHeightMd: '64px',
    tabMinHeightLg: '72px',
    fab: '56px',
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'lg',
        _focus: {
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)',
        },
      },
      sizes: {
        sm: {
          fontSize: 'sm',
          px: 5,
          py: 2.5,
          minH: '44px',
          minW: '44px',
        },
        md: {
          fontSize: 'md',
          px: 5,
          py: 3,
          minH: '48px',
          minW: '48px',
        },
        lg: {
          fontSize: 'lg',
          px: 7,
          py: 3.5,
          minH: '56px',
          minW: '56px',
        },
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
          },
          _active: {
            bg: 'brand.700',
            transform: 'translateY(0)',
          },
        },
        outline: {
          border: '2px solid',
          borderColor: 'brand.500',
          color: 'brand.500',
          bg: 'transparent',
          _hover: {
            bg: 'brand.50',
            transform: 'translateY(-1px)',
            boxShadow: 'md',
          },
          _active: {
            bg: 'brand.100',
            transform: 'translateY(0)',
          },
        },
        ghost: {
          color: 'brand.500',
          bg: 'transparent',
          _hover: {
            bg: 'brand.50',
            transform: 'translateY(-1px)',
          },
          _active: {
            bg: 'brand.100',
            transform: 'translateY(0)',
          },
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          px: 4,
          py: 3,
          borderRadius: '12px',
          _focus: {
            borderColor: 'blue.500',
            boxShadow: '0 0 0 1px #3b82f6',
          },
        },
      },
    },
    Textarea: {
      baseStyle: {
        px: 4,
        py: 3,
        borderRadius: '12px',
        _focus: {
          borderColor: 'blue.500',
          boxShadow: '0 0 0 1px #3b82f6',
        },
      },
    },
    Tabs: {
      variants: {
        'mobile-modern': {
          root: {
            display: 'flex',
            alignItems: 'center',
            px: 3,
            py: 2,
            minH: '70px',
            bg: 'white',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
            borderTop: '1px solid',
            borderColor: 'gray.200',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            style: {
              paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
            },
          },
          tablist: {
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            gap: 0,
            position: 'relative',
          },
          tab: {
            flex: 1,
            p: '10px 8px',
            border: 'none',
            bg: 'transparent',
            color: 'gray.500',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 500,
            borderRadius: 'tab',
            minH: '54px',
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            _hover: {
              color: 'gray.700',
              transform: 'translateY(-1px)',
            },
            _selected: {
              color: 'brand.500',
              fontWeight: 600,
              _hover: {
                color: 'brand.600',
              },
            },
            _focusVisible: {
              outline: '2px solid',
              outlineColor: 'brand.300',
              outlineOffset: '2px',
            },
            style: {
              WebkitTapHighlightColor: 'transparent',
            },
          },
          indicator: {
            position: 'absolute',
            top: '8px',
            h: 'calc(100% - 16px)',
            bg: 'gray.50',
            borderRadius: 'tab',
            boxShadow: 'tab',
            border: '1px solid',
            borderColor: 'gray.200',
            zIndex: 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
        'tablet-modern': {
          root: {
            position: 'relative',
            borderRadius: '16px',
            marginTop: '40px',
            padding: '12px',
            minH: '80px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(229, 231, 235, 0.4)',
            bg: 'white',
          },
          tablist: {
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          },
          tab: {
            minH: '64px',
            fontSize: '0.875rem',
            px: 4,
            py: 3,
            borderRadius: '12px',
            _hover: {
              bg: 'gray.50',
              transform: 'translateY(-2px)',
              boxShadow: 'tabHover',
            },
            _selected: {
              bg: 'brand.50',
              color: 'brand.600',
              boxShadow: 'tabActive',
              _hover: {
                bg: 'brand.100',
              },
            },
          },
          indicator: {
            display: 'none', // No sliding indicator on tablet/desktop
          },
        },
      },
      sizes: {
        sm: {
          tab: {
            minH: '48px',
            fontSize: '0.75rem',
            px: 3,
            py: 2,
          },
        },
        md: {
          tab: {
            minH: '56px',
            fontSize: '0.875rem',
            px: 4,
            py: 3,
          },
        },
        lg: {
          tab: {
            minH: '64px',
            fontSize: '1rem',
            px: 6,
            py: 4,
          },
        },
      },
    },
  },
};

export default theme;
