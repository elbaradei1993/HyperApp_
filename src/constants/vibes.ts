export const VIBE_CONFIG = {
  safe: { color: '#10b981', icon: '🛡️', label: 'Safe' },
  calm: { color: '#3b82f6', icon: '😌', label: 'Calm' },
  lively: { color: '#f59e0b', icon: '🎉', label: 'Lively' },
  festive: { color: '#8b5cf6', icon: '🎊', label: 'Festive' },
  crowded: { color: '#ef4444', icon: '👥', label: 'Crowded' },
  suspicious: { color: '#f97316', icon: '⚠️', label: 'Suspicious' },
  dangerous: { color: '#dc2626', icon: '🚨', label: 'Dangerous' },
  noisy: { color: '#eab308', icon: '🔊', label: 'Noisy' },
  quiet: { color: '#06b6d4', icon: '🤫', label: 'Quiet' },
  unknown: { color: '#6b7280', icon: '❓', label: 'Unknown' },
} as const;

export type VibeType = keyof typeof VIBE_CONFIG;
