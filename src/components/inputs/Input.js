import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '../../styles/theme';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  error,
  keyboardType,
  autoCapitalize = 'none',
  leftIcon,
  style,
  multiline = false,
  numberOfLines = 1,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focusedInput,
          error && styles.errorInput,
          multiline && { height: numberOfLines * 20 },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon && { paddingLeft: 5 }]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="#A0AEC0"
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.visibilityToggle}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#A0AEC0"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.base * 2,
  },
  label: {
    fontSize: SIZES.small,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: SIZES.radius,
    height: 50,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: SIZES.base * 2,
    color: COLORS.text,
    fontSize: SIZES.body,
  },
  focusedInput: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  errorInput: {
    borderColor: COLORS.accent,
    borderWidth: 1.5,
  },
  errorText: {
    color: COLORS.accent,
    fontSize: SIZES.small,
    marginTop: 4,
  },
  leftIcon: {
    paddingLeft: SIZES.base * 2,
  },
  visibilityToggle: {
    padding: SIZES.base * 2,
  },
});

export default Input; 