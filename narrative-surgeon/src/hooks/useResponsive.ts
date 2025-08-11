import { useState, useEffect, useCallback } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export type BreakpointKey = keyof Breakpoints;
export type Orientation = 'portrait' | 'landscape';
export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'tv';

export interface ResponsiveInfo {
  width: number;
  height: number;
  orientation: Orientation;
  deviceType: DeviceType;
  breakpoint: BreakpointKey;
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
}

const defaultBreakpoints: Breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

export const useResponsive = (customBreakpoints?: Partial<Breakpoints>) => {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const getDeviceType = useCallback((width: number, height: number): DeviceType => {
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);

    if (maxDimension >= 1200) return 'desktop';
    if (maxDimension >= 768 && minDimension >= 600) return 'tablet';
    if (maxDimension >= 1000) return 'tv';
    return 'phone';
  }, []);

  const getCurrentBreakpoint = useCallback((width: number): BreakpointKey => {
    if (width >= breakpoints.xxl) return 'xxl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  }, [breakpoints]);

  const responsiveInfo: ResponsiveInfo = {
    width: dimensions.width,
    height: dimensions.height,
    orientation: dimensions.width > dimensions.height ? 'landscape' : 'portrait',
    deviceType: getDeviceType(dimensions.width, dimensions.height),
    breakpoint: getCurrentBreakpoint(dimensions.width),
    isSmallScreen: dimensions.width < breakpoints.md,
    isMediumScreen: dimensions.width >= breakpoints.md && dimensions.width < breakpoints.xl,
    isLargeScreen: dimensions.width >= breakpoints.xl,
    isPhone: getDeviceType(dimensions.width, dimensions.height) === 'phone',
    isTablet: getDeviceType(dimensions.width, dimensions.height) === 'tablet',
    isDesktop: getDeviceType(dimensions.width, dimensions.height) === 'desktop',
    isTV: getDeviceType(dimensions.width, dimensions.height) === 'tv',
    isPortrait: dimensions.width <= dimensions.height,
    isLandscape: dimensions.width > dimensions.height,
  };

  // Utility functions
  const isBreakpoint = useCallback((breakpoint: BreakpointKey) => {
    return responsiveInfo.breakpoint === breakpoint;
  }, [responsiveInfo.breakpoint]);

  const isBreakpointUp = useCallback((breakpoint: BreakpointKey) => {
    const breakpointValues = Object.keys(breakpoints) as BreakpointKey[];
    const currentIndex = breakpointValues.indexOf(responsiveInfo.breakpoint);
    const targetIndex = breakpointValues.indexOf(breakpoint);
    return currentIndex >= targetIndex;
  }, [responsiveInfo.breakpoint, breakpoints]);

  const isBreakpointDown = useCallback((breakpoint: BreakpointKey) => {
    const breakpointValues = Object.keys(breakpoints) as BreakpointKey[];
    const currentIndex = breakpointValues.indexOf(responsiveInfo.breakpoint);
    const targetIndex = breakpointValues.indexOf(breakpoint);
    return currentIndex <= targetIndex;
  }, [responsiveInfo.breakpoint, breakpoints]);

  const isBreakpointBetween = useCallback((min: BreakpointKey, max: BreakpointKey) => {
    return isBreakpointUp(min) && isBreakpointDown(max);
  }, [isBreakpointUp, isBreakpointDown]);

  return {
    ...responsiveInfo,
    breakpoints,
    isBreakpoint,
    isBreakpointUp,
    isBreakpointDown,
    isBreakpointBetween,
  };
};

// Hook for responsive values
export const useResponsiveValue = <T>(values: Partial<Record<BreakpointKey, T>>, fallback: T): T => {
  const { breakpoint, isBreakpointUp } = useResponsive();

  // Find the best matching value
  const breakpointOrder: BreakpointKey[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
  
  for (const bp of breakpointOrder) {
    if (values[bp] !== undefined && isBreakpointUp(bp)) {
      return values[bp]!;
    }
  }

  return fallback;
};

// Hook for responsive dimensions
export const useResponsiveDimensions = () => {
  const responsive = useResponsive();

  const getResponsiveWidth = useCallback((config: {
    xs?: number | string;
    sm?: number | string;
    md?: number | string;
    lg?: number | string;
    xl?: number | string;
    xxl?: number | string;
    fallback?: number | string;
  }) => {
    const { xs, sm, md, lg, xl, xxl, fallback = '100%' } = config;
    
    if (responsive.isBreakpointUp('xxl') && xxl !== undefined) return xxl;
    if (responsive.isBreakpointUp('xl') && xl !== undefined) return xl;
    if (responsive.isBreakpointUp('lg') && lg !== undefined) return lg;
    if (responsive.isBreakpointUp('md') && md !== undefined) return md;
    if (responsive.isBreakpointUp('sm') && sm !== undefined) return sm;
    if (xs !== undefined) return xs;
    
    return fallback;
  }, [responsive]);

  const getResponsivePadding = useCallback((config: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
    fallback?: number;
  }) => {
    const { xs, sm, md, lg, xl, xxl, fallback = 16 } = config;
    
    if (responsive.isBreakpointUp('xxl') && xxl !== undefined) return xxl;
    if (responsive.isBreakpointUp('xl') && xl !== undefined) return xl;
    if (responsive.isBreakpointUp('lg') && lg !== undefined) return lg;
    if (responsive.isBreakpointUp('md') && md !== undefined) return md;
    if (responsive.isBreakpointUp('sm') && sm !== undefined) return sm;
    if (xs !== undefined) return xs;
    
    return fallback;
  }, [responsive]);

  const getResponsiveColumns = useCallback((maxColumns = 12) => {
    if (responsive.isBreakpointUp('xxl')) return Math.min(6, maxColumns);
    if (responsive.isBreakpointUp('xl')) return Math.min(4, maxColumns);
    if (responsive.isBreakpointUp('lg')) return Math.min(3, maxColumns);
    if (responsive.isBreakpointUp('md')) return Math.min(2, maxColumns);
    return 1;
  }, [responsive]);

  return {
    ...responsive,
    getResponsiveWidth,
    getResponsivePadding,
    getResponsiveColumns,
  };
};

// Hook for responsive grid
export const useResponsiveGrid = (itemMinWidth = 200, gap = 16) => {
  const { width } = useResponsive();

  const calculateGrid = useCallback(() => {
    const availableWidth = width - (gap * 2); // Account for container padding
    const columns = Math.max(1, Math.floor(availableWidth / (itemMinWidth + gap)));
    const itemWidth = (availableWidth - (gap * (columns - 1))) / columns;

    return {
      columns,
      itemWidth,
      gap,
    };
  }, [width, itemMinWidth, gap]);

  return calculateGrid();
};

// Hook for responsive font sizes
export const useResponsiveFontSize = () => {
  const responsive = useResponsive();

  const getFontSize = useCallback((config: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
    fallback: number;
  }) => {
    const { xs, sm, md, lg, xl, xxl, fallback } = config;
    
    if (responsive.isBreakpointUp('xxl') && xxl !== undefined) return xxl;
    if (responsive.isBreakpointUp('xl') && xl !== undefined) return xl;
    if (responsive.isBreakpointUp('lg') && lg !== undefined) return lg;
    if (responsive.isBreakpointUp('md') && md !== undefined) return md;
    if (responsive.isBreakpointUp('sm') && sm !== undefined) return sm;
    if (xs !== undefined) return xs;
    
    return fallback;
  }, [responsive]);

  const scale = responsive.isPhone ? 0.9 : responsive.isTablet ? 1.0 : 1.1;

  return {
    ...responsive,
    getFontSize,
    scale,
    title: getFontSize({ xs: 20, sm: 22, md: 24, lg: 26, xl: 28, fallback: 24 }) * scale,
    heading: getFontSize({ xs: 18, sm: 20, md: 22, lg: 24, xl: 26, fallback: 22 }) * scale,
    subheading: getFontSize({ xs: 16, sm: 17, md: 18, lg: 19, xl: 20, fallback: 18 }) * scale,
    body: getFontSize({ xs: 14, sm: 15, md: 16, lg: 17, xl: 18, fallback: 16 }) * scale,
    caption: getFontSize({ xs: 12, sm: 13, md: 14, lg: 15, xl: 16, fallback: 14 }) * scale,
  };
};

// Utility function to create responsive styles
export const createResponsiveStyles = (styleConfig: {
  [K in BreakpointKey]?: any;
}) => {
  return (currentBreakpoint: BreakpointKey) => {
    const breakpointOrder: BreakpointKey[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
    
    for (const bp of breakpointOrder) {
      if (styleConfig[bp] !== undefined) {
        const breakpointValues = Object.keys(defaultBreakpoints) as BreakpointKey[];
        const currentIndex = breakpointValues.indexOf(currentBreakpoint);
        const targetIndex = breakpointValues.indexOf(bp);
        
        if (currentIndex >= targetIndex) {
          return styleConfig[bp];
        }
      }
    }
    
    return {};
  };
};

export default useResponsive;