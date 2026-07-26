/**
 * FormInput — Styled text input with label and error message
 * Matches the Figma design's input field style.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
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
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
        placeholderTextColor={Colors.lightText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...textInputProps}
      />
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
