/**
 * Error Boundary Component
 * Catches React component errors and provides graceful fallbacks
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { errorManager } from '@/lib/errorHandling'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  isolate?: boolean // If true, only this boundary catches errors, doesn't propagate up
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props

    this.setState({ errorInfo })

    // Report error to error manager
    errorManager.reportManualError(error, 'ErrorBoundary', 'component_crash', {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount: this.state.retryCount,
      errorId: this.state.errorId
    })

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, children } = this.props
    const { hasError, error: _error } = this.state

    // Reset error boundary when props change if enabled
    if (resetOnPropsChange && prevProps.children !== children && hasError) {
      this.resetErrorBoundary()
    }

    // Auto-reset after certain types of errors
    if (hasError && !prevProps.children && children) {
      this.scheduleReset()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: this.state.retryCount + 1
    })
  }

  private scheduleReset = () => {
    // Auto-reset after 30 seconds for non-critical errors
    if (!this.resetTimeoutId) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary()
      }, 30000)
    }
  }

  private reloadApplication = () => {
    window.location.reload()
  }

  private goToHome = () => {
    window.location.href = '/'
  }

  private reportBug = () => {
    const { error, errorInfo, errorId } = this.state
    
    // Create bug report data
    const bugReport = {
      errorId,
      error: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    }

    // Copy to clipboard for user to paste into bug report
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2))
      .then(() => {
        alert('Bug report copied to clipboard. Please paste this when reporting the issue.')
      })
      .catch(() => {
        // Fallback: open email with bug report
        const subject = encodeURIComponent('Narrative Surgeon Bug Report')
        const body = encodeURIComponent(`Error ID: ${errorId}\n\nPlease describe what you were doing when this error occurred:\n\n[Your description here]\n\nTechnical Details:\n${JSON.stringify(bugReport, null, 2)}`)
        window.open(`mailto:support@narrativesurgeon.com?subject=${subject}&body=${body}`)
      })
  }

  private getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const { error } = this.state
    
    if (!error) return 'low'

    const message = error.message.toLowerCase()
    
    // Critical errors that likely require app restart
    if (message.includes('chunk load') || message.includes('loading chunk') || 
        message.includes('network error') || message.includes('script error')) {
      return 'critical'
    }

    // High severity errors that break major functionality
    if (message.includes('cannot read') || message.includes('undefined') || 
        message.includes('null') || message.includes('not a function')) {
      return 'high'
    }

    // Medium severity errors that break some functionality
    if (message.includes('validation') || message.includes('invalid') || 
        message.includes('failed to fetch')) {
      return 'medium'
    }

    return 'low'
  }

  private renderErrorDetails() {
    const { error, errorInfo, errorId } = this.state
    const severity = this.getErrorSeverity()

    return (
      <Card className="p-4 mt-4 border-red-200 bg-red-50 dark:bg-red-900/20">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Bug className="w-4 h-4" />
            <span className="font-medium">Error ID: {errorId}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              severity === 'critical' ? 'bg-red-100 text-red-800' :
              severity === 'high' ? 'bg-orange-100 text-orange-800' :
              severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {severity.toUpperCase()}
            </span>
          </div>
          
          {error && (
            <div>
              <div className="text-sm font-medium mb-1">Error Message:</div>
              <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                {error.toString()}
              </div>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer font-medium mb-2">Technical Details</summary>
            <div className="space-y-2">
              {error?.stack && (
                <div>
                  <div className="font-medium mb-1">Stack Trace:</div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </div>
              )}
              
              {errorInfo?.componentStack && (
                <div>
                  <div className="font-medium mb-1">Component Stack:</div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </div>
      </Card>
    )
  }

  private renderFallbackUI() {
    const { retryCount } = this.state
    const severity = this.getErrorSeverity()
    const maxRetries = 3

    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <Card className="max-w-md w-full p-6 text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            severity === 'critical' ? 'bg-red-100 text-red-600' :
            severity === 'high' ? 'bg-orange-100 text-orange-600' :
            'bg-yellow-100 text-yellow-600'
          }`}>
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold mb-2">
            {severity === 'critical' ? 'Critical Error' : 'Something went wrong'}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {severity === 'critical' 
              ? 'A critical error occurred that requires restarting the application.'
              : 'An unexpected error occurred. This might be temporary - please try again.'
            }
          </p>

          <div className="space-y-3">
            {severity !== 'critical' && retryCount < maxRetries && (
              <Button 
                onClick={this.resetErrorBoundary}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </Button>
            )}

            {severity === 'critical' || retryCount >= maxRetries ? (
              <div className="space-y-2">
                <Button 
                  onClick={this.reloadApplication}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart Application
                </Button>
                
                <Button 
                  onClick={this.goToHome}
                  className="w-full"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </div>
            ) : (
              <Button 
                onClick={this.goToHome}
                className="w-full"
                variant="outline"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            )}

            <Button 
              onClick={this.reportBug}
              className="w-full"
              variant="ghost"
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Bug
            </Button>
          </div>

          {this.renderErrorDetails()}
        </Card>
      </div>
    )
  }

  render() {
    const { hasError } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Render custom fallback if provided, otherwise render default
      if (fallback) {
        return fallback
      }
      
      return this.renderFallbackUI()
    }

    return children
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Lightweight error boundary for specific components
export function ComponentErrorBoundary({ 
  children, 
  componentName,
  onError 
}: { 
  children: ReactNode
  componentName?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void 
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">
              {componentName ? `${componentName} Error` : 'Component Error'}
            </span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">
            This component encountered an error and couldn't render properly.
          </p>
        </div>
      }
      onError={onError}
      resetOnPropsChange={true}
      isolate={true}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary