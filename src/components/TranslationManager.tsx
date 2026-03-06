import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '../i18n';
import { validateTranslations } from '../lib/i18nUtils';

interface TranslationManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const TranslationManager: React.FC<TranslationManagerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedNamespace, setSelectedNamespace] = useState('translation');
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'validate'>('edit');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
  ];

  const namespaces = ['translation', 'common'];

  useEffect(() => {
    if (isOpen) {
      loadTranslations();
      validateCurrentTranslations();
    }
  }, [isOpen, selectedLanguage, selectedNamespace]);

  const loadTranslations = () => {
    try {
      const resources = i18n.services.resourceStore.data[selectedLanguage]?.[selectedNamespace] as Record<string, any> || {};
      setTranslations(resources);
      setEditedTranslations({});
    } catch (error) {
      console.error('Error loading translations:', error);
      alert('Failed to load translations');
    }
  };

  const validateCurrentTranslations = () => {
    const results = validateTranslations();
    setValidationResults(results);
  };

  const handleTranslationChange = (key: string, value: string) => {
    setEditedTranslations(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveTranslations = async () => {
    setIsSaving(true);
    try {
      // Save each edited translation
      Object.entries(editedTranslations).forEach(([key, value]) => {
        i18n.addResource(selectedLanguage, selectedNamespace, key, value);
      });

      // Clear edited translations
      setEditedTranslations({});

      alert('Translations saved successfully!');

      // Re-validate
      validateCurrentTranslations();
    } catch (error) {
      console.error('Error saving translations:', error);
      alert('Failed to save translations');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTranslationEditor = () => {
    const flattenTranslations = (obj: any, prefix = ''): Array<{ key: string; value: string }> => {
      const result: Array<{ key: string; value: string }> = [];

      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string') {
          result.push({ key: fullKey, value });
        } else if (typeof value === 'object' && value !== null) {
          result.push(...flattenTranslations(value, fullKey));
        }
      });

      return result;
    };

    const flatTranslations = flattenTranslations(translations);

    return (
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {flatTranslations.map(({ key, value }) => (
          <div key={key} style={{
            padding: '16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '8px',
            }}>
              {key}
            </div>
            <textarea
              value={editedTranslations[key] ?? value}
              onChange={(e) => handleTranslationChange(key, e.target.value)}
              placeholder="Enter translation..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                minHeight: '60px',
                resize: 'vertical',
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderValidationResults = () => {
    if (!validationResults) {
      return <div>Loading validation...</div>;
    }

    const { missing, invalid, stats } = validationResults;

    return (
      <div>
        {/* Stats */}
        <div style={{
          background: '#f9fafb',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            Translation Statistics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {stats.totalKeys}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Keys</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {stats.translatedKeys}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Translated</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                {stats.languages.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Languages</div>
            </div>
          </div>
        </div>

        {/* Missing Translations */}
        {missing.length > 0 && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <h4 style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
              Missing Translations ({missing.length})
            </h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {missing.slice(0, 10).map((item: string, index: number) => (
                <div key={index} style={{ fontSize: '14px', color: '#92400e' }}>
                  {item}
                </div>
              ))}
              {missing.length > 10 && (
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  ... and {missing.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invalid Translations */}
        {invalid.length > 0 && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <h4 style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>
              Invalid Translations ({invalid.length})
            </h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {invalid.map((item: string, index: number) => (
                <div key={index} style={{ fontSize: '14px', color: '#dc2626' }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success */}
        {missing.length === 0 && invalid.length === 0 && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #10b981',
            padding: '16px',
            borderRadius: '8px',
          }}>
            <h4 style={{ fontWeight: 'bold', color: '#065f46' }}>
              All translations are valid!
            </h4>
            <p style={{ fontSize: '14px', color: '#065f46', marginTop: '4px' }}>
              No missing or invalid translations found.
            </p>
          </div>
        )}
      </div>
    );
  };

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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Translation Manager</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'end', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '150px',
                }}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Namespace
              </label>
              <select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '150px',
                }}
              >
                {namespaces.map(ns => (
                  <option key={ns} value={ns}>
                    {ns}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadTranslations}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setActiveTab('edit')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'edit' ? '#3b82f6' : 'transparent',
                color: activeTab === 'edit' ? 'white' : '#6b7280',
                border: 'none',
                borderBottom: activeTab === 'edit' ? '2px solid #3b82f6' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Edit Translations
            </button>
            <button
              onClick={() => setActiveTab('validate')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'validate' ? '#3b82f6' : 'transparent',
                color: activeTab === 'validate' ? 'white' : '#6b7280',
                border: 'none',
                borderBottom: activeTab === 'validate' ? '2px solid #3b82f6' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Validation
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
          {activeTab === 'edit' ? renderTranslationEditor() : renderValidationResults()}
        </div>

        {/* Footer */}
        {activeTab === 'edit' && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={saveTranslations}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                backgroundColor: isSaving ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationManager;
