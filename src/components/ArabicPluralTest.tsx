import React from 'react';
import { useTranslation } from 'react-i18next';

const ArabicPluralTest: React.FC = () => {
  const { t, i18n } = useTranslation();

  const testCounts = [0, 1, 2, 3, 5, 11, 25, 100];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Arabic Pluralization Test</h2>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => i18n.changeLanguage('en')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            background: i18n.language === 'en' ? '#007bff' : '#f8f9fa',
            color: i18n.language === 'en' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          English
        </button>
        <button
          onClick={() => i18n.changeLanguage('ar')}
          style={{
            padding: '10px 20px',
            background: i18n.language === 'ar' ? '#007bff' : '#f8f9fa',
            color: i18n.language === 'ar' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          العربية
        </button>
      </div>

      <div style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>
        <h3>Reports Pluralization:</h3>
        <ul>
          {testCounts.map(count => (
            <li key={count} style={{ marginBottom: '10px' }}>
              <strong>{count}</strong> {t('community.reports', { count })}
            </li>
          ))}
        </ul>

        <h3>Time Ago Pluralization:</h3>
        <ul>
          {testCounts.slice(1).map(count => (
            <li key={`time-${count}`} style={{ marginBottom: '10px' }}>
              <strong>{count}</strong> {t('profile.timeAgo.minutesAgo', { count })}
            </li>
          ))}
        </ul>

        <h3>Hours Ago Pluralization:</h3>
        <ul>
          {testCounts.slice(1).map(count => (
            <li key={`hours-${count}`} style={{ marginBottom: '10px' }}>
              <strong>{count}</strong> {t('profile.timeAgo.hoursAgo', { count })}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ArabicPluralTest;
