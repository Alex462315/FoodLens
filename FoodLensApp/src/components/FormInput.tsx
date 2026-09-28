/**
 * FormInput — Styled text input with label and error message
 * Matches the Figma design's input field style.
 * Includes a 10-second temporary password peek ("eye" icon) for secure inputs.
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius} from '../theme/spacing';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  containerStyle,
  secureTextEntry,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isPassword = Boolean(secureTextEntry);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const handleTogglePasswordPeek = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (isPasswordVisible) {
      // If currently visible, hide immediately
      setIsPasswordVisible(false);
    } else {
      // Reveal password for exactly 10 seconds, then auto-hide
      setIsPasswordVisible(true);
      hideTimerRef.current = setTimeout(() => {
        setIsPasswordVisible(false);
      }, 10000); // 10 seconds
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <RNTextInput
          style={[
            styles.input,
            isPassword && styles.inputWithEye,
            isFocused && styles.inputFocused,
            error ? styles.inputError : null,
          ]}
          placeholderTextColor={Colors.lightText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword ? !isPasswordVisible : false}
          {...textInputProps}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={handleTogglePasswordPeek}
            activeOpacity={0.7}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityLabel={isPasswordVisible ? 'Password visible for 10 seconds' : 'View password for 10 seconds'}>
            <Text style={styles.eyeIcon}>{isPasswordVisible ? '👁️' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
    width: '100%',
  },
  label: {
    ...Typography.subtitle,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    minHeight: 48,
    width: '100%',
  },
  inputWithEye: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  eyeIcon: {
    fontSize: 18,
    opacity: 0.85,
  },
  inputFocused: {
    borderColor: Colors.primaryGreen,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: Colors.red,
    borderWidth: 1.5,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.red,
    marginTop: Spacing.xs,
  },
});

export default FormInput;
