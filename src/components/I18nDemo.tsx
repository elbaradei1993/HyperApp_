import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDistance,
  formatTemperature,
  formatSpeed,
  formatFileSize,
  formatDuration,
  translateWithContext,
} from '../lib/i18nUtils';

const I18nDemo: React.FC = () => {
  const { t, i18n } = useTranslation();

  const demoData = {
    date: new Date(),
    number: 1234.56,
    currency: 99.99,
    percent: 0.85,
    distance: 2500, // meters
    temperature: 25, // celsius
    speed: 60, // km/h
    fileSize: 1048576, // bytes
    duration: 3661, // seconds
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        i18n Advanced Features Demo
      </h1>

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Date/Time Formatting */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Date/Time Formatting
          </h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Date:</strong> {formatDate(demoData.date)}</div>
            <div><strong>Time:</strong> {formatTime(demoData.date)}</div>
            <div><strong>DateTime:</strong> {formatDateTime(demoData.date)}</div>
            <div><strong>Relative:</strong> {formatRelativeTime(demoData.date)}</div>
            <div><strong>Short Date:</strong> {formatDate(demoData.date, { dateStyle: 'short' })}</div>
            <div><strong>Long Date:</strong> {formatDate(demoData.date, { dateStyle: 'long' })}</div>
          </div>
        </div>

        {/* Number/Currency Formatting */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Number/Currency Formatting
          </h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Number:</strong> {formatNumber(demoData.number)}</div>
            <div><strong>Currency (USD):</strong> {formatCurrency(demoData.currency, 'USD')}</div>
            <div><strong>Currency (EUR):</strong> {formatCurrency(demoData.currency, 'EUR')}</div>
            <div><strong>Percent:</strong> {formatPercent(demoData.percent)}</div>
            <div><strong>Integer:</strong> {formatNumber(demoData.number, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        {/* Custom Formatters */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Custom Formatters
          </h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Distance:</strong> {formatDistance(demoData.distance)}</div>
            <div><strong>Temperature (°C):</strong> {formatTemperature(demoData.temperature, 'C')}</div>
            <div><strong>Temperature (°F):</strong> {formatTemperature(demoData.temperature, 'F')}</div>
            <div><strong>Speed (km/h):</strong> {formatSpeed(demoData.speed, 'kmh')}</div>
            <div><strong>Speed (mph):</strong> {formatSpeed(demoData.speed, 'mph')}</div>
            <div><strong>File Size:</strong> {formatFileSize(demoData.fileSize)}</div>
            <div><strong>Duration:</strong> {formatDuration(demoData.duration)}</div>
          </div>
        </div>

        {/* Interpolation Examples */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Interpolation Examples
          </h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Basic:</strong> {t('common.loading')}</div>
            <div><strong>With Date:</strong> {t('app.loadingHyperApp')} - {formatDate(demoData.date)}</div>
            <div><strong>With Number:</strong> {t('reports.totalReports', { count: demoData.number })}</div>
            <div><strong>With Currency:</strong> Price: {formatCurrency(demoData.currency)}</div>
            <div><strong>With Distance:</strong> {formatDistance(demoData.distance)} away</div>
          </div>
        </div>

        {/* Context-aware Translations */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Context-aware Translations
          </h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Base:</strong> {translateWithContext('common.save', 'default')}</div>
            <div><strong>Context (form):</strong> {translateWithContext('common.save', 'form')}</div>
            <div><strong>Context (modal):</strong> {translateWithContext('common.save', 'modal')}</div>
            <div><strong>Plural (1):</strong> {t('reports.totalReports', { count: 1 })}</div>
            <div><strong>Plural (5):</strong> {t('reports.totalReports', { count: 5 })}</div>
          </div>
        </div>

        {/* Language Info */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Language Information
          </h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Current Language:</strong> {i18n.language}</div>
            <div><strong>Direction:</strong> {document.documentElement.dir || 'ltr'}</div>
            <div><strong>Available Languages:</strong> {Object.keys(i18n.services.resourceStore.data).join(', ')}</div>
            <div><strong>Namespaces:</strong> {Array.isArray(i18n.options.ns) ? i18n.options.ns.join(', ') : 'default'}</div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            Usage Instructions
          </h2>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            <p><strong>In templates:</strong> Use format functions like <code>{'{{value, date}}'}</code>, <code>{'{{value, currency}}'}</code>, etc.</p>
            <p><strong>In code:</strong> Import and use format functions from <code>../lib/i18nUtils</code></p>
            <p><strong>Context translations:</strong> Use <code>translateWithContext(key, context)</code> for context-specific translations</p>
            <p><strong>Validation:</strong> Use <code>validateTranslations()</code> to check for missing/invalid translations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default I18nDemo;
