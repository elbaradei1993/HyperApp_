import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Bell,
  Car,
  CheckCircle2,
  CloudSnow,
  Edit3,
  EyeOff,
  FileText,
  Lightbulb,
  LockKeyhole,
  Mail,
  MapPin,
  MoreHorizontal,
  Music,
  PartyPopper,
  Plus,
  Route,
  Settings,
  ShieldCheck,
  Star,
  ThumbsUp,
  Triangle,
  User as UserIcon,
  Users,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';

import { VIBE_CONFIG } from '../constants/vibes';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { isCommunityVerified } from '../lib/communityAnalytics';
import { guardianService } from '../services/guardian';
import { reportsService } from '../services/reports';
import type { Vibe } from '../types';

import EditProfileModal from './EditProfileModal';
import SettingsView from './SettingsView';
import { LoadingSpinner } from './shared';

import './ProfileView.css';

type ProfileTab = 'activity' | 'safety' | 'credentials' | 'preferences';

interface ProfileViewProps {
  onNewReport?: () => void;
}

interface GuardianStats {
  totalGuardians: number;
  activeSOSAlerts: number;
  pendingInvitations: number;
}

interface RealtimeSubscription {
  unsubscribe?: () => void;
}

const VIBE_ICONS: Record<string, React.ReactNode> = {
  safe: <ShieldCheck size={24} />,
  calm: <CloudSnow size={24} />,
  lively: <Music size={24} />,
  festive: <PartyPopper size={24} />,
  crowded: <Users size={24} />,
  suspicious: <EyeOff size={24} />,
  dangerous: <AlertTriangle size={24} />,
  noisy: <Volume2 size={24} />,
  quiet: <VolumeX size={24} />,
  streetlight: <Lightbulb size={24} />,
  sidewalk: <Route size={24} />,
  construction: <Wrench size={24} />,
  pothole: <Triangle size={24} />,
  traffic: <Car size={24} />,
  other: <Settings size={24} />,
};

