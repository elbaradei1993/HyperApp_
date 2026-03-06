import React from 'react';
import { useTranslation } from 'react-i18next';

import Modal from './shared/Modal';

interface PrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  const privacyContent = (
    <div style={{
      lineHeight: '1.6',
      color: 'var(--text-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      textAlign: 'justify',
      textJustify: 'inter-word',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '2px solid var(--primary-color, #4361ee)',
        }}>
          Privacy Policy
        </h3>
        <p style={{
          fontSize: '14px',
          marginBottom: '12px',
          color: 'var(--text-secondary, #666666)',
        }}>
          <strong>Last Updated:</strong> October 31, 2025
        </p>
        <p style={{
          fontSize: '14px',
          marginBottom: '16px',
          color: 'var(--text-primary)',
        }}>
          HyperApp collects and uses information to provide community safety services and improve your experience.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          Information We Collect
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '8px' }}>
          <strong>Personal Information:</strong> Name, email, phone, location data, profile info
        </p>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          <strong>Automatic Data:</strong> Device info, usage patterns, location data, cookies
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          How We Use Information
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          To provide safety services, process reports, send alerts, improve features, ensure security, and comply with laws.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          Information Sharing
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We share data only for emergencies, legal requirements, trusted service providers, business transfers, or with your consent.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          Your Rights
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Access, correct, delete, or export your data. Control location sharing in app settings.
        </p>
      </div>


    </div>
  );

  const termsContent = (
    <div style={{
      lineHeight: '1.6',
      color: 'var(--text-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      textAlign: 'justify',
      textJustify: 'inter-word',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '2px solid var(--primary-color, #4361ee)',
        }}>
          Terms of Service
        </h3>
        <p style={{
          fontSize: '14px',
          marginBottom: '12px',
          color: 'var(--text-secondary, #666666)',
        }}>
          <strong>Last Updated:</strong> October 31, 2025
        </p>
        <p style={{
          fontSize: '14px',
          marginBottom: '16px',
          color: 'var(--text-primary)',
        }}>
          Welcome to HyperApp! These terms govern your use of our community safety platform.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          Service Description
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          HyperApp helps communities share safety information, report incidents, and access real-time safety data.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          User Accounts
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Provide accurate information and keep your account secure. You're responsible for all activity under your account.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          Acceptable Use
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Use the service responsibly. Do not submit false reports, harass others, or post inappropriate content.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          Emergency Services
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          For immediate danger, contact local emergency services directly. We cannot guarantee response times.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          marginTop: '16px',
        }}>
          Disclaimers
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Service provided "as is". We strive for accuracy but cannot guarantee user-generated content reliability.
        </p>
      </div>


    </div>
  );

  // Check if we're on mobile for responsive sizing
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terms of Service"
      size={isMobile ? 'sm' : 'md'}
    >
      <div style={{
        maxHeight: isMobile ? '55vh' : '70vh',
        overflowY: 'auto',
        padding: isMobile ? '0 8px 16px 8px' : '0 4px 8px 4px',
        marginBottom: isMobile ? '8px' : '0',
      }}>
        {privacyContent}
        <hr style={{
          border: 'none',
          borderTop: '1px solid var(--border-color)',
          margin: isMobile ? '20px 0' : '30px 0',
        }} />
        {termsContent}
      </div>
    </Modal>
  );
};

export default PrivacyTermsModal;
