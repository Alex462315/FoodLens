/**
 * ChangePasswordScreen — Allows a logged-in user to change their password.
 *
 * Route: More → Settings → Change Password
 * API:   POST /api/users/change-password/   (requires Token header — auto-attached by apiClient)
 *
 * Security: user must prove they know the CURRENT password even though they are
 * already authenticated — protects against shared/unlocked devices.
 * On success the user stays logged in (token is not invalidated).
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
import {PrimaryButton, FormInput} from '../components';
import apiClient from '../services/apiClient';
import {AxiosError} from 'axios';

interface Props {
  navigation: any;
}

const ChangePasswordScreen: React.FC<Props> = ({navigation}) => {
  const [currentPassword,  setCurrentPassword]  = useState('');
  const [newPassword,      setNewPassword]      = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [error,            setError]            = useState('');
  const [success,          setSuccess]          = useState('');
  const [loading,          setLoading]          = useState(false);

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/users/change-password/', {
        current_password: currentPassword,
        new_password:     newPassword,
        new_password2:    confirmPassword,
      });
      setSuccess(response.data?.detail ?? 'Password changed successfully.');
      // Clear all fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const axiosErr = err as AxiosError<{detail?: string}>;
      if (axiosErr.response?.data?.detail) {
        setError(axiosErr.response.data.detail);
      } else if (axiosErr.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Make sure the backend is running.');
      } else {
        setError('Failed to change password. Please try again.');
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
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>
              Enter your current password to confirm your identity, then set a new one.
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
              <Text style={styles.successText}>✓ {success}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Current Password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChangeText={t => { setCurrentPassword(t); if (error) setError(''); }}
              secureTextEntry
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
          </View>

          <PrimaryButton
            title="Update Password"
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading}
          />
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
});

export default ChangePasswordScreen;
