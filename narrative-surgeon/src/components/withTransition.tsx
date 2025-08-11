import React, { forwardRef, useEffect } from 'react';
import { ViewStyle } from 'react-native';
import { ViewTransition, TransitionType } from './ViewTransition';
import { useTransition, TransitionConfig } from '../hooks/useTransition';

export interface WithTransitionOptions {
  type?: TransitionType;
  duration?: number;
  easing?: any;
  delay?: number;
  enterOnMount?: boolean;
  exitOnUnmount?: boolean;
  style?: ViewStyle;
}

export interface TransitionProps {
  visible?: boolean;
  onTransitionStart?: (direction: 'enter' | 'exit') => void;
  onTransitionComplete?: (direction: 'enter' | 'exit') => void;
}

export function withTransition<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithTransitionOptions = {}
) {
  const {
    type = 'fade',
    duration = 300,
    easing,
    delay = 0,
    enterOnMount = true,
    exitOnUnmount = false,
    style,
  } = options;

  const TransitionWrappedComponent = forwardRef<
    any,
    P & TransitionProps
  >(({ visible = true, onTransitionStart, onTransitionComplete, ...props }, ref) => {
    const transition = useTransition(enterOnMount ? 1 : 0, {
      duration,
      easing,
      delay,
    });

    useEffect(() => {
      if (visible) {
        transition.fadeIn();
      } else {
        transition.fadeOut();
      }
    }, [visible, transition]);

    useEffect(() => {
      return () => {
        if (exitOnUnmount) {
          transition.fadeOut();
        }
      };
    }, []);

    const handleTransitionStart = (direction: 'enter' | 'exit') => {
      onTransitionStart?.(direction);
    };

    const handleTransitionComplete = (direction: 'enter' | 'exit') => {
      onTransitionComplete?.(direction);
    };

    return (
      <ViewTransition
        visible={visible}
        type={type}
        duration={duration}
        delay={delay}
        easing={easing}
        style={style}
        onTransitionStart={handleTransitionStart}
        onTransitionComplete={handleTransitionComplete}
      >
        <WrappedComponent ref={ref} {...(props as P)} />
      </ViewTransition>
    );
  });

  TransitionWrappedComponent.displayName = `withTransition(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return TransitionWrappedComponent;
}

// Specialized HOCs for common use cases
export function withFadeTransition<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  duration = 300
) {
  return withTransition(WrappedComponent, {
    type: 'fade',
    duration,
  });
}

export function withSlideTransition<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  direction: 'left' | 'right' | 'up' | 'down' = 'right',
  duration = 300
) {
  const type: TransitionType = `slide-${direction}` as TransitionType;
  return withTransition(WrappedComponent, {
    type,
    duration,
  });
}

export function withScaleTransition<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  duration = 300
) {
  return withTransition(WrappedComponent, {
    type: 'scale',
    duration,
  });
}

export function withModalTransition<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return withTransition(WrappedComponent, {
    type: 'scale',
    duration: 300,
    enterOnMount: false,
  });
}

// Example usage components with transitions
export const FadeInView = withFadeTransition(React.Fragment);
export const SlideInView = withSlideTransition(React.Fragment);
export const ScaleInView = withScaleTransition(React.Fragment);

// Transition group for managing multiple child transitions
interface TransitionGroupProps {
  children: React.ReactElement[];
  staggerDelay?: number;
  type?: TransitionType;
  duration?: number;
}

export const TransitionGroup: React.FC<TransitionGroupProps> = ({
  children,
  staggerDelay = 100,
  type = 'fade',
  duration = 300,
}) => {
  return (
    <>
      {children.map((child, index) => (
        <ViewTransition
          key={child.key || index}
          visible={true}
          type={type}
          duration={duration}
          delay={index * staggerDelay}
        >
          {child}
        </ViewTransition>
      ))}
    </>
  );
};

// Route transition wrapper for navigation
interface RouteTransitionProps {
  children: React.ReactNode;
  routeName: string;
  previousRoute?: string;
  type?: TransitionType;
  duration?: number;
}

export const RouteTransition: React.FC<RouteTransitionProps> = ({
  children,
  routeName,
  previousRoute,
  type = 'slide-right',
  duration = 400,
}) => {
  // Determine transition direction based on route hierarchy
  const getTransitionType = (): TransitionType => {
    if (!previousRoute) return type;
    
    // Define route hierarchy for automatic transition direction
    const routeHierarchy = [
      'home',
      'manuscripts',
      'scenes',
      'editor',
      'analysis',
      'export',
      'settings',
    ];
    
    const currentIndex = routeHierarchy.indexOf(routeName);
    const previousIndex = routeHierarchy.indexOf(previousRoute);
    
    if (currentIndex > previousIndex) {
      return 'slide-left';
    } else if (currentIndex < previousIndex) {
      return 'slide-right';
    }
    
    return type;
  };

  return (
    <ViewTransition
      key={routeName}
      visible={true}
      type={getTransitionType()}
      duration={duration}
      style={{ flex: 1 }}
    >
      {children}
    </ViewTransition>
  );
};

export default withTransition;