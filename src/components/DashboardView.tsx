import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Compass,
  MapPin,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import { getSafetyLevel } from '../lib/safetyAnalytics';
import {
  buildAreaSummaries,
  buildAttentionItems,
  buildDashboardMetrics,
  buildVibeDistribution,
  buildWeeklyTrend,
} from '../lib/dashboardAnalytics';
import type { SOS, Vibe } from '../types';

import { CircularProgress } from './shared';
import './DashboardView.css';

const VoiceChatModal = React.lazy(() => import('./VoiceChatModal'));

/* eslint-disable no-unused-vars -- the legacy base rule misreads TypeScript callback signatures */
interface DashboardViewProps {
  vibes: Vibe[];
  sosAlerts: SOS[];
  userLocation: [number, number] | null;
  locationCapturedAt?: string;
  locationPermissionStatus?: 'granted' | 'denied' | 'prompt' | 'unavailable';
  onNewReport: () => void;
  onNavigate: (tab: 'map' | 'reports') => void;
  onNavigateToMap: (latitude: number, longitude: number) => void;
}
/* eslint-enable no-unused-vars */

const VIBE_COLORS: Record<string, string> = {
  safe: '#10b981',
  calm: '#3b82f6',
  quiet: '#06b6d4',
  lively: '#f59e0b',
  festive: '#8b5cf6',
  crowded: '#ef4444',
  suspicious: '#f97316',
  dangerous: '#dc2626',
  noisy: '#eab308',
  streetlight: '#6366f1',
  sidewalk: '#64748b',
  construction: '#f59e0b',
  pothole: '#b45309',
  traffic: '#ef4444',
  other: '#6b7280',
};

