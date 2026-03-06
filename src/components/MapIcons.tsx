import L from 'leaflet';

// Vibe type icons
export const getVibeIcon = (vibeType: string) => {
  const iconMap: Record<string, string> = {
    safe: 'fas fa-shield-alt',
    calm: 'fas fa-peace',
    lively: 'fas fa-glass-cheers',
    crowded: 'fas fa-users',
    suspicious: 'fas fa-eye-slash',
    dangerous: 'fas fa-exclamation-triangle',
    noisy: 'fas fa-volume-up',
    quiet: 'fas fa-moon',
  };

  return iconMap[vibeType] || 'fas fa-question-circle';
};

// SOS icon
export const sosIcon = L.divIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border: 3px solid white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      animation: sos-pulse 1s ease-in-out infinite alternate;
    ">
      <i class="fas fa-exclamation-triangle" style="color: white; font-size: 16px;"></i>
    </div>
  `,
  className: 'sos-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// User location icon - Premium radiating pulse design with white pulsing
export const userLocationIcon = L.divIcon({
  html: `
    <div style="
      position: relative;
      width: 54px;
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <!-- Premium Pulsing Rings -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 12px rgba(255, 255, 255, 0.8), inset 0 0 12px rgba(255, 255, 255, 0.3);
        animation: premiumPulseWhite1 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
        z-index: 1;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1.5px solid white;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
        animation: premiumPulseWhite2 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite 0.8s;
        z-index: 1;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid white;
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
        animation: premiumPulseWhite3 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite 1.6s;
        z-index: 1;
      "></div>


    </div>
  `,
  className: 'user-location-marker-premium',
  iconSize: [54, 54],
  iconAnchor: [27, 27],
});
