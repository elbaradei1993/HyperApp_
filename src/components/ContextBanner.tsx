import React from 'react';
import {
  AlertCircle,
  Clock3,
  CloudOff,
  MapPinOff,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import './ContextBanner.css';

export type ContextBannerVariant =
  | 'welcome'
  | 'active-session'
  | 'elevated-risk'
  | 'permission'
  | 'offline'
  | 'service-error';

interface ContextBannerAction {
  label: string;
  onClick: () => void;
}

interface ContextBannerProps {
  id: string;
  variant: ContextBannerVariant;
  eyebrow: string;
  title: string;
  description: string;
  detail?: string;
  primaryAction?: ContextBannerAction;
  secondaryAction?: ContextBannerAction;
}

const ICONS: Record<ContextBannerVariant, LucideIcon> = {
  welcome: Sparkles,
  'active-session': Clock3,
  'elevated-risk': TriangleAlert,
  permission: MapPinOff,
  offline: CloudOff,
  'service-error': AlertCircle,
};

const ContextBanner: React.FC<ContextBannerProps> = ({
  id,
  variant,
  eyebrow,
  title,
  description,
  detail,
  primaryAction,
  secondaryAction,
}) => {
  const Icon = ICONS[variant];
  const isStatus = variant !== 'welcome';

  return (
    <section
      className={`context-banner context-banner--${variant}`}
      aria-labelledby={id}
      role={isStatus ? 'status' : undefined}
    >
      <div className="context-banner__content">
        <span className="context-banner__icon" aria-hidden="true"><Icon size={20} /></span>
        <div className="context-banner__copy">
          <span className="context-banner__eyebrow">{eyebrow}</span>
          <h1 id={id}>{title}</h1>
          <p>{description}</p>
          {detail && <span className="context-banner__detail">{detail}</span>}
        </div>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="context-banner__actions">
          {primaryAction && (
            <button type="button" className="context-banner__primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button type="button" className="context-banner__secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {variant === 'welcome' && (
        <span className="context-banner__brand-shape" aria-hidden="true">
          <img src="/hyperapp-logo.png" alt="" />
        </span>
      )}
    </section>
  );
};

export default ContextBanner;
