/**
 * LoginScreen — User login form
 * Wired to POST /api/auth/login/ via AuthContext.
 * Google Sign-In via @react-native-google-signin/google-signin.
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
  TouchableOpacity,
  ActivityIndicator,
  Image,
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
  webClientId:
    '182614903372-k2vq8j7pho18jav707mmfs4b0256u10d.apps.googleusercontent.com',
  offlineAccess: false,
  // Forces the account chooser to always appear (fixes token error on 1st click)
  forceCodeForRefreshToken: false,
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

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      await login({username, password});
    } catch (err) {
      const axiosError = err as AxiosError<{detail?: string}>;
      if (axiosError.response?.data?.detail) {
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
      // Check Play Services
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

      // Always sign out first so the account picker is shown fresh every time.
      // This fixes the "token error on first click" bug — it ensures we never
      // use a stale cached token from a previous session.
      try {
        await GoogleSignin.signOut();
      } catch (_) {
        // Ignore if not previously signed in
      }

      // Show the Google account picker
      const signInResult = await GoogleSignin.signIn();

      // Get a fresh ID token (primary path)
      let idToken = signInResult?.data?.idToken ?? null;

      // Fallback: if idToken is null after signIn, fetch it from getTokens()
      if (!idToken) {
        try {
          const tokens = await GoogleSignin.getTokens();
          idToken = tokens?.idToken ?? null;
        } catch (tokenErr) {
          console.warn('getTokens() fallback failed:', tokenErr);
        }
      }

      if (!idToken) {
        setError('Could not get Google ID token. Please try again.');
        return;
      }

      // Send ID token to backend for verification + login
      await googleLogin(idToken);
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
          setError(
            `Google Sign-In failed: ${err.code || err.message || 'Unknown error'}`,
          );
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

          {/* ── Google Sign-In Button ── */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              (googleLoading || loading) && styles.googleButtonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
            activeOpacity={0.75}>
            {googleLoading ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <View style={styles.googleButtonInner}>
                {/* Google "G" logo box */}
                <View style={styles.googleIconBox}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Info note about Google sign-in ── */}
          <Text style={styles.googleNote}>
            Tap above to choose your Google account and sign in securely via
            Google's official sign-in flow.
          </Text>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with username</Text>
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

  // ── Google Sign-In Button ──────────────────────────────────
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingVertical: 13,
    paddingHorizontal: Spacing.base,
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    marginBottom: Spacing.sm,
    minHeight: 52,
    ...Shadow.sm,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleIconText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 20,
    includeFontPadding: false,
  },
  googleButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: '#3C4043',
  },

  // ── Note below Google button ──────────────────────────────
  googleNote: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.sm,
    lineHeight: 17,
  },

  // ── Divider ───────────────────────────────────────────────
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
    fontSize: 12,
    color: Colors.lightText,
    paddingHorizontal: Spacing.sm,
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