function formatRelativeTime(value: string, locale: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diffMinutes = Math.round((timestamp - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }
  return formatter.format(Math.round(diffHours / 24), 'day');
}

function getGreetingKey(date: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = date.getHours();
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  return 'evening';
}

const DashboardView: React.FC<DashboardViewProps> = ({
  vibes,
  sosAlerts,
  userLocation,
  locationCapturedAt,
  locationPermissionStatus,
  onNewReport,
  onNavigate,
  onNavigateToMap,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const now = useMemo(() => new Date(), []);
  const locale = i18n.language || 'en-CA';
  const allReports = useMemo(() => [...vibes, ...sosAlerts], [vibes, sosAlerts]);
  const metrics = useMemo(
    () => buildDashboardMetrics(vibes, sosAlerts, user?.id, now),
    [vibes, sosAlerts, user?.id, now],
  );
  const weeklyTrend = useMemo(
    () => buildWeeklyTrend(allReports, now, locale),
    [allReports, now, locale],
  );
  const distribution = useMemo(
    () => buildVibeDistribution(vibes, now),
    [vibes, now],
  );
  const attentionItems = useMemo(
    () => buildAttentionItems(vibes, sosAlerts, now),
    [vibes, sosAlerts, now],
  );
  const areas = useMemo(
    () => buildAreaSummaries(allReports, now),
    [allReports, now],
  );

  const safetyLevel = metrics.safetyScore === null
    ? { description: String(t('dashboard.noData')), color: '#94a3b8' }
    : getSafetyLevel(metrics.safetyScore);
  const displayName = user?.first_name || user?.username || String(t('dashboard.neighbour'));
  const greetingKey = getGreetingKey(now);
  const hasTrendData = weeklyTrend.some((point) => point.reports > 0);

  const goals = [
    { label: String(t('dashboard.goals.firstPulse')), complete: metrics.monthlyUserReports >= 1 },
    { label: String(t('dashboard.goals.stayActive')), complete: metrics.monthlyUserReports >= 2 },
    { label: String(t('dashboard.goals.communityVoice')), complete: metrics.monthlyUserReports >= 4 },
    { label: String(t('dashboard.goals.trustedProfile')), complete: user?.verification_level !== 'basic' && Boolean(user?.verification_level) },
  ];

  return (
    <section className="dashboard-view" aria-labelledby="dashboard-title">
      <div className="dashboard-workspace">
        <header className="dashboard-page-header">
          <div>
            <div className="dashboard-eyebrow">
              <span className="dashboard-live-dot" />
              {t('dashboard.liveOverview')}
            </div>
            <h1 id="dashboard-title">
              {t(`dashboard.greetings.${greetingKey}`)}, {displayName}!
            </h1>
            <p>
              {userLocation
                ? t('dashboard.locationReady')
                : t('dashboard.locationUnavailable')}
            </p>
          </div>
          <button className="dashboard-ai-action" type="button" onClick={() => setIsAssistantOpen(true)}>
            <span className="dashboard-ai-action-icon" aria-hidden="true"><Sparkles size={17} /></span>
            <span className="dashboard-ai-action-copy">
              <small>Hyper AI</small>
              <strong>Ask assistant</strong>
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="dashboard-grid">
          <article className="dashboard-panel dashboard-overall-card">
            <div className="dashboard-panel-heading dashboard-panel-heading--dark">
              <div>
                <span>{t('dashboard.overall.title')}</span>
                <small>{t('dashboard.overall.period')}</small>
              </div>
              <Sparkles size={18} aria-hidden="true" />
            </div>

            <div className="dashboard-overall-numbers">
              <div>
                <strong>{metrics.reportsToday}</strong>
                <span>{t('dashboard.metrics.reportsToday')}</span>
              </div>
              <div>
                <strong>{metrics.activeAlerts}</strong>
                <span>{t('dashboard.metrics.activeAlerts')}</span>
              </div>
            </div>

            <div className="dashboard-overall-track" aria-hidden="true">
              <span style={{ width: `${metrics.safetyScore ?? 0}%` }} />
            </div>

            <div className="dashboard-overall-mini-grid">
              <div>
                <ShieldCheck size={17} />
                <strong>{metrics.safetyScore === null ? '—' : `${metrics.safetyScore}%`}</strong>
                <span>{t('dashboard.metrics.safety')}</span>
              </div>
              <div>
                <Users size={17} />
                <strong>{metrics.contributors}</strong>
                <span>{t('dashboard.metrics.contributors')}</span>
              </div>
              <div>
                <Radio size={17} />
                <strong>{metrics.weeklyReports}</strong>
                <span>{t('dashboard.metrics.weeklyReports')}</span>
              </div>
            </div>
          </article>

          <article className="dashboard-panel dashboard-trend-card">
            <div className="dashboard-panel-heading">
              <div>
                <span>{t('dashboard.trend.title')}</span>
                <small>{t('dashboard.trend.subtitle')}</small>
              </div>
              <div className="dashboard-status-chip" style={{ color: safetyLevel.color }}>
                <span style={{ background: safetyLevel.color }} />
                {safetyLevel.description}
              </div>
            </div>

            <div className="dashboard-chart" aria-label={String(t('dashboard.trend.chartLabel'))}>
              {hasTrendData ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={1}
                  minHeight={190}
                  initialDimension={{ width: 360, height: 225 }}
                >
                  <AreaChart data={weeklyTrend} margin={{ top: 14, right: 12, left: 10, bottom: 2 }}>
                    <defs>
                      <linearGradient id="dashboardSafetyFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0b7d66" stopOpacity={0.24} />
                        <stop offset="95%" stopColor="#0b7d66" stopOpacity={0.015} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgba(92, 99, 95, 0.14)" strokeDasharray="2 5" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }} />
                    <YAxis width={42} domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }} tickFormatter={(value) => `${value}%`} />
                    <Tooltip
                      cursor={{ stroke: 'rgba(55, 65, 61, 0.35)', strokeDasharray: '3 3' }}
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.88)',
                        backgroundColor: 'rgba(255, 255, 255, 0.78)',
                        boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
                        backdropFilter: 'blur(16px) saturate(145%)',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [`${value ?? 0}%`, String(t('dashboard.metrics.safety'))]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#0b7d66"
                      strokeWidth={2.25}
                      fill="url(#dashboardSafetyFill)"
                      connectNulls
                      dot={{ r: 3, fill: '#ffffff', stroke: '#0b7d66', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: '#0b7d66', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-chart-empty">
                  <Activity size={24} />
                  <span>{t('dashboard.trend.empty')}</span>
                </div>
              )}
            </div>
          </article>

          <article className="dashboard-panel dashboard-progress-card">
            <div className="dashboard-panel-heading">
              <div>
                <span>{t('dashboard.progress.title')}</span>
                <small>{t('dashboard.progress.subtitle')}</small>
              </div>
              <Target size={18} aria-hidden="true" />
            </div>

            <div className="dashboard-progress-content">
              <CircularProgress
                percentage={metrics.monthlyGoalProgress}
                size={122}
                strokeWidth={10}
                color="#111318"
                backgroundColor="rgba(17, 19, 24, 0.1)"
              />
              <div className="dashboard-progress-copy">
                <strong>{metrics.monthlyUserReports}/{metrics.monthlyGoal}</strong>
                <span>{t('dashboard.progress.reports')}</span>
              </div>
            </div>

            <div className="dashboard-vibe-legend">
              {distribution.length > 0 ? distribution.slice(0, 3).map((item) => (
                <div key={item.type}>
                  <span style={{ background: VIBE_COLORS[item.type] ?? '#6b7280' }} />
                  <span>{t(`vibes.${item.type}`, item.type)}</span>
                  <strong>{item.percentage}%</strong>
                </div>
              )) : (
                <p>{t('dashboard.progress.empty')}</p>
              )}
            </div>

            <button className="dashboard-text-action" type="button" onClick={() => onNavigate('reports')}>
              {t('dashboard.viewCommunity')}
              <ArrowUpRight size={15} />
            </button>
          </article>

          <article className="dashboard-panel dashboard-goals-card">
            <div className="dashboard-panel-heading">
              <div>
                <span>{t('dashboard.goals.title')}</span>
                <small>{goals.filter((goal) => goal.complete).length}/{goals.length} {t('dashboard.goals.complete')}</small>
              </div>
              <div className="dashboard-fraction">{goals.filter((goal) => goal.complete).length}/{goals.length}</div>
            </div>
            <div className="dashboard-goals-list">
              {goals.map((goal) => (
                <div key={goal.label} className={goal.complete ? 'is-complete' : ''}>
                  <span>{goal.complete && <Check size={12} />}</span>
                  <p>{goal.label}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel dashboard-attention-card">
            <div className="dashboard-panel-heading">
              <div>
                <span>{t('dashboard.attention.title')} ({attentionItems.length})</span>
                <small>{t('dashboard.attention.subtitle')}</small>
              </div>
              <button type="button" onClick={() => onNavigate('reports')}>
                {t('dashboard.viewAll')}
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="dashboard-attention-grid">
              {attentionItems.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  className="dashboard-attention-item"
                  type="button"
                  onClick={() => onNavigateToMap(item.latitude, item.longitude)}
                >
                  <div className={`dashboard-attention-icon dashboard-attention-icon--${item.type}`}>
                    {item.type === 'alert' ? <CircleAlert size={18} /> : <Activity size={18} />}
                  </div>
                  <div>
                    <strong>{item.type === 'alert' ? t('dashboard.attention.emergency') : t(`vibes.${item.vibeType}`, item.vibeType)}</strong>
                    <span><MapPin size={12} /> {item.location}</span>
                    <small><Clock3 size={12} /> {formatRelativeTime(item.createdAt, locale)}</small>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}

              {attentionItems.length === 0 && (
                <div className="dashboard-clear-state">
                  <ShieldCheck size={24} />
                  <div>
                    <strong>{t('dashboard.attention.clearTitle')}</strong>
                    <span>{t('dashboard.attention.clearSubtitle')}</span>
                  </div>
                </div>
              )}

              <button className="dashboard-add-report-card" type="button" onClick={onNewReport}>
                <Plus size={18} />
                <span>{t('dashboard.attention.add')}</span>
              </button>
            </div>
          </article>

          <article className="dashboard-panel dashboard-areas-card">
            <div className="dashboard-panel-heading">
              <div>
                <span>{t('dashboard.areas.title')}</span>
                <small>{t('dashboard.areas.subtitle')}</small>
              </div>
              <button type="button" onClick={() => onNavigate('map')}>
                {t('dashboard.openMap')}
                <Compass size={15} />
              </button>
            </div>

            <div className="dashboard-area-grid">
              {areas.map((area) => (
                <button
                  key={area.key}
                  className="dashboard-area-item"
                  type="button"
                  onClick={() => onNavigateToMap(area.latitude, area.longitude)}
                >
                  <div className="dashboard-area-title">
                    <div>
                      <MapPin size={15} />
                      <strong>{area.label}</strong>
                    </div>
                    <span>{area.safetyScore}%</span>
                  </div>
                  <p>{area.reports} {t('dashboard.areas.reports')}</p>
                  <div className="dashboard-area-track"><span style={{ width: `${area.safetyScore}%` }} /></div>
                  <small>{t('dashboard.areas.updated')} {formatRelativeTime(area.lastUpdated, locale)}</small>
                </button>
              ))}

              {areas.length === 0 && (
                <button className="dashboard-area-item dashboard-area-item--empty" type="button" onClick={onNewReport}>
                  <Plus size={20} />
                  <strong>{t('dashboard.areas.emptyTitle')}</strong>
                  <span>{t('dashboard.areas.emptySubtitle')}</span>
                </button>
              )}
            </div>
          </article>
        </div>
      </div>
      {isAssistantOpen && (
        <React.Suspense fallback={null}>
          <VoiceChatModal
            isOpen
            onClose={() => setIsAssistantOpen(false)}
            userLocation={userLocation}
            locationCapturedAt={locationCapturedAt}
            locationPermissionStatus={locationPermissionStatus}
            onNavigate={(tab) => {
              setIsAssistantOpen(false);
              onNavigate(tab);
            }}
            onNewReport={() => {
              setIsAssistantOpen(false);
              onNewReport();
            }}
          />
        </React.Suspense>
      )}
    </section>
  );
};

export default DashboardView;
