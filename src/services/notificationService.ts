import { NotificationContextType } from '../contexts/NotificationContext';
import type { Vibe, SOS } from '../types';

import { reportsService } from './reports';
import { pushNotificationService } from './pushNotificationService';


interface NotificationServiceOptions {
  userLocation?: [number, number] | null;
  notificationRadius?: number; // in kilometers
  maxNotifications?: number;
  currentUserId?: string;
}

class NotificationService {
  private notificationContext: NotificationContextType | null = null;
  private userLocation: [number, number] | null = null;
  private notificationRadius = 5; // 5km default
  private maxNotifications = 50;
  private lastNotificationTime = 0;
  private notificationCooldown = 30000; // 30 seconds between notifications
  private currentUserId: string | null = null;

  constructor(options: NotificationServiceOptions = {}) {
    this.userLocation = options.userLocation || null;
    this.notificationRadius = options.notificationRadius || 5;
    this.maxNotifications = options.maxNotifications || 50;
  }

  setNotificationContext(context: NotificationContextType) {
    this.notificationContext = context;
  }

  setUserLocation(location: [number, number] | null) {
    this.userLocation = location;
  }

  setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  // Calculate distance between two points in kilometers
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Check if a report is within notification radius
  private isWithinRadius(report: Vibe | SOS): boolean {
    if (!this.userLocation) {
      return false;
    }

    const distance = this.calculateDistance(
      this.userLocation[0],
      this.userLocation[1],
      report.latitude!,
      report.longitude!,
    );

    return distance <= this.notificationRadius;
  }

  // Generate notification for new report
  private generateReportNotification(report: Vibe | SOS): void {
    if (!this.notificationContext) {
      console.log('🔔 Notification context not set');
      return;
    }

    // Filter out user's own reports
    if (this.currentUserId && report.user_id === this.currentUserId) {
      console.log('🔔 Skipping notification for own report:', report.id);
      return;
    }

    // Check cooldown to prevent spam
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      console.log('🔔 Notification cooldown active, skipping');
      return;
    }

    // Check if report is within radius
    if (!this.isWithinRadius(report)) {
      console.log('🔔 Report not within radius, skipping');
      return;
    }

    console.log('🔔 Generating notification for report:', report.id, 'by user:', report.user_id);

    let notificationType: 'info' | 'warning' | 'error' = 'info';
    let title = '';
    let message = '';

    if ('emergency' in report && report.emergency) {
      // SOS Report
      notificationType = 'error';
      title = '🚨 Emergency Reported Nearby';
      message = `Emergency alert ${Math.round(this.calculateDistance(
        this.userLocation![0], this.userLocation![1],
        report.latitude!, report.longitude!,
      ) * 10) / 10}km away`;
    } else {
      // Regular Vibe Report
      const vibeReport = report as Vibe;
      const distance = Math.round(this.calculateDistance(
        this.userLocation![0], this.userLocation![1],
        report.latitude!, report.longitude!,
      ) * 10) / 10;

      // Determine notification type based on vibe
      switch (vibeReport.vibe_type) {
      case 'dangerous':
        notificationType = 'error';
        title = '⚠️ High Risk Area Reported';
        break;
      case 'suspicious':
        notificationType = 'warning';
        title = '⚠️ Suspicious Activity Reported';
        break;
      case 'crowded':
        notificationType = 'warning';
        title = '👥 Crowded Area Reported';
        break;
      case 'noisy':
        notificationType = 'warning';
        title = '🔊 Noisy Area Reported';
        break;
      default:
        notificationType = 'info';
        title = '📍 New Safety Report';
      }

      message = `${vibeReport.vibe_type} report ${distance}km away`;
    }

    // Add action for navigation
    const action = {
      label: 'View on Map',
      onClick: () => {
        // This will be handled by the parent component
        console.log('Navigate to report location:', report.latitude, report.longitude);
      },
    };

    this.notificationContext.addNotification({
      type: notificationType,
      title,
      message,
      action,
    });

