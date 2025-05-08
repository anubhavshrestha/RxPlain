import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SIZES } from '../../styles/theme';

const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary', // primary, secondary, outline, text
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.button, styles.primaryButton, style];
      case 'secondary':
        return [styles.button, styles.secondaryButton, style];
      case 'outline':
        return [styles.button, styles.outlineButton, style];
      case 'text':
        return [styles.button, styles.textButton, style];
      default:
        return [styles.button, styles.primaryButton, style];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.buttonText, styles.primaryButtonText, textStyle];
      case 'secondary':
        return [styles.buttonText, styles.secondaryButtonText, textStyle];
      case 'outline':
        return [styles.buttonText, styles.outlineButtonText, textStyle];
      case 'text':
        return [styles.buttonText, styles.textButtonText, textStyle];
      default:
        return [styles.buttonText, styles.primaryButtonText, textStyle];
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? 'white' : COLORS.primary} />
      ) : (
        <>
          {leftIcon}
          <Text style={getTextStyle()}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: SIZES.base * 3,
    marginVertical: SIZES.base,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  textButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    height: 40,
  },
  buttonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: 'white',
  },
  secondaryButtonText: {
    color: 'white',
  },
  outlineButtonText: {
    color: COLORS.primary,
  },
  textButtonText: {
    color: COLORS.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default Button; 