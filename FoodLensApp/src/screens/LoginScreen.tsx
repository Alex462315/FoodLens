/**
 * LoginScreen — User login form
 * Wired to POST /api/auth/login/ via AuthContext.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily} from '../theme/typography';
import {Spacing} from '../theme/spacing';
import {PrimaryButton, FormInput, TextButton} from '../components';
import {useAuth} from '../context/AuthContext';
import {AxiosError} from 'axios';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const {login} = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    // Client-side validation
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      await login({username, password});
      // On success, AuthContext sets the user/token
      // and AppNavigator will automatically navigate to Dashboard
    } catch (err) {
      const axiosError = err as AxiosError<{detail?: string}>;

      if (axiosError.response?.data?.detail) {
        // Show the backend's error message directly (e.g., "Invalid credentials.")
        setError(axiosError.response.data.detail);
      } else if (axiosError.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Make sure the backend is running.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Log in to continue scanning your food
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={text => {
                setUsername(text);
                if (error) setError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FormInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (error) setError('');
              }}
              secureTextEntry
            />
          </View>

          {/* Submit Button */}
          <PrimaryButton
            title="Log In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />

          {/* Register Link */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Don't have an account? </Text>
            <TextButton
              title="Sign up"
              onPress={() => navigation.navigate('Register')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    color: Colors.primaryGreen,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.secondaryText,
  },
  errorBanner: {
    backgroundColor: Colors.redBg,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  errorBannerText: {
    ...Typography.body,
    color: Colors.redDark,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  linkText: {
    ...Typography.body,
    color: Colors.secondaryText,
  },
});

export default LoginScreen;
