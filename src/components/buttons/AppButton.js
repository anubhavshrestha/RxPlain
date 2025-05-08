import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, FONTS } from '../../styles/theme';

const AppButton = ({
  title,
  onPress,
  type = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, styles[type], styles[size], style, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, styles[], styles[], textStyle, disabled && styles.disabledText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...FONTS.body2,
    fontWeight: '600',
  },
  // Button types
  primary: {
    backgroundColor: COLORS.primary,
  },
  primaryText: {
    color: COLORS.white,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
  },
  secondaryText: {
    color: COLORS.white,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  outlineText: {
    color: COLORS.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: COLORS.primary,
  },
  // Button sizes
  small: {
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.base * 2,
  },
  smallText: {
    ...FONTS.body3,
  },
  medium: {
    paddingVertical: SIZES.base * 1.5,
    paddingHorizontal: SIZES.base * 3,
  },
  mediumText: {
    ...FONTS.body2,
  },
  large: {
    paddingVertical: SIZES.base * 2,
    paddingHorizontal: SIZES.base * 4,
  },
  largeText: {
    ...FONTS.body1,
  },
  disabled: {
    backgroundColor: COLORS.gray3,
    opacity: 0.6,
  },
  disabledText: {
    color: COLORS.gray5,
  },
});

export default AppButton;