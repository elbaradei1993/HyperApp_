import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageBannerProps {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon: LucideIcon;
  action?: React.ReactNode;
  tone?: 'emerald' | 'blue' | 'violet' | 'amber' | 'slate';
  className?: string;
}

const PageBanner: React.FC<PageBannerProps> = ({
  id,
  title,
  description,
  eyebrow,
  icon: Icon,
  action,
  tone = 'slate',
  className = '',
}) => (
  <header className={`page-banner page-banner--${tone} ${className}`.trim()} aria-labelledby={id}>
    <div className="page-banner__glow" aria-hidden="true" />
    <div className="page-banner__identity">
      <span className="page-banner__icon" aria-hidden="true">
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <div className="page-banner__copy">
        {eyebrow && <div className="page-banner__eyebrow">{eyebrow}</div>}
        <h1 id={id}>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </div>
    {action && <div className="page-banner__action">{action}</div>}
  </header>
);

export default PageBanner;
