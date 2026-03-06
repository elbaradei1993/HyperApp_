import React, { useRef, useEffect, useState } from 'react';
import { X, Camera as CameraIcon, RotateCcw, Check } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string>('');

  // Start camera stream
  const startCamera = async () => {
    try {
      setError('');

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
      setIsStreaming(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create file from blob
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        onCapture(file);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  };

  // Handle modal open/close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
  }, [facingMode]);

  if (!isOpen) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        background: 'rgba(0,0,0,0.8)',
      }}>
        <h3 style={{ color: 'white', margin: 0, fontSize: '18px' }}>
          Take Photo
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '4px',
          }}
          aria-label="Close camera"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {error ? (
          <div style={{
            color: 'white',
            textAlign: 'center',
            padding: '20px',
          }}>
            <p style={{ marginBottom: '20px', fontSize: '16px' }}>
              {error}
            </p>
            <button
              onClick={startCamera}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />

            {/* Camera Controls Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
            }}>
              {/* Switch Camera Button */}
              <button
                onClick={switchCamera}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid white',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                aria-label="Switch camera"
              >
                <RotateCcw size={24} />
              </button>

              {/* Capture Button */}
              <button
                onClick={capturePhoto}
                disabled={!isStreaming}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: isStreaming ? '#ef4444' : '#666',
                  border: '4px solid white',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isStreaming ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
                aria-label="Take photo"
              >
                <CameraIcon size={32} />
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid white',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                aria-label="Cancel"
              >
                <X size={24} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default CameraModal;