const ProfileView: React.FC<ProfileViewProps> = ({ onNewReport }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { settings, isLoading: settingsLoading } = useSettings();
  const [reports, setReports] = useState<Vibe[]>([]);
  const [guardianStats, setGuardianStats] = useState<GuardianStats | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('activity');
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionsRef = useRef<RealtimeSubscription[]>([]);
  const locale = i18n.resolvedLanguage || i18n.language || 'en-CA';

  useEffect(() => {
    if (!user?.id) {
      setReports([]);
      setGuardianStats(null);
      setLoading(false);
      return;
    }

    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      const [reportsResult, guardiansResult] = await Promise.allSettled([
        reportsService.getReports({ userId: user.id }),
        guardianService.getGuardianStats(user.id),
      ]);

      if (!active) {
        return;
      }

      if (reportsResult.status === 'fulfilled') {
        setReports(reportsResult.value);
      } else {
        setReports([]);
        setError(String(t('profile.loadError', 'Some profile activity could not be loaded.')));
      }

      setGuardianStats(guardiansResult.status === 'fulfilled' ? guardiansResult.value : null);
      setLoading(false);
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [t, user?.id]);

  useEffect(() => {
    if (!user?.id || !user.onboarding_completed) {
      return;
    }

    const reportSubscription = reportsService.subscribeToReports((newReport) => {
      if (newReport.user_id === user.id) {
        setReports((current) => [newReport, ...current.filter(({ id }) => id !== newReport.id)]);
      }
    });
    const voteSubscription = reportsService.subscribeToVotes((update) => {
      setReports((current) => current.map((report) => (
        report.id === update.reportId
          ? { ...report, upvotes: update.upvotes, downvotes: update.downvotes }
          : report
      )));
    });
    const credibilitySubscription = reportsService.subscribeToCredibilityUpdates((update) => {
      setReports((current) => current.map((report) => (
        report.id === update.reportId
          ? {
            ...report,
            credibility_score: update.credibility_score,
            validation_count: update.validation_count,
          }
          : report
      )));
    });

    subscriptionsRef.current = [reportSubscription, voteSubscription, credibilitySubscription];
    return () => {
      subscriptionsRef.current.forEach((subscription) => subscription.unsubscribe?.());
      subscriptionsRef.current = [];
    };
  }, [user?.id, user?.onboarding_completed]);

  const sortedReports = useMemo(() => [...reports].sort((a, b) => (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )), [reports]);
  const totalUpvotes = useMemo(() => reports.reduce((total, report) => total + (report.upvotes ?? 0), 0), [reports]);
  const verifiedReports = useMemo(() => reports.filter(isCommunityVerified).length, [reports]);
  const profileName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    || user?.username
    || t('profile.user', 'HyperApp user');
  const verificationLevel = user?.verification_level || 'basic';

  const credentials = useMemo(() => [
    {
      id: 'verification',
      icon: <ShieldCheck size={22} />,
      title: t('profile.verificationStatus', 'Verification status'),
      value: t(`profile.verificationLevels.${verificationLevel}`, verificationLevel),
      active: verificationLevel === 'verified' || verificationLevel === 'trusted',
    },
    {
      id: 'email',
      icon: <Mail size={22} />,
      title: t('profile.emailVerification', 'Email verification'),
      value: user?.email_verified
        ? t('profile.verified', 'Verified')
        : t('profile.notVerified', 'Not verified'),
      active: Boolean(user?.email_verified),
    },
    {
      id: 'community',
      icon: <Users size={22} />,
      title: t('profile.communityGuard', 'Community Guard'),
      value: verificationLevel === 'trusted'
        ? t('profile.active', 'Active')
        : t('profile.notActive', 'Not active'),
      active: verificationLevel === 'trusted',
    },
    {
      id: 'reports',
      icon: <CheckCircle2 size={22} />,
      title: t('profile.verifiedContributions', 'Verified contributions'),
      value: String(verifiedReports),
      active: verifiedReports > 0,
    },
  ], [t, user?.email_verified, verificationLevel, verifiedReports]);

  const safetyItems = [
    {
      icon: <Users size={20} />,
      label: t('profile.guardianAngels', 'Guardian Angels'),
      value: guardianStats ? String(guardianStats.totalGuardians) : '—',
      tone: 'blue',
    },
    {
      icon: <MapPin size={20} />,
      label: t('profile.locationSharing', 'Location sharing'),
      value: settingsLoading
        ? t('common.loading', 'Loading')
        : settings.locationSharing ? t('common.on', 'On') : t('common.off', 'Off'),
      tone: settings.locationSharing ? 'green' : 'gray',
    },
    {
      icon: <Bell size={20} />,
      label: t('profile.notifications', 'Notifications'),
      value: settingsLoading
        ? t('common.loading', 'Loading')
        : settings.notifications ? t('common.on', 'On') : t('common.off', 'Off'),
      tone: settings.notifications ? 'green' : 'gray',
    },
    {
      icon: <AlertTriangle size={20} />,
      label: t('profile.activeAlerts', 'Active alerts'),
      value: guardianStats ? String(guardianStats.activeSOSAlerts) : '—',
      tone: guardianStats?.activeSOSAlerts ? 'red' : 'gray',
    },
    {
      icon: <Mail size={20} />,
      label: t('profile.pendingInvitations', 'Pending invitations'),
      value: guardianStats ? String(guardianStats.pendingInvitations) : '—',
      tone: guardianStats?.pendingInvitations ? 'amber' : 'gray',
    },
    {
      icon: <ShieldCheck size={20} />,
      label: t('profile.notificationRadius', 'Notification radius'),
      value: `${settings.notificationRadius} km`,
      tone: 'blue',
    },
  ];

  if (loading) {
    return (
      <div className="profile-loading" role="status" aria-live="polite">
        <LoadingSpinner size="lg" />
        <span>{t('profile.loading', 'Loading profile…')}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-loading" role="status">
        <UserIcon size={28} />
        <span>{t('profile.signInRequired', 'Sign in to view your profile.')}</span>
      </div>
    );
  }

  return (
    <section className="profile-page page-view page-view--profile" dir={i18n.dir(locale)}>
      <header className="profile-topbar">
        <span aria-hidden="true" />
        <h1>{t('tabs.settings', 'Account')}</h1>
        <button type="button" onClick={() => setActiveTab('preferences')} aria-label={String(t('tabs.settings', 'Settings'))}>
          <MoreHorizontal size={19} />
        </button>
      </header>

      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {user.profile_picture_url ? (
              <img src={user.profile_picture_url} alt="" />
            ) : (
              <UserIcon size={38} aria-hidden="true" />
            )}
          </div>
          <span className={`profile-verification-dot is-${verificationLevel}`} title={String(t(`profile.verificationLevels.${verificationLevel}`, verificationLevel))}>
            <ShieldCheck size={12} aria-hidden="true" />
          </span>
        </div>

        <h2>{profileName}</h2>
        <p className="profile-handle">@{user.username || user.email.split('@')[0]}</p>
        <p className="profile-location"><MapPin size={13} />{user.location?.trim() || t('profile.locationNotSaved', 'Location not saved')}</p>

        <div className="profile-stats" role="list" aria-label={String(t('profile.contributionStats', 'Contribution stats'))}>
          <div role="listitem"><strong>{reports.length}</strong><span>{t('profile.reports', 'Reports')}</span></div>
          <div role="listitem"><strong>{totalUpvotes}</strong><span>{t('profile.helpfulVotes', 'Helpful votes')}</span></div>
          <div role="listitem"><strong>{user.reputation ?? 0}</strong><span>{t('profile.reputation', 'Reputation')}</span></div>
        </div>

        <div className="profile-actions">
          <button className="profile-action profile-action--primary" type="button" onClick={() => setShowEditModal(true)}>
            <Edit3 size={15} />{t('profile.editProfile', 'Edit profile')}
          </button>
          <button className="profile-action profile-action--secondary" type="button" onClick={() => setActiveTab('preferences')}>
            <Settings size={15} />{t('profile.safetySettings', 'Safety settings')}
          </button>
        </div>
      </div>

      {error && <div className="profile-error" role="alert">{error}</div>}

      <div className="profile-tabs" role="tablist" aria-label={String(t('profile.sections', 'Profile sections'))}>
        <button type="button" role="tab" aria-selected={activeTab === 'activity'} className={activeTab === 'activity' ? 'is-active' : ''} onClick={() => setActiveTab('activity')}>
          <FileText size={14} />{t('profile.activity', 'Activity')}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'safety'} className={activeTab === 'safety' ? 'is-active' : ''} onClick={() => setActiveTab('safety')}>
          <LockKeyhole size={14} />{t('profile.safety', 'Safety')}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'credentials'} className={activeTab === 'credentials' ? 'is-active' : ''} onClick={() => setActiveTab('credentials')}>
          <Star size={14} />{t('profile.credentials', 'Credentials')}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'preferences'} className={activeTab === 'preferences' ? 'is-active' : ''} onClick={() => setActiveTab('preferences')}>
          <Settings size={14} />{t('tabs.settings', 'Settings')}
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'activity' && (
          <div className="profile-report-grid" role="tabpanel">
            {sortedReports.length > 0 ? sortedReports.slice(0, 12).map((report) => (
              <article className="profile-report-card" key={report.id}>
                <div
                  className="profile-report-card__visual"
                  style={{ '--vibe-color': VIBE_CONFIG[report.vibe_type as keyof typeof VIBE_CONFIG]?.color || '#64748b' } as React.CSSProperties}
                >
                  <span>{VIBE_ICONS[report.vibe_type] || <ShieldCheck size={22} />}</span>
                  <strong>{t(`vibes.${report.vibe_type}`, report.vibe_type)}</strong>
                </div>
                <div className="profile-report-card__body">
                  <p><MapPin size={12} />{report.location?.trim() || t('profile.unknownLocation', 'Unknown location')}</p>
                  {report.notes && <span>{report.notes}</span>}
                  <footer>
                    <time dateTime={report.created_at}>{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(report.created_at))}</time>
                    <span><ThumbsUp size={12} />{report.upvotes ?? 0}</span>
                  </footer>
                </div>
              </article>
            )) : (
              <div className="profile-empty-state">
                <FileText size={28} aria-hidden="true" />
                <strong>{t('profile.noReportsYet', 'No reports yet')}</strong>
                <span>{t('profile.reportsWillAppearHere', 'Your verified community contributions will appear here.')}</span>
                {onNewReport && <button type="button" onClick={onNewReport}><Plus size={15} />{t('community.newReport', 'New report')}</button>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="profile-safety-grid" role="tabpanel">
            {safetyItems.map((item) => (
              <article className="profile-safety-card" key={String(item.label)}>
                <span className={`profile-safety-card__icon is-${item.tone}`}>{item.icon}</span>
                <div><small>{item.label}</small><strong>{item.value}</strong></div>
              </article>
            ))}
            <button className="profile-safety-link" type="button" onClick={() => setActiveTab('preferences')}>
              <Settings size={15} />{t('profile.manageSafetySettings', 'Manage safety settings')}
            </button>
          </div>
        )}

        {activeTab === 'credentials' && (
          <div className="profile-credential-grid" role="tabpanel">
            {credentials.map((credential) => (
              <article className={credential.active ? 'profile-credential is-active' : 'profile-credential'} key={credential.id}>
                <span>{credential.icon}</span>
                <div><strong>{credential.title}</strong><small>{credential.value}</small></div>
                {credential.active && <CheckCircle2 size={16} className="profile-credential__check" aria-label={String(t('profile.verified', 'Verified'))} />}
              </article>
            ))}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="profile-settings-panel" role="tabpanel">
            <SettingsView embedded />
          </div>
        )}
      </div>

      <EditProfileModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />
    </section>
  );
};

export default ProfileView;
