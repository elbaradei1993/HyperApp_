import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CloudSnow,
  EyeOff,
  MapPin,
  Music,
  PartyPopper,
  Search,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { VIBE_CONFIG } from '../constants/vibes';
import { useAuth } from '../contexts/AuthContext';
import { useVibe } from '../contexts/VibeContext';
import {
  buildCommunityOverview,
  isCommunityVerified,
  selectReviewableReports,
} from '../lib/communityAnalytics';
import { calculateDistance } from '../lib/clustering';
import { reverseGeocode } from '../lib/geocoding';
import { getSafetyLevel } from '../lib/safetyAnalytics';
import { credibilityService } from '../services/credibilityService';
import { reportsService } from '../services/reports';
import type { Report, Vibe } from '../types';

import { ValidationButtons } from './CredibilityIndicator';
import { LoadingSpinner, MultiSegmentCircularProgress } from './shared';

import './CommunityDashboard.css';

interface CommunityDashboardProps {
  vibes: Vibe[];
  userLocation: [number, number] | null;
  isLoading?: boolean;
  onNewReport?: () => void;
  onNavigateToMap?: (latitude: number, longitude: number) => void;
  onNavigateToProfile?: (userId: string) => void;
  onVibesUpdate?: (vibes: Vibe[]) => void;
}

interface RealtimeSubscription {
  unsubscribe?: () => void;
}

const VIBE_ICONS: Record<string, React.ReactNode> = {
  safe: <ShieldCheck size={18} />,
  calm: <CloudSnow size={18} />,
  lively: <Music size={18} />,
  festive: <PartyPopper size={18} />,
  crowded: <Users size={18} />,
  suspicious: <EyeOff size={18} />,
  dangerous: <AlertTriangle size={18} />,
  noisy: <Volume2 size={18} />,
  quiet: <VolumeX size={18} />,
};

/* Positional palette from the approved glowing segmented-ring reference. */
const COMMUNITY_PULSE_ARC_COLORS = [
  '#22e36f',
  '#ffe20a',
  '#ffffff',
  '#d7a25c',
  '#c63df1',
  '#53c8e9',
] as const;

function reportDisplayName(report: Report): string {
  const profile = report.profile;
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  return fullName || profile?.username || `User ${report.user_id.slice(0, 6)}`;
}

