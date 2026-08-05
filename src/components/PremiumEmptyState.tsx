import React from 'react';
import { BadgeCheck, BellRing, MapPin, Plus, ShieldCheck, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import './PremiumEmptyState.css';

interface PremiumEmptyStateProps {
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
  communityCount?: number;
  recentUsers?: Array<{
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    profile_picture_url: string | null;
  }>;
}

const getUserInitials = (user: NonNullable<PremiumEmptyStateProps['recentUsers']>[number]): string => {
  const parts = [user.first_name, user.last_name].filter(Boolean) as string[];
  if (parts.length > 0) {
    return parts.map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  }
  return user.username?.charAt(0).toUpperCase() ?? '?';
};

const getUserDisplayName = (user: NonNullable<PremiumEmptyStateProps['recentUsers']>[number]): string => (
  [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Community member'
);

const PremiumEmptyState: React.FC<PremiumEmptyStateProps> = ({
  onPrimaryAction,
  onSecondaryAction,
  className = '',
  communityCount = 0,
  recentUsers = [],
}) => {
  const { t } = useTranslation();

  return (
    <section className={`community-empty-overview ${className}`} aria-labelledby="community-empty-title">
      <header className="community-empty-overview__header">
        <div>
          <span className="community-empty-overview__eyebrow">
            {t('community.safetyOverview', 'Safety overview')}
          </span>
          <h1 id="community-empty-title">
            {t('community.emptyState.title', 'Start your local safety pulse')}
          </h1>
          <p>
            {t(
              'community.emptyState.description',
              'There are no nearby reports yet. Add the first verified observation to help your community understand the area.',
            )}
          </p>
        </div>
        <span className="community-empty-overview__shield" aria-hidden="true"><ShieldCheck size={25} /></span>
      </header>

      <div className="community-empty-overview__metrics" role="list">
        <article role="listitem">
          <span><BellRing size={18} /></span>
          <div><small>{t('community.visibleReports', 'Visible reports')}</small><strong>0</strong></div>
        </article>
        <article role="listitem">
          <span><Users size={18} /></span>
          <div><small>{t('community.communityMembers', 'Community members')}</small><strong>{communityCount}</strong></div>
        </article>
        <article role="listitem">
          <span><BadgeCheck size={18} /></span>
          <div><small>{t('community.status', 'Status')}</small><strong>{t('community.ready', 'Ready')}</strong></div>
        </article>
      </div>

      <div className="community-empty-overview__action-card">
        <span className="community-empty-overview__pin" aria-hidden="true"><MapPin size={23} /></span>
        <div>
          <strong>{t('community.emptyState.subtitle', 'Your community needs its first report')}</strong>
          <p>{t('community.emptyState.benefit1.desc', 'Share a current, factual observation from your location.')}</p>
        </div>
        {onPrimaryAction && (
          <button type="button" onClick={onPrimaryAction}>
            <Plus size={17} />
            {t('community.emptyState.primaryCTA', 'Add report')}
          </button>
        )}
      </div>

      <footer className="community-empty-overview__footer">
        <div className="community-empty-overview__avatars" aria-hidden="true">
          {recentUsers.slice(0, 4).map((user) => (
            <span key={user.id} title={getUserDisplayName(user)}>
              {user.profile_picture_url && (
                <img
                  src={user.profile_picture_url}
                  alt=""
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
              )}
              <b>{getUserInitials(user)}</b>
            </span>
          ))}
          {recentUsers.length === 0 && <span><b>H</b></span>}
        </div>
        <p>
          {communityCount > 0
            ? t('community.emptyState.memberCount', '{{count}} community members nearby', { count: communityCount })
            : t('community.emptyState.socialProof', 'Help establish a useful local safety history.')}
        </p>
        {onSecondaryAction && (
          <button type="button" onClick={onSecondaryAction}>{t('tabs.map', 'Open map')}</button>
        )}
      </footer>
    </section>
  );
};

export default PremiumEmptyState;
