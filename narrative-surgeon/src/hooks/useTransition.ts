import { useRef, useCallback, useState } from 'react';
import { Animated, Easing } from 'react-native';

export interface TransitionConfig {
  duration?: number;
  easing?: any;
  useNativeDriver?: boolean;
  delay?: number;
}

export interface TransitionState {
  isAnimating: boolean;
  direction: 'enter' | 'exit' | 'idle';
}

export const useTransition = (initialValue = 0, config: TransitionConfig = {}) => {
  const {
    duration = 300,
    easing = Easing.bezier(0.25, 0.1, 0.25, 1),
    useNativeDriver = true,
    delay = 0,
  } = config;

  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  const [state, setState] = useState<TransitionState>({
    isAnimating: false,
    direction: 'idle',
  });

  const animate = useCallback(
    (
      toValue: number,
      customConfig?: Partial<TransitionConfig>,
      callback?: () => void
    ) => {
      const finalConfig = { ...config, ...customConfig };
      const direction = toValue > animatedValue._value ? 'enter' : 'exit';
      
      setState({ isAnimating: true, direction });

      Animated.timing(animatedValue, {
        toValue,
        duration: finalConfig.duration || duration,
        easing: finalConfig.easing || easing,
        useNativeDriver: finalConfig.useNativeDriver ?? useNativeDriver,
        delay: finalConfig.delay || delay,
      }).start((finished) => {
        if (finished) {
          setState({ isAnimating: false, direction: 'idle' });
          callback?.();
        }
      });
    },
    [animatedValue, duration, easing, useNativeDriver, delay, config]
  );

  const fadeIn = useCallback(
    (customConfig?: Partial<TransitionConfig>, callback?: () => void) => {
      animate(1, customConfig, callback);
    },
    [animate]
  );

  const fadeOut = useCallback(
    (customConfig?: Partial<TransitionConfig>, callback?: () => void) => {
      animate(0, customConfig, callback);
    },
    [animate]
  );

  const reset = useCallback(() => {
    animatedValue.setValue(initialValue);
    setState({ isAnimating: false, direction: 'idle' });
  }, [animatedValue, initialValue]);

  const stop = useCallback(() => {
    animatedValue.stopAnimation((value) => {
      setState({ isAnimating: false, direction: 'idle' });
    });
  }, [animatedValue]);

  return {
    animatedValue,
    state,
    animate,
    fadeIn,
    fadeOut,
    reset,
    stop,
  };
};

// Hook for managing page transitions
export const usePageTransition = () => {
  const [currentPage, setCurrentPage] = useState<string>('');
  const [previousPage, setPreviousPage] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionTo = useCallback((pageName: string) => {
    setIsTransitioning(true);
    setPreviousPage(currentPage);
    
    // Small delay to ensure smooth transition
    setTimeout(() => {
      setCurrentPage(pageName);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 400); // Match the default transition duration
    }, 50);
  }, [currentPage]);

  return {
    currentPage,
    previousPage,
    isTransitioning,
    transitionTo,
  };
};

// Hook for staggered list animations
export const useStaggeredTransition = (itemCount: number, config: TransitionConfig = {}) => {
  const { duration = 300, delay = 100 } = config;
  const animatedValues = useRef(
    Array.from({ length: itemCount }, () => new Animated.Value(0))
  ).current;

  const animateItems = useCallback(
    (visible: boolean, customDelay?: number) => {
      const staggerDelay = customDelay ?? delay;
      
      const animations = animatedValues.map((value, index) =>
        Animated.timing(value, {
          toValue: visible ? 1 : 0,
          duration,
          delay: index * staggerDelay,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        })
      );

      if (visible) {
        Animated.stagger(staggerDelay, animations).start();
      } else {
        // Reverse order for exit animation
        Animated.stagger(staggerDelay, animations.reverse()).start();
      }
    },
    [animatedValues, duration, delay]
  );

  const resetItems = useCallback(() => {
    animatedValues.forEach(value => value.setValue(0));
  }, [animatedValues]);

  return {
    animatedValues,
    animateItems,
    resetItems,
  };
};

// Hook for modal transitions
export const useModalTransition = () => {
  const backdropTransition = useTransition(0, { duration: 200 });
  const contentTransition = useTransition(0, { duration: 300 });
  const [isVisible, setIsVisible] = useState(false);

  const showModal = useCallback(() => {
    setIsVisible(true);
    backdropTransition.fadeIn();
    contentTransition.fadeIn({ delay: 100 });
  }, [backdropTransition, contentTransition]);

  const hideModal = useCallback((callback?: () => void) => {
    contentTransition.fadeOut();
    backdropTransition.fadeOut(undefined, () => {
      setIsVisible(false);
      callback?.();
    });
  }, [backdropTransition, contentTransition]);

  return {
    isVisible,
    backdropTransition,
    contentTransition,
    showModal,
    hideModal,
  };
};

// Hook for tab transitions
export const useTabTransition = (tabs: string[]) => {
  const [activeTab, setActiveTab] = useState(tabs[0] || '');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const transition = useTransition(0, { duration: 250, easing: Easing.out(Easing.cubic) });

  const switchTab = useCallback((newTab: string) => {
    const currentIndex = tabs.indexOf(activeTab);
    const newIndex = tabs.indexOf(newTab);
    
    if (currentIndex === -1 || newIndex === -1) return;
    
    const newDirection = newIndex > currentIndex ? 'right' : 'left';
    setDirection(newDirection);
    
    transition.fadeOut(undefined, () => {
      setActiveTab(newTab);
      transition.fadeIn();
    });
  }, [activeTab, tabs, transition]);

  return {
    activeTab,
    direction,
    transition,
    switchTab,
  };
};

// Hook for collapse/expand transitions
export const useCollapseTransition = (initialCollapsed = true) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const heightTransition = useTransition(initialCollapsed ? 0 : 1, {
    duration: 300,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    useNativeDriver: false,
  });

  const toggle = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    heightTransition.animate(newCollapsed ? 0 : 1);
  }, [isCollapsed, heightTransition]);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    heightTransition.fadeOut();
  }, [heightTransition]);

  const expand = useCallback(() => {
    setIsCollapsed(false);
    heightTransition.fadeIn();
  }, [heightTransition]);

  return {
    isCollapsed,
    heightTransition,
    toggle,
    collapse,
    expand,
  };
};

// Predefined easing curves
export const TransitionEasing = {
  easeInOut: Easing.bezier(0.25, 0.1, 0.25, 1),
  easeOut: Easing.bezier(0, 0, 0.2, 1),
  easeIn: Easing.bezier(0.4, 0, 1, 1),
  sharp: Easing.bezier(0.4, 0, 0.6, 1),
  spring: Easing.elastic(1.5),
  bounce: Easing.bounce,
  back: Easing.back(1.5),
};

// Predefined durations
export const TransitionDuration = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
};