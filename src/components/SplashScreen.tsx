import React, { useState, useEffect } from 'react';

const SplashScreen: React.FC = () => { // Removed onComplete prop
  const [currentIconIndex, setCurrentIconIndex] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const icons = [
    { emoji: '🌊', className: 'calm' },
    { emoji: '📢', className: 'noisy' },
    { emoji: '👥', className: 'crowded' },
    { emoji: '🎉', className: 'lively' },
    { emoji: '⚠️', className: 'dangerous' },
  ];

  const loadingTexts = [
    'Initializing safety systems',
    'Connecting to community network',
    'Securing your location',
    'Ready to protect',
  ];

  useEffect(() => {
    // Icon rotation
    const iconInterval = setInterval(() => {
      setCurrentIconIndex((prev) => (prev + 1) % icons.length);
    }, 1500);

    // Text cycling
    const textInterval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 1200);

    return () => {
      clearInterval(iconInterval);
      clearInterval(textInterval);
    };
  }, []);

  return (
    <div style={{
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      background: '#000000',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      perspective: '1200px',
    }}>
      <div style={{
        textAlign: 'center',
        color: '#ffffff',
        maxWidth: '500px',
        width: '90%',
      }}>
        <h1 style={{
          fontSize: '3.5em',
          fontWeight: 700,
          marginBottom: '20px',
          letterSpacing: '-1.5px',
          animation: 'fadeIn 1s ease-out',
        }}>
          HyperApp
        </h1>
        <p style={{
          fontSize: '1.1em',
          fontWeight: 400,
          marginBottom: '80px',
          color: 'rgba(255, 255, 255, 0.7)',
          letterSpacing: '0.5px',
          animation: 'fadeIn 1s ease-out 0.3s both',
        }}>
          Stay Safe...Stay Connected
        </p>

        <div style={{
          height: '200px',
          marginBottom: '60px',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          perspective: '1200px',
        }}>
          {/* Center glow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(76, 201, 240, 0.15) 0%, transparent 70%)',
            filter: 'blur(20px)',
            animation: 'pulseGlow 1.5s ease-in-out infinite',
          }} />

          {/* Icons */}
          {icons.map((icon, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                fontSize: '64px',
                width: '120px',
                height: '120px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '20px',
                background: icon.className === 'calm' ? 'linear-gradient(135deg, rgba(76, 201, 240, 0.2), rgba(76, 201, 240, 0.08))' :
                  icon.className === 'noisy' ? 'linear-gradient(135deg, rgba(255, 209, 102, 0.2), rgba(255, 209, 102, 0.08))' :
                    icon.className === 'crowded' ? 'linear-gradient(135deg, rgba(6, 214, 160, 0.2), rgba(6, 214, 160, 0.08))' :
                      icon.className === 'lively' ? 'linear-gradient(135deg, rgba(239, 71, 111, 0.2), rgba(239, 71, 111, 0.08))' :
                        'linear-gradient(135deg, rgba(17, 138, 178, 0.2), rgba(17, 138, 178, 0.08))',
                backdropFilter: 'blur(15px)',
                border: icon.className === 'calm' ? '1px solid rgba(76, 201, 240, 0.4)' :
                  icon.className === 'noisy' ? '1px solid rgba(255, 209, 102, 0.4)' :
                    icon.className === 'crowded' ? '1px solid rgba(6, 214, 160, 0.4)' :
                      icon.className === 'lively' ? '1px solid rgba(239, 71, 111, 0.4)' :
                        '1px solid rgba(17, 138, 178, 0.4)',
                transformStyle: 'preserve-3d',
                filter: 'drop-shadow(0 12px 30px rgba(0, 0, 0, 0.4))',
                opacity: index === currentIconIndex ? 1 : 0,
                transform: index === currentIconIndex ? 'translateZ(0px) scale(1)' :
                  index === (currentIconIndex - 1 + icons.length) % icons.length ? 'translateZ(150px) scale(0.6)' : 'translateZ(-200px) scale(0.5)',
                transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                color: icon.className === 'calm' ? '#4CC9F0' :
                  icon.className === 'noisy' ? '#FFD166' :
                    icon.className === 'crowded' ? '#06D6A0' :
                      icon.className === 'lively' ? '#EF476F' : '#118AB2',
                boxShadow: index === currentIconIndex ? '0 0 40px currentColor' : 'none',
              }}
            >
              {icon.emoji}
            </div>
          ))}
        </div>

        <div style={{
          fontSize: '0.9em',
          color: 'rgba(255, 255, 255, 0.5)',
          letterSpacing: '0.3px',
          marginTop: '20px',
          animation: 'fadeIn 1s ease-out 0.6s both',
        }}>
          {loadingTexts[currentTextIndex]}
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulseGlow {
            0%, 100% {
              opacity: 0.3;
              transform: translate(-50%, -50%) scale(1);
            }
            50% {
              opacity: 0.6;
              transform: translate(-50%, -50%) scale(1.1);
            }
          }

          @media (max-width: 480px) {
            h1 {
              font-size: 2.8em !important;
            }

            p {
              font-size: 1em !important;
              margin-bottom: 60px !important;
            }

            div[style*="height: 200px"] {
              height: 160px !important;
              margin-bottom: 50px !important;
            }

            div[style*="width: 120px"] {
              width: 100px !important;
              height: 100px !important;
              font-size: 52px !important;
              border-radius: 16px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default SplashScreen;
