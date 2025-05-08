import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../styles/theme';
import Input from '../../components/inputs/Input';
import Button from '../../components/buttons/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = () => {
    // For demo purposes only, add validation in real app
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Navigate to login after signup
      navigation.navigate('Login');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started with RxPlain</Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={18} color={COLORS.text} />}
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.text} />}
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.text} />}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.text} />}
            />

            <Button
              title="Sign Up"
              onPress={handleSignup}
              loading={loading}
              style={styles.signupButton}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: SIZES.base * 3,
    paddingTop: SIZES.base * 2,
    paddingBottom: SIZES.base * 6,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.base * 2,
  },
  header: {
    marginBottom: SIZES.base * 4,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: '#718096',
  },
  formContainer: {
    width: '100%',
  },
  signupButton: {
    marginTop: SIZES.base * 3,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SIZES.base * 4,
  },
  loginText: {
    color: COLORS.text,
    fontSize: SIZES.small,
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: SIZES.small,
  },
});

export default SignupScreen;
