/**
 * LandingScreen — Marketing/intro screen
 * Combined splash + marketing into one screen.
 * Shows app branding, feature highlights, and Get Started / Login buttons.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {PrimaryButton, SecondaryButton} from '../components';

interface LandingScreenProps {
  navigation: any;
}

// Feature card data
const features = [
  {
    icon: '📷',
    title: 'Scan Product',
    description: 'Instantly scan any food product barcode or ingredient label',
  },
  {
    icon: '🔬',
    title: 'Analyze Ingredients',
    description: 'AI-powered analysis of every ingredient in your food',
  },
  {
    icon: '📊',
    title: 'Health Risk Score',
    description: 'Get a personalized risk score based on your health profile',
  },
  {
    icon: '💡',
    title: 'Personalized Insights',
    description: 'Tailored recommendations for your dietary needs',
  },
];

const LandingScreen: React.FC<LandingScreenProps> = ({navigation}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.background}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🍃</Text>
          </View>
          <Text style={styles.appName}>FoodLens</Text>
          <Text style={styles.tagline}>
            Scan. Analyze. Understand.{'\n'}Eat Better.
          </Text>
        </View>

        {/* Feature Grid */}
        <View style={styles.featureGrid}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <PrimaryButton
            title="Get Started"
            onPress={() => navigation.navigate('Register')}
            style={styles.getStartedButton}
          />
          <SecondaryButton
            title="Login"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['2xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    ...Shadow.md,
  },
  logoIcon: {
    fontSize: 40,
  },
  appName: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    color: Colors.primaryGreen,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.h2,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Feature Grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing['2xl'],
  },
  featureCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    alignItems: 'center',
    ...Shadow.sm,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.lightGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.darkText,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    ...Typography.caption,
    color: Colors.secondaryText,
    textAlign: 'center',
  },

  // CTA Buttons
  ctaSection: {
    paddingTop: Spacing.base,
  },
  getStartedButton: {
    marginBottom: Spacing.md,
  },
  loginButton: {},
});

export default LandingScreen;
