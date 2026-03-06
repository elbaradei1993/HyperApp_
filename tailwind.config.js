/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Figma-inspired brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#3b82f6', // Blue - existing
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#8b5cf6', // Purple - Figma addition
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Vibe colors - enhanced
        vibe: {
          safe: '#10b981',
          calm: '#3b82f6',
          lively: '#f59e0b',
          festive: '#8b5cf6',
          crowded: '#ef4444',
          suspicious: '#f97316',
          dangerous: '#dc2626',
          noisy: '#eab308',
          quiet: '#06b6d4',
        },
        // Semantic colors
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        emergency: '#dc2626',
      },
      spacing: {
        // 8px grid system
        '1': '8px',
        '2': '16px',
        '3': '24px',
        '4': '32px',
        '5': '40px',
        '6': '48px',
      },
      borderRadius: {
        // Consistent border radius
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        // Enhanced shadow system
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          '"Open Sans"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
      },
      fontSize: {
        // Headers & Titles
        'dashboard-title': ['22px', { lineHeight: '1.2', letterSpacing: '-0.3px', fontWeight: '600' }],
        'dashboard-subtitle': ['13px', { lineHeight: '1.4', letterSpacing: '0.3px', fontWeight: '400' }],
        'activity-title': ['18px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '800' }],
        // Location Section
        'location-address': ['20px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '700' }],
        'location-meta': ['12px', { lineHeight: '1.2', fontWeight: '500' }],
        // Vibe Analysis Center Content
        'vibe-percentage': ['36px', { lineHeight: '1', fontWeight: '900' }],
        'vibe-label': ['14px', { lineHeight: '1.2', letterSpacing: '0.15em', fontWeight: '800' }],
        // Activity Feed Items
        'activity-message': ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        'activity-user': ['12px', { lineHeight: '1.2', fontWeight: '600' }],
        'activity-location': ['12px', { lineHeight: '1.2', fontWeight: '500' }],
        'activity-vibe-badge': ['10px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '700' }],
        'activity-verification': ['10px', { lineHeight: '1.2', fontWeight: '600' }],
        'activity-credibility': ['10px', { lineHeight: '1.2', fontWeight: '600' }],
        'activity-time': ['11px', { lineHeight: '1.2' }],
        // Buttons & Interactive Elements
        'button-validation': ['12px', { lineHeight: '1.2', fontWeight: '600' }],
        'button-expand': ['15px', { lineHeight: '1.2', fontWeight: '600' }],
        'icon-meta': ['10px', { lineHeight: '1.2' }],
        // Vibe Breakdown Grid
        'vibe-type-name': ['14px', { lineHeight: '1.2', fontWeight: '700' }],
        'vibe-description': ['12px', { lineHeight: '1.3', fontWeight: '400' }],
        'vibe-percentage-small': ['20px', { lineHeight: '1.2', fontWeight: '900' }],
        'vibe-count': ['12px', { lineHeight: '1.2', fontWeight: '400' }],
      },
      fontWeight: {
        // Font Weights Scale
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'normal': '400', // Normal - descriptions, regular text
        'medium': '500', // Medium - location meta, some labels
        'semibold': '600', // Semibold - user names, buttons, subtitles
        'bold': '700', // Bold - vibe names, addresses
        'extrabold': '800', // Extra Bold - activity title, center vibe label
        'black': '900', // Black - percentages, main vibe display
      },
      letterSpacing: {
        'tightest': '-0.3px',
        'tighter': '-0.02em',
        'normal': '0',
        'wider': '0.05em',
        'widest': '0.15em',
        'subtitle': '0.3px',
      },
    },
  },
  plugins: [],
}
