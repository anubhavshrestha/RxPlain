import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../styles/theme';
import Input from '../../components/inputs/Input';
import Button from '../../components/buttons/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../App'; // Import the auth context hook

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setIsAuthenticated } = useAuth(); // Get the auth setter

  const handleLogin = () => {
    // For demo purposes, simulate login
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Update auth state to true which will automatically navigate to the app
      setIsAuthenticated(true);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>RxPlain</Text>
            <Text style={styles.subtitle}>Understanding prescriptions made simple</Text>
          </View>

          <View style={styles.formContainer}>
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.text} />}
            />

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title="Login"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Sign Up</Text>
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
    paddingTop: SIZES.base * 4,
    paddingBottom: SIZES.base * 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.base * 6,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.base,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.text,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SIZES.base * 2,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: SIZES.small,
  },
  loginButton: {
    marginTop: SIZES.base * 2,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SIZES.base * 4,
  },
  signupText: {
    color: COLORS.text,
    fontSize: SIZES.small,
  },
  signupLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: SIZES.small,
  },
});

export default LoginScreen;
