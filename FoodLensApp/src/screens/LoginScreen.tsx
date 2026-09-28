/**
 * LoginScreen — User login form
 * Wired to POST /api/auth/login/ via AuthContext.
 * Google Sign-In via @react-native-google-signin/google-signin.
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {Colors} from '../theme/colors';
import {Typography, FontFamily} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {PrimaryButton, FormInput, TextButton} from '../components';
import {useAuth} from '../context/AuthContext';
import {AxiosError} from 'axios';

// Configure Google Sign-In (once at module level)
GoogleSignin.configure({
  webClientId: '182614903372-k2vq8j7pho18jav707mmfs4b0256u10d.apps.googleusercontent.com',
  offlineAccess: false,
});

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const {login, googleLogin} = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

      // Sign in with Google
      const signInResult = await GoogleSignin.signIn();

      // Get the ID token
      const idToken = signInResult?.data?.idToken;
      if (!idToken) {
        setError('Could not get Google ID token. Please try again.');
        return;
      }

      // Send ID token to our backend for verification + login
      await googleLogin(idToken);
      // On success, AuthContext handles navigation automatically
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — do nothing
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign in is already in progress.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available on this device.');
      } else {
        console.error('Google Sign-In error:', JSON.stringify(err));
        const axiosError = err as AxiosError<{error?: string}>;
        if (axiosError.response?.data?.error) {
          setError(axiosError.response.data.error);
        } else {
          setError(`Google Sign-In failed: ${err.code || err.message || 'Unknown error'}`);
        }
      }
    } finally {
      setGoogleLoading(false);
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

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
            activeOpacity={0.7}>
            {googleLoading ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

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

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <PrimaryButton
            title="Log In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || googleLoading}
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

  // Google Sign-In Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  googleIcon: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: '#4285F4',
    marginRight: Spacing.sm,
  },
  googleButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: '#3C4043',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.lightText,
    paddingHorizontal: Spacing.md,
  },

  form: {
    marginBottom: Spacing.xl,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.base,
    marginTop: -Spacing.sm,
  },
  forgotText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primaryGreen,
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
