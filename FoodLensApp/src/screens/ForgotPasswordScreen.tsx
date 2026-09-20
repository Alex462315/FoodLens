/**
 * ForgotPasswordScreen — Two-step forgot-password flow:
 *   Step 1 (Request):  User enters email → POST /api/users/forgot-password/
 *   Step 2 (Confirm):  User enters OTP + new password → POST /api/users/reset-password/
 *
 * On success the user is navigated back to Login and must sign in fresh
 * (no auto-login after a password reset, per the prompt spec).
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
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily} from '../theme/typography';
import {Spacing} from '../theme/spacing';
import {PrimaryButton, FormInput} from '../components';
import apiClient from '../services/apiClient';
import {AxiosError} from 'axios';

interface Props {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<Props> = ({navigation}) => {
  // Which step we're on
  const [step, setStep] = useState<'request' | 'confirm'>('request');

  // Step 1 — request OTP
  const [email, setEmail] = useState('');

  // Step 2 — confirm OTP
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Step 1: request OTP ────────────────────────────────────────────────────
  const handleRequestOTP = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/users/forgot-password/', {email: email.trim().toLowerCase()});
      // Always move to step 2 — the backend always returns 200 regardless
      // of whether the email exists (prevents account enumeration).
      setStep('confirm');
      setSuccess('If that email is registered, a 6-digit reset code has been sent. Check the app terminal (console email backend) for the code during development.');
    } catch {
      setError('Unable to connect. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: confirm OTP + new password ────────────────────────────────────
  const handleResetPassword = async () => {
    setError('');
    setSuccess('');

    if (!otp.trim() || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/users/reset-password/', {
        email:        email.trim().toLowerCase(),
        otp:          otp.trim(),
        new_password:  newPassword,
        new_password2: confirmPassword,
      });
      setSuccess('Password reset successfully! Please log in with your new password.');
      // Navigate back to Login after a brief moment
      setTimeout(() => navigation.navigate('Login'), 1500);
    } catch (err) {
      const axiosErr = err as AxiosError<{detail?: string}>;
      setError(axiosErr.response?.data?.detail ?? 'Reset failed. Please try again.');
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
            <Text style={styles.title}>
              {step === 'request' ? 'Forgot Password' : 'Enter Reset Code'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'request'
                ? 'Enter your registered email address and we\'ll send you a reset code.'
                : `We sent a 6-digit code to ${email}. Enter it below along with your new password.`}
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Success Banner */}
          {success ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {/* Step 1: Email */}
          {step === 'request' && (
            <View style={styles.form}>
              <FormInput
                label="Email Address"
                placeholder="Enter your registered email"
                value={email}
                onChangeText={t => { setEmail(t); if (error) setError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              <PrimaryButton
                title="Send Reset Code"
                onPress={handleRequestOTP}
                loading={loading}
                disabled={loading}
              />
            </View>
          )}

          {/* Step 2: OTP + new password */}
          {step === 'confirm' && (
            <View style={styles.form}>
              <FormInput
                label="Reset Code (6 digits)"
                placeholder="Enter the code from your email"
                value={otp}
                onChangeText={t => { setOtp(t); if (error) setError(''); }}
                keyboardType="number-pad"
                maxLength={6}
              />
              <FormInput
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={t => { setNewPassword(t); if (error) setError(''); }}
                secureTextEntry
              />
              <FormInput
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={t => { setConfirmPassword(t); if (error) setError(''); }}
                secureTextEntry
              />
              <PrimaryButton
                title="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
              />
              {/* Allow re-requesting the code */}
              <TouchableOpacity
                style={styles.resendLink}
                onPress={() => { setStep('request'); setError(''); setSuccess(''); setOtp(''); }}>
                <Text style={styles.resendText}>Didn't receive a code? Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea:    {flex: 1, backgroundColor: Colors.background},
  flex:        {flex: 1},
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
    lineHeight: 20,
  },
  form: {marginBottom: Spacing.xl},
  errorBanner: {
    backgroundColor: Colors.redBg,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  errorText: {...Typography.body, color: Colors.redDark},
  successBanner: {
    backgroundColor: Colors.lightGreenBg,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGreen,
  },
  successText: {...Typography.body, color: Colors.primaryGreen},
  resendLink: {alignItems: 'center', marginTop: Spacing.base},
  resendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primaryGreen,
  },
  backLink: {alignItems: 'center', marginTop: Spacing.md},
  backText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondaryText,
  },
});

export default ForgotPasswordScreen;
