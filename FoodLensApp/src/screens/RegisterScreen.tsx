/**
 * RegisterScreen — User registration form
 * Wired to POST /api/auth/register/ via AuthContext.
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

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({navigation}) => {
  const {register} = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required.';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    }
    if (!password2) {
      newErrors.password2 = 'Please confirm your password.';
    }
    if (password && password2 && password !== password2) {
      newErrors.password2 = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setGeneralError('');

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await register({username, email, password, password2});
      // On success, AuthContext sets the user/token
      // and AppNavigator will automatically navigate to Dashboard
    } catch (error) {
      const axiosError = error as AxiosError<Record<string, string[]>>;

      if (axiosError.response?.data) {
        // Surface backend validation errors per field
        const backendErrors = axiosError.response.data;
        const fieldErrors: Record<string, string> = {};

        for (const [field, messages] of Object.entries(backendErrors)) {
          if (Array.isArray(messages)) {
            fieldErrors[field] = messages.join(' ');
          } else if (typeof messages === 'string') {
            fieldErrors[field] = messages;
          }
        }

        // Check for non_field_errors (cross-field validation like password mismatch)
        if (fieldErrors.non_field_errors) {
          setGeneralError(fieldErrors.non_field_errors);
          delete fieldErrors.non_field_errors;
        }

        setErrors(fieldErrors);
      } else if (axiosError.message) {
        setGeneralError(
          axiosError.code === 'ERR_NETWORK'
            ? 'Cannot connect to server. Make sure the backend is running.'
            : axiosError.message,
        );
      } else {
        setGeneralError('Registration failed. Please try again.');
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to start scanning and analyzing your food
            </Text>
          </View>

          {/* General Error */}
          {generalError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChangeText={text => {
                setUsername(text);
                if (errors.username) {
                  setErrors(prev => ({...prev, username: ''}));
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.username}
            />
            <FormInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={text => {
                setEmail(text);
                if (errors.email) {
                  setErrors(prev => ({...prev, email: ''}));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />
            <FormInput
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (errors.password) {
                  setErrors(prev => ({...prev, password: ''}));
                }
              }}
              secureTextEntry
              error={errors.password}
            />
            <FormInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={password2}
              onChangeText={text => {
                setPassword2(text);
                if (errors.password2) {
                  setErrors(prev => ({...prev, password2: ''}));
                }
              }}
              secureTextEntry
              error={errors.password2}
            />
          </View>

          {/* Submit Button */}
          <PrimaryButton
            title="Sign Up"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
          />

          {/* Login Link */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Already have an account? </Text>
            <TextButton
              title="Log in"
              onPress={() => navigation.navigate('Login')}
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

export default RegisterScreen;