    // Also send push notification to nearby users (if this is an emergency or high-risk report)
    if (notificationType === 'error' || (notificationType === 'warning' && (report as Vibe).vibe_type === 'dangerous')) {
      pushNotificationService.sendPushToNearbyUsers(report, [report.latitude!, report.longitude!])
        .catch(error => console.error('Failed to send push notification:', error));
    }

    this.lastNotificationTime = now;
  }

  // Generate notification for multiple reports in area
  private generateAreaSummaryNotification(reports: (Vibe | SOS)[], hours: number = 1): void {
    if (!this.notificationContext || !this.userLocation) {
      return;
    }

    const recentReports = reports.filter(report => {
      const reportTime = new Date(report.created_at).getTime();
      const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
      return reportTime > hoursAgo && this.isWithinRadius(report);
    });

    if (recentReports.length < 3) {
      return;
    } // Only notify if multiple reports

    const emergencyCount = recentReports.filter(r => 'emergency' in r && r.emergency).length;
    const dangerCount = recentReports.filter(r => !('emergency' in r) && (r as Vibe).vibe_type === 'dangerous').length;

    let title = '';
    let message = '';
    let type: 'info' | 'warning' | 'error' = 'info';

    if (emergencyCount > 0) {
      type = 'error';
      title = '🚨 Multiple Emergencies Reported';
      message = `${emergencyCount} emergency alerts in your area in the last ${hours} hour(s)`;
    } else if (dangerCount > 0) {
      type = 'warning';
      title = '⚠️ Safety Concerns Increasing';
      message = `${recentReports.length} safety reports in your area in the last ${hours} hour(s)`;
    } else {
      type = 'info';
      title = '📊 Community Activity';
      message = `${recentReports.length} new reports in your area in the last ${hours} hour(s)`;
    }

    this.notificationContext.addNotification({
      type,
      title,
      message,
    });
  }

  // Start monitoring reports for notifications
  startMonitoring(): void {
    if (!this.notificationContext) {
      console.warn('NotificationService: No notification context set');
      return;
    }

    console.log('🔔 Starting report monitoring for notifications...');

    // Subscribe to new reports
    const reportSubscription = reportsService.subscribeToReports((newReport) => {
      // Small delay to ensure location is set
      setTimeout(() => {
        this.generateReportNotification(newReport);
      }, 1000);
    });

    // Periodic area summary (every 30 minutes)
    const areaSummaryInterval = setInterval(() => {
      this.generatePeriodicAreaSummary();
    }, 30 * 60 * 1000); // 30 minutes

    // Cleanup function
    const cleanup = () => {
      reportSubscription?.unsubscribe?.();
      clearInterval(areaSummaryInterval);
    };

    // Store cleanup for later
    (this as any).cleanup = cleanup;
  }

  // Stop monitoring
  stopMonitoring(): void {
    if ((this as any).cleanup) {
      (this as any).cleanup();
      (this as any).cleanup = null;
    }
  }

  // Generate periodic area summary
  private async generatePeriodicAreaSummary(): Promise<void> {
    try {
      // Get recent reports from the last hour
      const [vibes, sosAlerts] = await Promise.all([
        reportsService.getVibes({ limit: 100 }),
        reportsService.getSOSAlerts({ limit: 50 }),
      ]);

      const allReports = [...(vibes || []), ...(sosAlerts || [])];
      this.generateAreaSummaryNotification(allReports, 1);
    } catch (error) {
      console.error('Error generating area summary notification:', error);
    }
  }

  // Update notification preferences
  updatePreferences(options: Partial<NotificationServiceOptions>): void {
    if (options.userLocation !== undefined) {
      this.userLocation = options.userLocation;
    }
    if (options.notificationRadius !== undefined) {
      this.notificationRadius = options.notificationRadius;
    }
    if (options.maxNotifications !== undefined) {
      this.maxNotifications = options.maxNotifications;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
