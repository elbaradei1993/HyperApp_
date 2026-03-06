import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Report } from '../types';

import { LoadingSpinner, Modal } from './shared';
import SafetyTrendChart from './SafetyTrendChart';

interface CommunityInsightsProps {
  reports: Report[];
  isLoading?: boolean;
  userLocation?: [number, number] | null;
  onNewReport?: () => void;
  onNavigateToMap?: (latitude: number, longitude: number) => void;
  onNavigateToProfile?: (userId: string) => void;
}

const CommunityInsights: React.FC<CommunityInsightsProps> = ({
  reports,
  isLoading = false,
  userLocation,
  onNewReport,
  onNavigateToMap,
  onNavigateToProfile,
}) => {
  const { t } = useTranslation();
  const [showAllChallengesModal, setShowAllChallengesModal] = useState(false);

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      background: 'transparent',
      padding: '0',
    }}>
      {/* Compact Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <i className="fas fa-users" style={{ fontSize: '14px' }}></i>
          </div>
          <div>
            <h2 style={{
              color: '#1f2937',
              fontSize: '20px',
              fontWeight: '700',
              margin: '0',
              lineHeight: '1.2',
            }}>
              {t('communityInsights.title')}
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              margin: '4px 0 0 0',
            }}>
              {reports.length} {t('communityInsights.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
      }}>
        {/* Live Activity Feed */}
        <InteractiveCard
          title={t('communityInsights.liveActivity')}
          icon="fas fa-chart-line"
          color="#3b82f6"
          onClick={() => {}}
        >
          <ActivityFeed
            reports={reports}
            onNavigateToMap={onNavigateToMap}
            onNavigateToProfile={onNavigateToProfile}
          />
        </InteractiveCard>

        {/* Safety Overview */}
        <InteractiveCard
          title={t('communityInsights.safetyCheck')}
          icon="fas fa-shield-alt"
          color="#10b981"
          onClick={() => {}}
        >
          <SafetyOverview data={{ score: 85, level: 'safe', totalReports: reports.length }} />
        </InteractiveCard>

        {/* Community Stats */}
        <InteractiveCard
          title={t('communityInsights.communityStats')}
          icon="fas fa-chart-bar"
          color="#8b5cf6"
          onClick={() => {}}
        >
          <CommunityStats reports={reports} />
        </InteractiveCard>

        {/* Quick Actions */}
        <InteractiveCard
          title={t('communityInsights.quickActions')}
          icon="fas fa-bolt"
          color="#06b6d4"
          onClick={() => {}}
        >
          <QuickActions onNewReport={onNewReport} />
        </InteractiveCard>

        {/* Community Challenges */}
        <InteractiveCard
          title={t('communityInsights.communityChallenges')}
          icon="fas fa-trophy"
          color="#f59e0b"
          onClick={() => {}}
        >
          <CommunityChallenges
            reports={reports}
            onShowAllChallenges={() => setShowAllChallengesModal(true)}
          />
        </InteractiveCard>

        {/* Personal Achievements */}
        <InteractiveCard
          title={t('communityInsights.achievements')}
          icon="fas fa-medal"
          color="#8b5cf6"
          onClick={() => {}}
        >
          <PersonalAchievements reports={reports} />
        </InteractiveCard>
      </div>

      {/* Empty State */}
      {reports.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f3f4f6',
          marginTop: '20px',
        }}>
          <i className="fas fa-map-marker-alt" style={{ fontSize: '32px', color: '#d1d5db', marginBottom: '12px' }}></i>
          <div style={{
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '4px',
          }}>
            {t('communityInsights.noNearbyActivity')}
          </div>
          <div style={{
            color: '#9ca3af',
            fontSize: '14px',
          }}>
            {t('communityInsights.noNearbyActivityDesc')}
          </div>
        </div>
      )}

      {/* All Challenges Modal */}
      <Modal
        isOpen={showAllChallengesModal}
        onClose={() => setShowAllChallengesModal(false)}
      >
        <div style={{ padding: '24px 20px 20px' }}>
          <h2 style={{
            color: '#1f2937',
            fontSize: '20px',
            fontWeight: '700',
            margin: '0 0 20px 0',
            textAlign: 'center',
          }}>
            {t('communityInsights.allChallenges')}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '8px',
          }}>
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              {t('communityInsights.challengesComingSoon')}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Interactive card component
interface InteractiveCardProps {
  title: string;
  icon: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}

const InteractiveCard: React.FC<InteractiveCardProps> = ({ title, icon, color, onClick, children }) => (
  <div
    onClick={onClick}
    style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f3f4f6',
      minHeight: '240px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.05)';
    }}
  >
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '16px',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}>
        <i className={icon} style={{ fontSize: '14px' }}></i>
      </div>
      <h3 style={{
        color: '#1f2937',
        fontSize: '16px',
        fontWeight: '600',
        margin: 0,
      }}>
        {title}
      </h3>
    </div>
    {children}
  </div>
);

