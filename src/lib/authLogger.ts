// Authentication error logging utility
// Centralizes logging logic for consistent error tracking

interface AuthLogData {
  email?: string;
  hasPassword?: boolean;
  userId?: string;
  timestamp?: string;
  userAgent?: string;
  supabaseUrl?: string;
  [key: string]: any;
}

interface ErrorLogData {
  message?: string;
  name?: string;
  status?: number;
  stack?: string;
  details?: any;
}

class AuthLogger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private sanitizeEmail(email?: string): string | undefined {
    return email?.toLowerCase().trim();
  }

  // Log successful authentication events
  logAuthSuccess(event: string, data: AuthLogData): void {
    console.log(`✅ ${event}`, {
      ...data,
      email: this.sanitizeEmail(data.email),
      timestamp: this.formatTimestamp(),
    });
  }

  // Log authentication attempts
  logAuthAttempt(event: string, data: AuthLogData): void {
    console.log(`🔐 ${event}`, {
      ...data,
      email: this.sanitizeEmail(data.email),
      timestamp: this.formatTimestamp(),
      userAgent: navigator.userAgent,
    });
  }

  // Log authentication errors
  logAuthError(event: string, error: ErrorLogData, context?: AuthLogData): void {
    console.error(`❌ ${event}`, {
      error: {
        message: error.message,
        name: error.name,
        status: error.status,
        stack: error.stack,
        details: error.details,
      },
      context: {
        ...context,
        email: this.sanitizeEmail(context?.email),
        timestamp: this.formatTimestamp(),
      },
    });
  }

  // Log warnings
  logAuthWarning(event: string, data: AuthLogData): void {
    console.warn(`⚠️ ${event}`, {
      ...data,
      email: this.sanitizeEmail(data.email),
      timestamp: this.formatTimestamp(),
    });
  }

  // Log network/unexpected errors
  logNetworkError(event: string, error: ErrorLogData, context?: AuthLogData): void {
    console.error(`🚨 ${event}`, {
      error: {
        message: error.message,
        name: error.name,
        status: error.status,
        stack: error.stack,
        details: error.details,
      },
      context: {
        ...context,
        email: this.sanitizeEmail(context?.email),
        timestamp: this.formatTimestamp(),
      },
    });
  }

  // Log timeout events
  logTimeout(event: string, timeoutMs: number, context?: AuthLogData): void {
    console.error(`⏰ ${event}`, {
      timeoutMs,
      context: {
        ...context,
        email: this.sanitizeEmail(context?.email),
        timestamp: this.formatTimestamp(),
      },
    });
  }

  // Log form validation issues
  logValidationError(event: string, data: AuthLogData): void {
    console.warn(`📝 ${event}`, {
      ...data,
      email: this.sanitizeEmail(data.email),
      timestamp: this.formatTimestamp(),
    });
  }
}

// Export singleton instance
export const authLogger = new AuthLogger();
export default authLogger;
