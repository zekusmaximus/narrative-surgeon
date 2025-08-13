import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { useResponsiveFontSize } from '../hooks/useResponsive';
import { useTheme } from '../theme/ThemeProvider';

interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: 'title' | 'heading' | 'subheading' | 'body' | 'caption';
  style?: TextStyle;
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right' | 'justify';
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  responsive?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  };
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  style,
  color,
  weight = 'normal',
  align = 'left',
  numberOfLines,
  ellipsizeMode = 'tail',
  responsive,
}) => {
  const fontSize = useResponsiveFontSize();
  const { theme } = useTheme();

  const getVariantFontSize = () => {
    if (responsive) {
      return fontSize.getFontSize({ ...responsive, fallback: fontSize[variant] });
    }
    return fontSize[variant];
  };

  const getFontWeight = () => {
    switch (weight) {
      case 'medium':
        return '500';
      case 'semibold':
        return '600';
      case 'bold':
        return 'bold';
      default:
        return 'normal';
    }
  };

  const textStyle: TextStyle = {
    fontSize: getVariantFontSize(),
    fontWeight: getFontWeight(),
    color: color || theme.colors.text,
    textAlign: align,
    fontFamily: theme.fonts.regular,
  };

  return (
    <Text
      style={[textStyle, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {children}
    </Text>
  );
};

// Specialized text components
export const ResponsiveTitle: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="title" weight="bold" {...props} />
);

export const ResponsiveHeading: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="heading" weight="semibold" {...props} />
);

export const ResponsiveSubheading: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="subheading" weight="medium" {...props} />
);

export const ResponsiveBody: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="body" {...props} />
);

export const ResponsiveCaption: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="caption" color={props.color} {...props} />
);

// Responsive heading hierarchy
interface ResponsiveHeadingProps extends Omit<ResponsiveTextProps, 'variant'> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export const ResponsiveHeadingLevel: React.FC<ResponsiveHeadingProps> = ({
  level,
  ...props
}) => {
  const getVariantForLevel = (): 'title' | 'heading' | 'subheading' | 'body' => {
    switch (level) {
      case 1:
        return 'title';
      case 2:
        return 'heading';
      case 3:
      case 4:
        return 'subheading';
      default:
        return 'body';
    }
  };

  const getWeightForLevel = (): 'normal' | 'medium' | 'semibold' | 'bold' => {
    switch (level) {
      case 1:
      case 2:
        return 'bold';
      case 3:
      case 4:
        return 'semibold';
      default:
        return 'medium';
    }
  };

  return (
    <ResponsiveText
      variant={getVariantForLevel()}
      weight={getWeightForLevel()}
      {...props}
    />
  );
};

export default ResponsiveText;