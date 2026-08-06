import React from 'react';

interface HeaderLogoProps {
  label: string;
  onActivate: () => void;
}

const HeaderLogo: React.FC<HeaderLogoProps> = ({ label, onActivate }) => (
  <a
    className="app-brand"
    href="/"
    aria-label={label}
    onClick={(event) => {
      event.preventDefault();
      onActivate();
    }}
  >
    <span className="app-brand__mark" aria-hidden="true">
      <img src="/hyperapp-logo.png" alt="" />
    </span>
    <span className="app-brand__wordmark">HyperApp</span>
  </a>
);

export default HeaderLogo;
