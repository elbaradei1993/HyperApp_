import React, { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface LanguageSelectionScreenProps {
  onLanguageSelect: (language: 'en' | 'ar') => void;
}

const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({ onLanguageSelect }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.2,
      },
    },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.4 + custom * 0.1,
      },
    }),
    hover: {
      scale: 1.02,
      transition: { duration: 0.3 },
    },
    tap: {
      scale: 0.98,
    },
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #0f1117 0%, #0a0c10 60%, #09090b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Mouse-tracked glow layer */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, rgba(0,200,150,0.08) 0%, transparent 60%)`,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Concentric rings */}
      {[160, 280, 400, 520].map((size, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: size, height: size,
          borderRadius: '50%',
          border: `1px solid rgba(0,200,150,${0.12 - i * 0.025})`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '3px', height: '3px',
            background: 'rgba(0,200,150,0.4)',
            borderRadius: '50%',
            top: `${15 + i * 14}%`,
            left: `${10 + i * 15}%`,
            animation: `floatParticle ${12 + i * 2}s linear infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}

      {/* Main card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '420px',
          padding: '0 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px',
        }}
      >
        {/* Logo section */}
        <motion.div variants={logoVariants} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* App mark */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '22px',
            background: 'linear-gradient(135deg, #00c896 0%, rgba(0,200,150,0.35) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,200,150,0.25), 0 0 0 1px rgba(0,200,150,0.15)',
            position: 'relative',
          }}>
            <img
              src="/hyperapp-logo.png"
              alt="HyperApp"
              style={{ width: '52px', height: '52px', borderRadius: '14px', objectFit: 'cover' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Hex fallback shown when no logo */}
            <div style={{
              width: '30px', height: '30px',
              background: 'rgba(9,9,11,0.5)',
              clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
              position: 'absolute',
            }} />
          </div>

          {/* Name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '32px', fontWeight: '800', letterSpacing: '-1px',
              color: '#f4f4f5', lineHeight: 1.1, marginBottom: '6px',
            }}>
              HyperApp
            </div>
            <div style={{
              fontSize: '12px', color: 'rgba(161,161,170,0.8)',
              letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '500',
            }}>
              Stay Safe · Stay Connected
            </div>
          </div>
        </motion.div>

        {/* Language picker */}
        <motion.div variants={titleVariants} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(244,244,245,0.7)', textAlign: 'center', letterSpacing: '0.02em' }}>
            Choose your language
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* English */}
            <motion.div custom={0} variants={buttonVariants} whileHover="hover" whileTap="tap" style={{ width: '100%' }}>
              <button
                onClick={() => onLanguageSelect('en')}
                style={{
                  width: '100%', height: '58px',
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  color: '#f4f4f5',
                  fontSize: '16px', fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 20px',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,200,150,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,200,150,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '22px' }}>🇺🇸</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#f4f4f5' }}>English</div>
                    <div style={{ fontSize: '11px', color: 'rgba(161,161,170,0.7)', fontWeight: '400' }}>English</div>
                  </div>
                </div>
                <ChevronRight size={18} color="rgba(161,161,170,0.5)" />
              </button>
            </motion.div>

            {/* Arabic */}
            <motion.div custom={1} variants={buttonVariants} whileHover="hover" whileTap="tap" style={{ width: '100%' }}>
              <button
                onClick={() => onLanguageSelect('ar')}
                style={{
                  width: '100%', height: '58px',
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  color: '#f4f4f5',
                  fontSize: '16px', fontWeight: '700',
                  cursor: 'pointer',
                  direction: 'rtl',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 20px',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,200,150,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,200,150,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '22px' }}>🇪🇬</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#f4f4f5' }}>العربية</div>
                    <div style={{ fontSize: '11px', color: 'rgba(161,161,170,0.7)', fontWeight: '400' }}>Arabic</div>
                  </div>
                </div>
                <ChevronRight size={18} color="rgba(161,161,170,0.5)" style={{ transform: 'scaleX(-1)' }} />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes floatParticle {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LanguageSelectionScreen;
