import React from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../contexts/LanguageContext';

const TranslationTest: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage, isTranslating } = useLanguage();

  // Test keys that might not exist in Arabic translations (to trigger API calls)
  const testKeys = [
    'test.arabicTranslation1',
    'test.arabicTranslation2',
    'test.arabicMissingKey',
  ];

  // Test Arabic-specific content
  const arabicTestContent = [
    { key: 'test.welcomeMessage', english: 'Welcome to our Arabic app!' },
    { key: 'test.safetyFirst', english: 'Safety comes first in our community' },
    { key: 'test.reportIncident', english: 'Please report any safety incidents' },
  ];

  return (
    <div style={{
      padding: '20px',
      background: 'var(--bg-glass)',
      borderRadius: 'var(--radius-lg)',
      margin: '20px',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--bg-glass-border)',
    }}>
      <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
        LibreTranslate Integration Test
      </h3>

      <div style={{ marginBottom: '16px' }}>
        <strong>Current Language:</strong> {currentLanguage.toUpperCase()}
      </div>

      {isTranslating && (
        <div style={{
          color: 'var(--accent-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <i className="fas fa-spinner fa-spin"></i>
          Translating...
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <strong>Test Translations (these may trigger API calls):</strong>
      </div>

      {testKeys.map((key, index) => (
        <div key={key} style={{
          marginBottom: '8px',
          padding: '8px',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
        }}>
          <code style={{ color: 'var(--text-muted)' }}>{key}:</code>
          <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
            {t(key, `Fallback for ${key}`)}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '14px',
        color: 'var(--text-muted)',
      }}>
        <strong>Note:</strong> If you see actual translations instead of fallbacks, LibreTranslate API is working.
        Check browser console for translation logs.
      </div>
    </div>
  );
};

export default TranslationTest;
