import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type TransitionType = 
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'scale'
  | 'flip'
  | 'rotate';

export type TransitionDirection = 'enter' | 'exit';

interface ViewTransitionProps {
  children: React.ReactNode;
  visible: boolean;
  type?: TransitionType;
  duration?: number;
  delay?: number;
  easing?: any;
  style?: ViewStyle;
  onTransitionStart?: (direction: TransitionDirection) => void;
  onTransitionComplete?: (direction: TransitionDirection) => void;
}

export const ViewTransition: React.FC<ViewTransitionProps> = ({
  children,
  visible,
  type = 'fade',
  duration = 300,
  delay = 0,
  easing = Easing.bezier(0.25, 0.1, 0.25, 1),
  style,
  onTransitionStart,
  onTransitionComplete,
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    const direction: TransitionDirection = visible ? 'enter' : 'exit';
    onTransitionStart?.(direction);

    const animation = Animated.timing(animatedValue, {
      toValue: visible ? 1 : 0,
      duration,
      delay,
      easing,
      useNativeDriver: true,
    });

    animation.start(() => {
      onTransitionComplete?.(direction);
    });

    return () => animation.stop();
  }, [visible, duration, delay, easing]);

  const getTransformStyle = (): any => {
    switch (type) {
      case 'fade':
        return {
          opacity: animatedValue,
        };
      
      case 'slide-left':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-screenWidth, 0],
              }),
            },
          ],
        };
      
      case 'slide-right':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [screenWidth, 0],
              }),
            },
          ],
        };
      
      case 'slide-up':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [screenHeight, 0],
              }),
            },
          ],
        };
      
      case 'slide-down':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-screenHeight, 0],
              }),
            },
          ],
        };
      
      case 'scale':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ],
        };
      
      case 'flip':
        return {
          opacity: animatedValue,
          transform: [
            {
              rotateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['90deg', '0deg'],
              }),
            },
          ],
        };
      
      case 'rotate':
        return {
          opacity: animatedValue,
          transform: [
            {
              rotate: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['180deg', '0deg'],
              }),
            },
          ],
        };
      
      default:
        return {
          opacity: animatedValue,
        };
    }
  };

  if (!visible && animatedValue._value === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, style, getTransformStyle()]}>
      {children}
    </Animated.View>
  );
};

// Page transition component for full-screen transitions
interface PageTransitionProps {
  children: React.ReactNode;
  currentPage: string;
  previousPage?: string;
  type?: TransitionType;
  duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  currentPage,
  previousPage,
  type = 'slide-right',
  duration = 400,
}) => {
  const pageKey = currentPage + (previousPage || '');
  
  return (
    <ViewTransition
      key={pageKey}
      visible={true}
      type={type}
      duration={duration}
      style={styles.fullScreen}
    >
      {children}
    </ViewTransition>
  );
};

// Staggered animation for lists
interface StaggeredListTransitionProps {
  children: React.ReactElement[];
  visible: boolean;
  staggerDelay?: number;
  itemDuration?: number;
  type?: TransitionType;
}

export const StaggeredListTransition: React.FC<StaggeredListTransitionProps> = ({
  children,
  visible,
  staggerDelay = 100,
  itemDuration = 300,
  type = 'fade',
}) => {
  return (
    <>
      {children.map((child, index) => (
        <ViewTransition
          key={index}
          visible={visible}
          type={type}
          duration={itemDuration}
          delay={index * staggerDelay}
        >
          {child}
        </ViewTransition>
      ))}
    </>
  );
};

// Modal transition with backdrop
interface ModalTransitionProps {
  children: React.ReactNode;
  visible: boolean;
  onBackdropPress?: () => void;
  backdropOpacity?: number;
  contentTransition?: TransitionType;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  children,
  visible,
  onBackdropPress,
  backdropOpacity = 0.5,
  contentTransition = 'scale',
}) => {
  const { theme } = useTheme();
  const backdropValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backdropValue, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible && backdropValue._value === 0) {
    return null;
  }

  return (
    <View style={styles.modalContainer}>
      <Animated.View 
        style={[
          styles.backdrop, 
          {
            opacity: backdropValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, backdropOpacity],
            }),
          },
        ]}
        onTouchEnd={onBackdropPress}
      />
      <ViewTransition
        visible={visible}
        type={contentTransition}
        duration={300}
        style={styles.modalContent}
      >
        {children}
      </ViewTransition>
    </View>
  );
};

// Tab transition component
interface TabTransitionProps {
  children: React.ReactNode;
  activeTab: string;
  direction?: 'left' | 'right';
}

export const TabTransition: React.FC<TabTransitionProps> = ({
  children,
  activeTab,
  direction = 'right',
}) => {
  return (
    <ViewTransition
      key={activeTab}
      visible={true}
      type={direction === 'left' ? 'slide-left' : 'slide-right'}
      duration={250}
      easing={Easing.out(Easing.cubic)}
      style={styles.fullScreen}
    >
      {children}
    </ViewTransition>
  );
};

// Collapse/Expand transition
interface CollapseTransitionProps {
  children: React.ReactNode;
  collapsed: boolean;
  duration?: number;
  maxHeight?: number;
}

export const CollapseTransition: React.FC<CollapseTransitionProps> = ({
  children,
  collapsed,
  duration = 300,
  maxHeight = 300,
}) => {
  const heightValue = useRef(new Animated.Value(collapsed ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(heightValue, {
      toValue: collapsed ? 0 : 1,
      duration,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [collapsed]);

  return (
    <Animated.View
      style={{
        maxHeight: heightValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, maxHeight],
        }),
        opacity: heightValue,
        overflow: 'hidden',
      }}
    >
      {children}
    </Animated.View>
  );
};

// Floating Action Button transition
interface FABTransitionProps {
  visible: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const FABTransition: React.FC<FABTransitionProps> = ({
  visible,
  onPress,
  icon,
  position = 'bottom-right',
}) => {
  const { theme } = useTheme();
  
  const getPositionStyle = () => {
    const base = { position: 'absolute' as const };
    switch (position) {
      case 'bottom-right':
        return { ...base, bottom: 20, right: 20 };
      case 'bottom-left':
        return { ...base, bottom: 20, left: 20 };
      case 'top-right':
        return { ...base, top: 20, right: 20 };
      case 'top-left':
        return { ...base, top: 20, left: 20 };
      default:
        return { ...base, bottom: 20, right: 20 };
    }
  };

  return (
    <ViewTransition
      visible={visible}
      type="scale"
      duration={200}
      style={getPositionStyle()}
    >
      <Animated.View
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primary },
        ]}
        onTouchEnd={onPress}
      >
        {icon}
      </Animated.View>
    </ViewTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  modalContent: {
    maxWidth: '90%',
    maxHeight: '80%',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});