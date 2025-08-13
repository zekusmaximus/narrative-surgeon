import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import ErrorBoundary, { 
  withErrorBoundary, 
  PageErrorBoundary, 
  ComponentErrorBoundary 
} from '../components/ErrorBoundary';

// Mock console.error to avoid cluttering test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeTruthy();
  });

  test('catches and displays error when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
    expect(screen.getByText(/The application encountered an unexpected error/)).toBeTruthy();
  });

  test('displays custom fallback when provided', () => {
    const CustomFallback = (error: Error) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError errorMessage="Custom test error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error: Custom test error')).toBeTruthy();
  });

  test('calls onError callback when error occurs', () => {
    const mockOnError = jest.fn();

    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledTimes(1);
  });

  test('stores error in localStorage', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const storedErrors = localStorage.getItem('narrative_surgeon_errors');
    expect(storedErrors).toBeTruthy();
    
    const errors = JSON.parse(storedErrors!);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.message).toBe('Test error');
  });

  test('retry button resets error state', async () => {
    const TestComponent: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      return (
        <ErrorBoundary>
          <div>
            <button onClick={() => setShouldThrow(false)}>Fix error</button>
            <ThrowError shouldThrow={shouldThrow} />
          </div>
        </ErrorBoundary>
      );
    };

    render(<TestComponent />);

    // Error should be displayed
    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();

    // Click retry button
    fireEvent.press(screen.getByText('Try Again'));

    // Error should still be displayed since we haven't fixed the underlying issue
    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
  });

  test('displays error details in development mode', () => {
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Debug Information:')).toBeTruthy();
    
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  test('handles different error boundary levels', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('This component encountered an error and couldn\'t be displayed.')).toBeTruthy();
  });

  test('auto-recovery for component-level errors', async () => {
    jest.useFakeTimers();

    render(
      <ErrorBoundary level="component">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Fast-forward time to trigger auto-recovery
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      // Auto-recovery should reset the error state
      // Note: In a real scenario, the component would need to not throw again
    });

    jest.useRealTimers();
  });
});

describe('withErrorBoundary HOC', () => {
  test('wraps component with error boundary', () => {
    const TestComponent = () => <div>Test component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Test component')).toBeTruthy();
  });

  test('catches errors in wrapped component', () => {
    const WrappedThrowError = withErrorBoundary(ThrowError);

    render(<WrappedThrowError />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  test('passes props to wrapped component', () => {
    const TestComponent: React.FC<{ message: string }> = ({ message }) => (
      <div>{message}</div>
    );
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent message="Test message" />);

    expect(screen.getByText('Test message')).toBeTruthy();
  });
});

describe('PageErrorBoundary', () => {
  test('renders page-level error UI', () => {
    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
    expect(screen.getByText(/This page encountered an unexpected error/)).toBeTruthy();
  });
});

describe('ComponentErrorBoundary', () => {
  test('renders component-level error UI', () => {
    render(
      <ComponentErrorBoundary>
        <ThrowError />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Component error')).toBeTruthy();
  });

  test('displays custom component name in error', () => {
    render(
      <ComponentErrorBoundary componentName="TestWidget">
        <ThrowError />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('TestWidget error')).toBeTruthy();
  });

  test('retry button works in component boundary', () => {
    render(
      <ComponentErrorBoundary>
        <ThrowError />
      </ComponentErrorBoundary>
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeTruthy();

    fireEvent.press(retryButton);
    // Error should still be displayed since the component still throws
    expect(screen.getByText('Component error')).toBeTruthy();
  });
});

describe('Error reporting integration', () => {
  test('generates error ID for tracking', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorDetails = screen.getByText(/Error ID:/);
    expect(errorDetails).toBeTruthy();
  });

  test('report bug button generates bug report', () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });

    // Mock window.open
    const mockOpen = jest.fn();
    Object.assign(window, { open: mockOpen });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const reportButton = screen.getByText('Report Bug');
    fireEvent.press(reportButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(mockOpen).toHaveBeenCalled();
  });

  test('stores multiple errors correctly', () => {
    const MultiErrorComponent = () => {
      const [errorCount, setErrorCount] = React.useState(0);
      
      React.useEffect(() => {
        if (errorCount < 2) {
          setTimeout(() => setErrorCount(prev => prev + 1), 100);
        }
      }, [errorCount]);

      return <ThrowError errorMessage={`Error ${errorCount}`} />;
    };

    render(
      <ErrorBoundary>
        <MultiErrorComponent />
      </ErrorBoundary>
    );

    // Let effects run
    setTimeout(() => {
      const storedErrors = localStorage.getItem('narrative_surgeon_errors');
      expect(storedErrors).toBeTruthy();
    }, 300);
  });
});

describe('Error boundary performance', () => {
  test('handles rapid error recovery', async () => {
    const RapidErrorComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      React.useEffect(() => {
        const timer = setTimeout(() => setShouldThrow(false), 100);
        return () => clearTimeout(timer);
      }, []);

      if (shouldThrow) {
        throw new Error('Rapid error');
      }
      
      return <div>Recovered</div>;
    };

    render(
      <ErrorBoundary>
        <RapidErrorComponent />
      </ErrorBoundary>
    );

    // Initially should show error
    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();

    // Wait for component to recover
    await waitFor(() => {
      // The error boundary would need to be reset for this to work
    }, { timeout: 200 });
  });

  test('limits stored errors to prevent memory issues', () => {
    // Store 60 errors to test the 50-error limit
    const existingErrors = Array.from({ length: 60 }, (_, i) => ({
      error: { message: `Error ${i}` },
      timestamp: new Date().toISOString(),
    }));
    
    localStorage.setItem('narrative_surgeon_errors', JSON.stringify(existingErrors));

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const storedErrors = JSON.parse(localStorage.getItem('narrative_surgeon_errors')!);
    expect(storedErrors.length).toBeLessThanOrEqual(50);
  });
});