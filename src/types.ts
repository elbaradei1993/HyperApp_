export interface Report {
  id: number;
  user_id: string;
  vibe_type: VibeType;
  notes?: string;
  location?: string; // Descriptive location text
  latitude: number;
  longitude: number;
  emergency: boolean;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  profile?: {
    username?: string;
    first_name?: string;
    last_name?: string;
    profile_picture_url?: string;
    reputation?: number;
    verification_level?: 'basic' | 'verified' | 'trusted';
  };
  // Credibility system fields
  credibility_score?: number;
  validation_count?: number;
  last_validated_at?: string;
}

// Legacy interfaces for backward compatibility
export interface Vibe extends Report {
  boosts_count?: number; // For compatibility
}

export interface SOS extends Report {
  details?: string; // For compatibility
  boosts_count?: number; // For compatibility
}

export enum VibeType {
  Safe = 'safe',
  Calm = 'calm',
  Lively = 'lively',
  Festive = 'festive',
  Crowded = 'crowded',
  Suspicious = 'suspicious',
  Dangerous = 'dangerous',
  Noisy = 'noisy',
  Quiet = 'quiet',
  // Infrastructure types
  Streetlight = 'streetlight',
  Sidewalk = 'sidewalk',
  Construction = 'construction',
  Pothole = 'pothole',
  Traffic = 'traffic',
  Other = 'other',
  // Canadian winter / climate categories
  SnowAccumulation = 'snow_accumulation',
  IcySidewalk = 'icy_sidewalk',
  UnplowedRoad = 'unplowed_road',
  Flooding = 'flooding',
}

export interface User {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_picture_url?: string;
  location?: string; // Address string as stored in database
  interests?: string[];
  reputation?: number;
  language?: string;
  profile_completed_at?: string;
  created_at?: string;
  // Onboarding fields
  onboarding_completed?: boolean;
  // Credibility system fields
  verification_level?: 'basic' | 'verified' | 'trusted';
  verified_at?: string;
  verification_badge_earned_at?: string;
  // Email verification fields
  email_verified?: boolean;
  email_verified_at?: string;
  email_confirmed_at?: string; // Alternative field name used in some places
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  emailUnconfirmed?: boolean;
}

export const INTEREST_CATEGORIES = {
  'sports-fitness': {
    label: 'Sports & Fitness',
    icon: '🏃',
    items: ['Running', 'Gym', 'Yoga', 'Football', 'Basketball', 'Swimming', 'Cycling', 'Tennis', 'Martial Arts', 'Dance'],
  },
  'music-arts': {
    label: 'Music & Arts',
    icon: '🎵',
    items: ['Concerts', 'Theater', 'Painting', 'Photography', 'Music Production', 'Film', 'Writing', 'Sculpture', 'Design', 'Crafts'],
  },
  'food-dining': {
    label: 'Food & Dining',
    icon: '🍽️',
    items: ['Restaurants', 'Cooking', 'Baking', 'Coffee Shops', 'Fine Dining', 'Street Food', 'Vegan', 'Wine', 'Beer', 'Cocktails'],
  },
  'education-learning': {
    label: 'Education & Learning',
    icon: '📚',
    items: ['Courses', 'Workshops', 'Books', 'Online Learning', 'Languages', 'Science', 'History', 'Technology', 'Business', 'Art History'],
  },
  'environment-nature': {
    label: 'Environment & Nature',
    icon: '🌱',
    items: ['Hiking', 'Camping', 'Gardening', 'Sustainability', 'Wildlife', 'Photography', 'Conservation', 'Fishing', 'Bird Watching', 'Eco-friendly Living'],
  },
  'gaming-tech': {
    label: 'Gaming & Tech',
    icon: '🎮',
    items: ['Video Games', 'Programming', 'Gadgets', 'AI/ML', 'Cybersecurity', 'Mobile Apps', 'Web Development', 'Hardware', 'Virtual Reality', 'Board Games'],
  },
  'social-community': {
    label: 'Social & Community',
    icon: '👥',
    items: ['Meetups', 'Volunteering', 'Clubs', 'Networking', 'Charity', 'Community Events', 'Book Clubs', 'Sports Teams', 'Cultural Events', 'Religious Groups'],
  },
  'shopping-lifestyle': {
    label: 'Shopping & Lifestyle',
    icon: '🛍️',
    items: ['Markets', 'Fashion', 'Beauty', 'Home Decor', 'Antiques', 'Vintage', 'Luxury', 'Thrifting', 'Art Galleries', 'Craft Markets'],
  },
  'transportation': {
    label: 'Transportation',
    icon: '🚗',
    items: ['Cycling', 'Public Transport', 'Electric Vehicles', 'Motorcycles', 'Car Sharing', 'Ride Sharing', 'Walking', 'Scooters', 'Boats', 'Aviation'],
  },
  'home-garden': {
    label: 'Home & Garden',
    icon: '🏠',
    items: ['DIY', 'Gardening', 'Home Improvement', 'Interior Design', 'Landscaping', 'Furniture', 'Tools', 'Renovation', 'Smart Home', 'Pets'],
  },
} as const;

export interface ReportValidation {
  id: number;
  report_id: number;
  user_id: string;
  validation_type: 'confirm' | 'deny';
  created_at: string;
}

export interface MapComponentProps {
  vibes: Vibe[];
  sosAlerts: SOS[];
  center: [number, number];
  zoom: number;
  userLocation: [number, number] | null;
  isHeatmapVisible: boolean;
  onToggleHeatmap: () => void;
  userId: string;
}