// Activity Feed Component
const ActivityFeed: React.FC<{
  reports: Report[],
  onNavigateToMap?: (latitude: number, longitude: number) => void,
  onNavigateToProfile?: (userId: string) => void
}> = ({ reports, onNavigateToMap, onNavigateToProfile }) => {
  const recentReports = reports.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #e5e7eb',
      }}>
        <SafetyTrendChart reports={reports} height={120} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {recentReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280' }}>
            No recent activity
          </div>
        ) : (
          recentReports.map((report, index) => (
            <div
              key={report.id}
              onClick={() => onNavigateToMap?.(report.latitude, report.longitude)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* User Profile Picture */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToProfile?.(report.user_id);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #e5e7eb',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {report.profile?.profile_picture_url ? (
                  <img
                    src={report.profile.profile_picture_url}
                    alt={report.profile.username || 'User'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.profile-fallback') as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div
                  className="profile-fallback"
                  style={{
                    display: report.profile?.profile_picture_url ? 'none' : 'flex',
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  {(report.profile?.username || report.profile?.first_name || 'U')[0]?.toUpperCase() || 'U'}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  color: '#1f2937',
                  fontSize: '13px',
                  fontWeight: '600',
                }}>
                  {report.vibe_type} Report
                </div>
                <div style={{
                  color: '#6b7280',
                  fontSize: '11px',
                }}>
                  by {report.profile?.username || report.profile?.first_name || 'Anonymous'} • {new Date(report.created_at).toLocaleDateString()}
                </div>
              </div>

              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: report.emergency ? '#ef4444' : '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '10px',
              }}>
                {report.emergency ? '🚨' : '📍'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Safety Overview Component
const SafetyOverview: React.FC<{ data: any }> = ({ data }) => {
  const getSafetyColor = (level: string) => {
    switch (level) {
    case 'safe': return '#10b981';
    case 'moderate': return '#f59e0b';
    case 'caution': return '#ef4444';
    default: return '#6b7280';
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: `conic-gradient(${getSafetyColor(data.level)} ${data.score}%, #e5e7eb 0%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        position: 'relative',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            color: getSafetyColor(data.level),
            fontSize: '18px',
            fontWeight: '700',
          }}>
            {data.score}%
          </span>
        </div>
      </div>
      <div style={{
        color: '#1f2937',
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '4px',
        textTransform: 'capitalize',
      }}>
        {data.level} Area
      </div>
      <div style={{
        color: '#6b7280',
        fontSize: '12px',
      }}>
        Based on {data.totalReports} reports
      </div>
    </div>
  );
};

// Community Stats Component
const CommunityStats: React.FC<{ reports: Report[] }> = ({ reports }) => {
  const stats = {
    total: reports.length,
    emergencies: reports.filter(r => r.emergency).length,
    contributors: new Set(reports.map(r => r.user_id)).size,
    today: reports.filter(r => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(r.created_at) >= today;
    }).length,
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>{stats.total}</div>
        <div style={{ color: '#6b7280', fontSize: '12px' }}>Total Reports</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>{stats.contributors}</div>
        <div style={{ color: '#6b7280', fontSize: '12px' }}>Contributors</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>{stats.emergencies}</div>
        <div style={{ color: '#6b7280', fontSize: '12px' }}>Emergencies</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>{stats.today}</div>
        <div style={{ color: '#6b7280', fontSize: '12px' }}>Today</div>
      </div>
    </div>
  );
};

// Quick Actions Component
const QuickActions: React.FC<{ onNewReport?: () => void }> = ({ onNewReport }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNewReport?.();
        }}
        style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <i className="fas fa-plus" style={{ fontSize: '12px' }}></i>
        Report Vibe
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          window.open('tel:911', '_self');
        }}
        style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <i className="fas fa-phone" style={{ fontSize: '12px' }}></i>
        Emergency Call
      </button>
    </div>
  );
};

// Community Challenges Component
const CommunityChallenges: React.FC<{
  reports: Report[],
  onShowAllChallenges: () => void
}> = ({ reports, onShowAllChallenges }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        borderRadius: '8px',
        border: '1px solid #f59e0b',
        textAlign: 'center',
      }}>
        <div style={{
          color: '#92400e',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '4px',
        }}>
          Daily Reporter
        </div>
        <div style={{
          color: '#78350f',
          fontSize: '12px',
          marginBottom: '8px',
        }}>
          Make 3 reports today
        </div>
        <div style={{
          color: '#92400e',
          fontSize: '14px',
          fontWeight: '600',
        }}>
          Progress: {Math.min(reports.length, 3)}/3
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onShowAllChallenges}
          style={{
            color: '#f59e0b',
            fontSize: '12px',
            fontWeight: '600',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          View All Challenges →
        </button>
      </div>
    </div>
  );
};

// Personal Achievements Component
const PersonalAchievements: React.FC<{ reports: Report[] }> = ({ reports }) => {
  const achievements = [
    {
      title: 'First Steps',
      description: 'Made your first report',
      unlocked: reports.length >= 1,
      progress: Math.min(reports.length, 1),
      total: 1,
    },
    {
      title: 'Safety Guardian',
      description: 'Helped 5 emergency situations',
      unlocked: reports.filter(r => r.emergency).length >= 5,
      progress: Math.min(reports.filter(r => r.emergency).length, 5),
      total: 5,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: `conic-gradient(#8b5cf6 ${unlockedCount * 50}%, #e5e7eb 0%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 8px',
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              color: '#8b5cf6',
              fontSize: '16px',
              fontWeight: '700',
            }}>
              {unlockedCount}
            </span>
          </div>
        </div>
        <div style={{
          color: '#1f2937',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '2px',
        }}>
          {unlockedCount} Achievements
        </div>
        <div style={{
          color: '#6b7280',
          fontSize: '12px',
        }}>
          {achievements.length - unlockedCount} remaining
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {achievements.filter(a => a.unlocked).slice(0, 2).map((achievement, index) => (
          <div key={index} style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}>
            🏆
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityInsights;
