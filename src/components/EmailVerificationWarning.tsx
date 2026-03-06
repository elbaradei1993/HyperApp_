import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const EmailVerificationWarning: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [hasShownNotification, setHasShownNotification] = useState(false);

  // Show notification when user is not verified and hasn't seen it yet
  useEffect(() => {
    if (user && !user.email_verified && !hasShownNotification) {
      // Add as a persistent notification in the bell (not a toast)
      addNotification({
        type: 'warning',
        title: t('auth.verifyYourEmail'),
        message: t('auth.unverifiedAccountWarning'),
        duration: 0, // 0 means persistent in notification bell, not a toast
      });
      setHasShownNotification(true);
    }
  }, [user, hasShownNotification, addNotification, t]);

  // Reset when user changes
  useEffect(() => {
    if (user?.email_verified) {
      setHasShownNotification(false);
    }
  }, [user?.email_verified]);

  // This component doesn't render anything - it just manages the notification
  return null;
};

export default EmailVerificationWarning;
