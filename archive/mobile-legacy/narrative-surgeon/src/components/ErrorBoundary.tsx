import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Whether to isolate this boundary from parent boundaries
  level?: 'page' | 'component' | 'feature'; // Error boundary level for different handling
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log error to external service
    this.logErrorToService(error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Auto-recovery for component-level errors
    if (this.props.level === 'component') {
      this.scheduleAutoRecovery();
    }
  }

  private logErrorToService = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundaryLevel: this.props.level || 'unknown',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getCurrentUserId(),
        errorId: this.state.errorId,
      };

      // Store error locally
      const existingErrors = this.getStoredErrors();
      existingErrors.push(errorReport);
      
      // Keep only last 50 errors
      const recentErrors = existingErrors.slice(-50);
      localStorage.setItem('narrative_surgeon_errors', JSON.stringify(recentErrors));

      // Also try to send to backend if available
      if (window.tauri) {
        try {
          await window.tauri.invoke('log_frontend_error', { error: errorReport });
        } catch (backendError) {
          console.warn('Failed to log error to backend:', backendError);
        }
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private getCurrentUserId = (): string | null => {
    // Get user ID from your authentication system
    return localStorage.getItem('user_id') || null;
  };

  private getStoredErrors = (): any[] => {
    try {
      const stored = localStorage.getItem('narrative_surgeon_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  private scheduleAutoRecovery = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    // Auto-recover after 5 seconds for component-level errors
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetError();
    }, 5000);
  };

  private resetError = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleRetry = () => {
    this.resetError();
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    if (!error) return;

    const bugReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      level: this.props.level,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2));
    
    // Could also open email client or bug reporting system
    const subject = encodeURIComponent(`Bug Report: ${error.message}`);
    const body = encodeURIComponent(`Error ID: ${errorId}\n\nPlease describe what you were doing when this error occurred:\n\n\n---\nTechnical Details:\n${JSON.stringify(bugReport, null, 2)}`);
    window.open(`mailto:support@narrativesurgeon.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!, this.resetError);
      }

      // Default error UI based on level
      return this.renderDefaultErrorUI();
    }

    return this.props.children;
  }

  private renderDefaultErrorUI() {
    const { error, errorId, errorInfo } = this.state;
    const { level = 'component' } = this.props;

    if (level === 'component') {
      return (
        <View style={styles.componentError}>
          <Text style={styles.componentErrorTitle}>Something went wrong</Text>
          <Text style={styles.componentErrorMessage}>
            This component encountered an error and couldn't be displayed.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.errorContainer}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          
          <Text style={styles.errorMessage}>
            {level === 'page' 
              ? "This page encountered an unexpected error. Don't worry, your work is safe."
              : "The application encountered an unexpected error. Please try refreshing or restarting the app."
            }
          </Text>

          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={this.handleRetry}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={this.handleReportBug}>
              <Text style={styles.secondaryButtonText}>Report Bug</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.errorDetails}>
            <Text style={styles.errorDetailsTitle}>Error Details:</Text>
            <Text style={styles.errorId}>Error ID: {errorId}</Text>
            <Text style={styles.errorText}>{error?.message}</Text>
            
            {__DEV__ && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>{error?.stack}</Text>
                {errorInfo?.componentStack && (
                  <Text style={styles.debugText}>{errorInfo.componentStack}</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary level="component" {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return ComponentWithErrorBoundary;
}

// Specialized error boundaries for different use cases
export const PageErrorBoundary: React.FC<{ children: ReactNode; onError?: Props['onError'] }> = ({
  children,
  onError,
}) => (
  <ErrorBoundary level="page" onError={onError}>
    {children}
  </ErrorBoundary>
);

export const FeatureErrorBoundary: React.FC<{ 
  children: ReactNode; 
  featureName: string;
  onError?: Props['onError'];
}> = ({ children, featureName, onError }) => (
  <ErrorBoundary
    level="feature"
    onError={(error, errorInfo) => {
      console.log(`Feature "${featureName}" error:`, error);
      onError?.(error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName?: string;
}> = ({ children, componentName }) => (
  <ErrorBoundary
    level="component"
    fallback={(error, errorInfo, resetError) => (
      <View style={styles.inlineError}>
        <Text style={styles.inlineErrorText}>
          {componentName ? `${componentName} error` : 'Component error'}
        </Text>
        <TouchableOpacity onPress={resetError}>
          <Text style={styles.inlineErrorButton}>Retry</Text>
        </TouchableOpacity>
      </View>
    )}
  >
    {children}
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 400,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#007bff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorDetails: {
    backgroundColor: '#e9ecef',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 600,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  errorId: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    fontFamily: 'monospace',
  },
  debugInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  // Component-level error styles
  componentError: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 16,
    margin: 8,
    alignItems: 'center',
  },
  componentErrorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  componentErrorMessage: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#212529',
    fontWeight: '600',
    fontSize: 14,
  },
  // Inline error styles
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
    borderRadius: 6,
    padding: 12,
    margin: 4,
  },
  inlineErrorText: {
    fontSize: 14,
    color: '#721c24',
    flex: 1,
  },
  inlineErrorButton: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    marginLeft: 12,
  },
});

export default ErrorBoundary;