function reportInitials(report: Report): string {
  return reportDisplayName(report)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const CommunityDashboard: React.FC<CommunityDashboardProps> = ({
  vibes,
  userLocation,
  isLoading = false,
  onNavigateToMap,
  onNavigateToProfile,
  onVibesUpdate,
}) => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { setCurrentLocationVibe } = useVibe();
  const [currentLocationAddress, setCurrentLocationAddress] = useState('');
  const [search, setSearch] = useState('');
  const [userValidations, setUserValidations] = useState<Record<number, 'confirm' | 'deny' | null>>({});
  const [validatingReportId, setValidatingReportId] = useState<number | null>(null);
  const subscriptionsRef = useRef<Record<string, RealtimeSubscription>>({});
  const latestVibesRef = useRef(vibes);

  useEffect(() => {
    latestVibesRef.current = vibes;
  }, [vibes]);

  const locale = i18n.resolvedLanguage || i18n.language || 'en-CA';
  const overview = useMemo(
    () => buildCommunityOverview(vibes, new Date(), locale),
    [vibes, locale],
  );

  const reviewableReports = useMemo(() => selectReviewableReports(
    overview.weeklyReports,
    user?.id,
    10,
  ), [overview.weeklyReports, user?.id]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    if (!query) {
      return reviewableReports;
    }

    return reviewableReports.filter((report) => [
      reportDisplayName(report),
      report.location,
      report.notes,
      String(t(`vibes.${report.vibe_type}`, report.vibe_type)),
    ].some((value) => value?.toLocaleLowerCase(locale).includes(query)));
  }, [locale, reviewableReports, search, t]);

  const pulseSegments = useMemo(() => {
    const leadingSegments = overview.distribution.slice(0, 5);
    const remainingPercentage = overview.distribution
      .slice(5)
      .reduce((total, item) => total + item.percentage, 0);
    const visibleSegments = remainingPercentage > 0
      ? [...leadingSegments, { type: 'other', percentage: remainingPercentage }]
      : overview.distribution.slice(0, 6);

    return visibleSegments.map((item, index) => ({
      percentage: item.percentage,
      color: COMMUNITY_PULSE_ARC_COLORS[index],
      label: item.type,
    }));
  }, [overview.distribution]);
  const leadingVibe = overview.distribution[0] ?? null;

  const periodLabel = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    return `${formatter.format(start)} – ${formatter.format(new Date())}`;
  }, [locale]);

  useEffect(() => {
    let active = true;

    const analyzeCurrentLocation = async () => {
      if (!userLocation) {
        setCurrentLocationAddress('');
        setCurrentLocationVibe(null);
        return;
      }

      const nearby = vibes.filter((report) => (
        Number.isFinite(report.latitude)
        && Number.isFinite(report.longitude)
        && calculateDistance(userLocation[0], userLocation[1], report.latitude, report.longitude) <= 1
      ));
      const counts = new Map<string, number>();
      nearby.forEach((report) => counts.set(report.vibe_type, (counts.get(report.vibe_type) ?? 0) + 1));
      const dominant = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];

      if (dominant) {
        const [type, count] = dominant;
        setCurrentLocationVibe({
          type,
          count,
          percentage: Math.round((count / nearby.length) * 100),
          color: VIBE_CONFIG[type as keyof typeof VIBE_CONFIG]?.color || '#64748b',
        });
      } else {
        setCurrentLocationVibe(null);
      }

      try {
        const address = await reverseGeocode(userLocation[0], userLocation[1]);
        if (active) {
          setCurrentLocationAddress(address);
        }
      } catch {
        if (active) {
          setCurrentLocationAddress('');
        }
      }
    };

    void analyzeCurrentLocation();
    return () => {
      active = false;
    };
  }, [setCurrentLocationVibe, userLocation, vibes]);

  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      setUserValidations({});
      return;
    }

    let active = true;
    const loadValidations = async () => {
      const entries = await Promise.all(reviewableReports.map(async (report) => (
        [report.id, await credibilityService.getUserValidation(report.id, user.id)] as const
      )));
      if (active) {
        setUserValidations(Object.fromEntries(entries));
      }
    };

    void loadValidations();
    return () => {
      active = false;
    };
  }, [isAuthenticated, reviewableReports, user?.id]);

  const handleValidation = useCallback(async (reportId: number, type: 'confirm' | 'deny') => {
    if (!user?.id) {
      return;
    }

    setValidatingReportId(reportId);
    const success = await credibilityService.validateReport(reportId, user.id, type);
    if (success) {
      setUserValidations((current) => ({ ...current, [reportId]: type }));
    }
    setValidatingReportId(null);
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.onboarding_completed) {
      return;
    }

    const updateReport = (reportId: number, changes: Partial<Vibe>) => {
      onVibesUpdate?.(latestVibesRef.current.map((report) => (
        report.id === reportId ? { ...report, ...changes } : report
      )));
    };

    subscriptionsRef.current.reports = reportsService.subscribeToReports((newReport) => {
      if (!newReport.emergency) {
        onVibesUpdate?.([newReport, ...latestVibesRef.current.filter(({ id }) => id !== newReport.id)].slice(0, 1000));
      }
    });
    subscriptionsRef.current.votes = reportsService.subscribeToVotes((update) => {
      updateReport(update.reportId, { upvotes: update.upvotes, downvotes: update.downvotes });
    });
    subscriptionsRef.current.credibility = reportsService.subscribeToCredibilityUpdates((update) => {
      updateReport(update.reportId, {
        credibility_score: update.credibility_score,
        validation_count: update.validation_count,
      });
    });

    return () => {
      Object.values(subscriptionsRef.current).forEach((subscription) => subscription.unsubscribe?.());
      subscriptionsRef.current = {};
    };
  }, [isAuthenticated, onVibesUpdate, user?.onboarding_completed]);

  const safetyLevel = overview.safetyScore === null ? null : getSafetyLevel(overview.safetyScore);
  if (isLoading) {
    return (
      <div className="community-loading" role="status" aria-live="polite">
        <LoadingSpinner size="lg" />
        <span>{t('community.loadingCommunityData', 'Loading community safety data…')}</span>
      </div>
    );
  }

  return (
    <section className="community-dashboard page-view page-view--community">
      <header className="community-dashboard__header">
        <div>
          <span className="community-dashboard__eyebrow">{t('tabs.community', 'Community')}</span>
          <h1>{t('community.safetyOverview', 'Safety Overview')}</h1>
          <p>{t('community.dashboardSubtitle', 'Live insights from reports currently available to you.')}</p>
        </div>
      </header>

      <div className="community-dashboard__body">
        <div className="community-filterbar" aria-label={String(t('community.dashboardFilters', 'Dashboard filters'))}>
          <span className="community-filterbar__period">
            <CalendarDays size={15} aria-hidden="true" />
            <strong>{t('community.lastSevenDays', 'Last 7 days')}</strong>
            <span>{periodLabel}</span>
          </span>
          <span className="community-filterbar__location">
            <MapPin size={15} aria-hidden="true" />
            {currentLocationAddress || (userLocation
              ? t('community.locationAvailable', 'Current location available')
              : t('community.locationUnavailable', 'Location unavailable'))}
          </span>
        </div>

        <div className="community-overview-grid">
          <article className="community-panel community-panel--distribution">
            <div className="community-panel__header">
              <div>
                <span className="community-panel__kicker">{t('community.reportMix', 'Report mix')}</span>
                <h2>{t('community.communityPulse', 'Community pulse')}</h2>
              </div>
            </div>

            <div className="community-pulse-chart">
              {leadingVibe ? (
                <div
                  className="community-pulse-donut"
                  role="img"
                  aria-label={`${leadingVibe.percentage}% ${t(`vibes.${leadingVibe.type}`, leadingVibe.type)}`}
                >
                  <MultiSegmentCircularProgress
                    segments={pulseSegments}
                    size={204}
                    strokeWidth={22}
                    segmentGap={3.4}
                    glow
                    startAngle={-105}
                    backgroundColor="transparent"
                    animationDuration={1400}
                    className="community-pulse-progress"
                    centerContent={(
                      <div className="community-pulse-center">
                        <strong>{leadingVibe.percentage}%</strong>
                        <span>{t(`vibes.${leadingVibe.type}`, leadingVibe.type)}</span>
                      </div>
                    )}
                  />
                </div>
              ) : (
                <div className="community-empty-state">
                  <ShieldCheck size={24} aria-hidden="true" />
                  <strong>{t('community.noReportsInPeriod', 'No reports in this period')}</strong>
                  <span>{t('community.noReportsDescription', 'Submit a report to start the community overview.')}</span>
                </div>
              )}
            </div>
          </article>

          <div className="community-insight-stack">
            <article className="community-panel community-score-panel">
              <div className="community-score-summary">
                <div
                  className="community-score-value"
                  aria-label={overview.safetyScore === null
                    ? String(t('community.noSafetyScore', 'No safety score available'))
                    : `${overview.safetyScore} ${t('community.safetyScore', 'safety score')}`}
                >
                  <strong>{overview.safetyScore ?? '—'}</strong>
                  <span>{overview.safetyScore === null ? t('community.awaitingData', 'Awaiting data') : '/100'}</span>
                </div>
                <div>
                  <span className="community-panel__kicker">{t('community.safetyScore', 'Safety score')}</span>
                  <h2>{safetyLevel
                    ? t(`community.safetyLevels.${safetyLevel.level}`, safetyLevel.description)
                    : t('community.notEnoughData', 'Not enough data')}</h2>
                  <p>{overview.scoreDelta === null
                    ? t('community.noPreviousComparison', 'A comparison appears after both weeks have reports.')
                    : t('community.scoreChange', '{{value}} points from the previous week', {
                      value: `${overview.scoreDelta > 0 ? '+' : ''}${overview.scoreDelta}`,
                    })}</p>
                </div>
              </div>

              <div className="community-risk-grid">
                <div><span className="community-risk-icon community-risk-icon--red"><AlertTriangle size={16} /></span><strong>{overview.attentionReports}</strong><small>{t('community.attentionReports', 'Attention reports')}</small></div>
                <div><span className="community-risk-icon community-risk-icon--amber"><Users size={16} /></span><strong>{overview.crowdedReports}</strong><small>{t('community.crowdedReports', 'Crowded reports')}</small></div>
                <div><span className="community-risk-icon community-risk-icon--blue"><CheckCircle2 size={16} /></span><strong>{overview.unverifiedReports}</strong><small>{t('community.unverifiedReports', 'Unverified reports')}</small></div>
              </div>
            </article>

            <article className="community-panel community-trend-panel">
              <div className="community-panel__header">
                <div>
                  <span className="community-panel__kicker">{t('community.sevenDayView', 'Seven-day view')}</span>
                  <h2>{t('community.safetyTrend', 'Safety trend')}</h2>
                </div>
                <span className="community-target"><i />{t('community.target', 'Target')} 70</span>
              </div>
              <div className="community-trend-chart" aria-label={String(t('community.safetyTrend', 'Safety trend'))}>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={1}
                  minHeight={190}
                  initialDimension={{ width: 360, height: 210 }}
                >
                  <LineChart data={overview.trend} margin={{ top: 12, right: 12, bottom: 0, left: -22 }}>
                    <CartesianGrid vertical={false} stroke="#e6ebf1" strokeDasharray="3 4" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#7c8798', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fill: '#7c8798', fontSize: 10 }} />
                    <Tooltip
                      cursor={{ stroke: '#9fb7b1', strokeDasharray: '3 3' }}
                      contentStyle={{ border: '1px solid #dce5e1', borderRadius: 12, boxShadow: '0 14px 32px rgba(15, 23, 42, 0.1)', fontSize: 12 }}
                    />
                    <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="score" name={String(t('community.safetyScore', 'Safety score'))} stroke="#0b7d66" strokeWidth={3} dot={{ r: 3, fill: '#fff', stroke: '#0b7d66', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#0b7d66', stroke: '#fff', strokeWidth: 2 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="community-trend-stats">
                <span><strong>{overview.weeklyReports.length}</strong>{t('community.weeklyReports', 'Weekly reports')}</span>
                <span><strong>{overview.activeDays}/7</strong>{t('community.reportedDays', 'Reported days')}</span>
                <span><strong>{overview.aboveTargetDays}</strong>{t('community.daysAboveTarget', 'Days above target')}</span>
              </div>
            </article>
          </div>

          <article className="community-panel community-reports-panel">
            <div className="community-panel__header community-reports-header">
              <div>
                <span className="community-panel__kicker">{t('community.activity', 'Activity')}</span>
                <h2>{t('community.recentReports', 'Recent reports')}</h2>
              </div>
              <label className="community-search">
                <Search size={20} strokeWidth={2.1} aria-hidden="true" />
                <span className="sr-only">{t('community.searchReports', 'Search reports')}</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={String(t('community.searchReports', 'Search reports'))}
                />
              </label>
            </div>

            <div className="community-report-table" role="table" aria-label={String(t('community.recentReports', 'Recent reports'))}>
              <div className="community-report-row community-report-row--head" role="row">
                <span role="columnheader">{t('community.reporter', 'Reporter')}</span>
                <span role="columnheader">{t('community.atmosphere', 'Atmosphere')}</span>
                <span role="columnheader">{t('community.location', 'Location')}</span>
                <span role="columnheader">{t('community.verification', 'Verification')}</span>
                <span role="columnheader">{t('community.time', 'Time')}</span>
                <span role="columnheader">{t('community.actions', 'Actions')}</span>
              </div>
              {filteredReports.length > 0 ? filteredReports.map((report) => {
                const verified = isCommunityVerified(report);
                return (
                  <div className="community-report-row" role="row" key={report.id}>
                    <span role="cell">
                      <button className="community-reporter" type="button" onClick={() => onNavigateToProfile?.(report.user_id)} disabled={!onNavigateToProfile}>
                        <span className="community-reporter__avatar">{reportInitials(report)}</span>
                        <span><strong>{reportDisplayName(report)}</strong><small>{report.profile?.verification_level || t('community.communityMember', 'Community member')}</small></span>
                      </button>
                    </span>
                    <span className="community-report-vibe" role="cell" data-label={t('community.atmosphere', 'Atmosphere')}>
                      <i style={{ color: VIBE_CONFIG[report.vibe_type as keyof typeof VIBE_CONFIG]?.color || '#64748b' }}>
                        {VIBE_ICONS[report.vibe_type] || <ShieldCheck size={18} />}
                      </i>
                      {t(`vibes.${report.vibe_type}`, report.vibe_type)}
                    </span>
                    <span className="community-report-location" role="cell" data-label={t('community.location', 'Location')} title={report.location || ''}>
                      {report.location?.trim() || t('community.unknownLocation', 'Unknown location')}
                    </span>
                    <span className={`community-verification-badge ${verified ? 'is-verified' : ''}`} role="cell" data-label={t('community.verification', 'Verification')}>
                      {verified ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {verified ? t('community.communityVerified', 'Community verified') : t('community.unverified', 'Unverified')}
                    </span>
                    <time role="cell" dateTime={report.created_at} data-label={t('community.time', 'Time')}>
                      {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(report.created_at))}
                    </time>
                    <span className="community-report-actions" role="cell">
                      <ValidationButtons
                        reportId={report.id}
                        userValidation={userValidations[report.id] ?? null}
                        onValidate={(type) => void handleValidation(report.id, type)}
                        disabled={report.user_id === user?.id}
                        isAuthenticated={isAuthenticated}
                        isValidating={validatingReportId === report.id}
                        userVerificationLevel={user?.verification_level || 'basic'}
                        size="sm"
                      />
                      {onNavigateToMap && Number.isFinite(report.latitude) && Number.isFinite(report.longitude) && (
                        <button className="community-map-link" type="button" onClick={() => onNavigateToMap(report.latitude, report.longitude)} aria-label={String(t('community.viewOnMap', 'View on map'))}>
                          <MapPin size={14} />
                        </button>
                      )}
                    </span>
                  </div>
                );
              }) : (
                <div className="community-table-empty">
                  {search
                    ? t('community.noMatchingReports', 'No reports match your search.')
                    : t('community.noReportsToReview', 'No reports from other community members are available to review.')}
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default CommunityDashboard;
