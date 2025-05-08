import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '../../styles/theme';

const Header = ({ title, leftIcon, rightIcon, onLeftPress, onRightPress, transparent }) => {
  return (
    <SafeAreaView style={[styles.safeArea, transparent && styles.transparent]}>
      <View style={styles.header}>
        {leftIcon ? (
          <TouchableOpacity style={styles.iconButton} onPress={onLeftPress}>
            <Ionicons name={leftIcon} size={24} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}

        <Text style={styles.title}>{title}</Text>

        {rightIcon ? (
          <TouchableOpacity style={styles.iconButton} onPress={onRightPress}>
            <Ionicons name={rightIcon} size={24} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background,
    width: '100%',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: SIZES.base * 2,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '600',
    color: COLORS.text,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
  },
});

export default Header; 