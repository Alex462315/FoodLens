/**
 * ScanScreen — Placeholder screen
 * Scanning functionality will be built in a later task.
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing} from '../theme/spacing';

const ScanScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📷</Text>
      <Text style={styles.title}>Scanning Coming Soon</Text>
      <Text style={styles.subtitle}>
        Camera-based ingredient scanning will be available in a future update.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
});

export default ScanScreen;
