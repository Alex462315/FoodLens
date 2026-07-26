/**
 * StyleGuideScreen — Showcases all design system components
 * This is the Phase 1 deliverable: a visual catalog of all reusable
 * components built from the Figma design spec.
 */

import React from 'react';
import {View, Text, ScrollView, StyleSheet, Alert} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import TextButton from '../components/TextButton';
import RiskBadge from '../components/RiskBadge';
import HealthRiskScoreGauge from '../components/HealthRiskScoreGauge';

const StyleGuideScreen: React.FC = () => {
  const handlePress = (name: string) => {
    Alert.alert('Component Pressed', `You tapped: ${name}`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FoodLens</Text>
        <Text style={styles.headerSubtitle}>Design System — Style Guide</Text>
      </View>

      {/* Colors Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Colors</Text>
        <View style={styles.colorGrid}>
          <ColorSwatch color={Colors.primaryGreen} label="#2E7D32" name="Primary Green" />
          <ColorSwatch color={Colors.lightGreen} label="#66BB6A" name="Light Green" />
          <ColorSwatch color={Colors.amber} label="#FFB74D" name="Amber" />
          <ColorSwatch color={Colors.red} label="#EF5350" name="Red" />
          <ColorSwatch color={Colors.background} label="#F5F7FA" name="Background" bordered />
          <ColorSwatch color={Colors.darkText} label="#263238" name="Dark Text" />
        </View>
      </View>

      {/* Typography Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Typography</Text>
        <View style={styles.card}>
          <Text style={[Typography.h1, {color: Colors.darkText}]}>
            H1 — SemiBold 24px
          </Text>
          <Text style={[Typography.h2, {color: Colors.darkText, marginTop: Spacing.sm}]}>
            H2 — SemiBold 18px
          </Text>
          <Text style={[Typography.subtitle, {color: Colors.darkText, marginTop: Spacing.sm}]}>
            Subtitle — Medium 14px
          </Text>
          <Text style={[Typography.body, {color: Colors.darkText, marginTop: Spacing.sm}]}>
            Body — Regular 14px
          </Text>
          <Text style={[Typography.caption, {color: Colors.secondaryText, marginTop: Spacing.sm}]}>
            Caption — Regular 12px
          </Text>
        </View>
      </View>

      {/* Buttons Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buttons</Text>
        <View style={styles.card}>
          <PrimaryButton
            title="Primary Button"
            onPress={() => handlePress('Primary Button')}
          />
          <View style={styles.spacer} />
          <SecondaryButton
            title="Secondary Button"
            onPress={() => handlePress('Secondary Button')}
          />
          <View style={styles.spacer} />
          <TextButton
            title="Text Button"
            onPress={() => handlePress('Text Button')}
          />
          <View style={styles.spacer} />
          <Text style={styles.stateLabel}>Disabled States:</Text>
          <View style={styles.spacerSm} />
          <PrimaryButton
            title="Disabled Primary"
            onPress={() => {}}
            disabled
          />
          <View style={styles.spacerSm} />
          <SecondaryButton
            title="Disabled Secondary"
            onPress={() => {}}
            disabled
          />
          <View style={styles.spacerSm} />
          <Text style={styles.stateLabel}>Loading State:</Text>
          <View style={styles.spacerSm} />
          <PrimaryButton
            title="Loading..."
            onPress={() => {}}
            loading
          />
        </View>
      </View>

      {/* Risk Badges Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk Badges</Text>
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <RiskBadge level="low" />
            <RiskBadge level="moderate" />
            <RiskBadge level="high" />
          </View>
          <View style={styles.spacer} />
          <Text style={styles.stateLabel}>Compact Variants:</Text>
          <View style={styles.spacerSm} />
          <View style={styles.badgeRow}>
            <RiskBadge level="low" compact />
            <RiskBadge level="moderate" compact />
            <RiskBadge level="high" compact />
          </View>
          <View style={styles.spacer} />
          <Text style={styles.stateLabel}>Without Dot:</Text>
          <View style={styles.spacerSm} />
          <View style={styles.badgeRow}>
            <RiskBadge level="low" showDot={false} />
            <RiskBadge level="moderate" showDot={false} />
            <RiskBadge level="high" showDot={false} />
          </View>
        </View>
      </View>

      {/* Health Risk Score Gauge Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Risk Score Gauge</Text>
        <View style={styles.card}>
          <View style={styles.gaugeRow}>
            <HealthRiskScoreGauge score={28} size={100} strokeWidth={10} />
            <HealthRiskScoreGauge score={65} size={100} strokeWidth={10} />
            <HealthRiskScoreGauge score={85} size={100} strokeWidth={10} />
          </View>
          <View style={styles.spacer} />
          <Text style={styles.stateLabel}>Large Gauge (as on Dashboard):</Text>
          <View style={styles.spacerSm} />
          <HealthRiskScoreGauge score={65} size={160} strokeWidth={14} />
        </View>
      </View>

      {/* Spacing & Elevation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Elevation / Shadows</Text>
        <View style={styles.elevationRow}>
          <View style={[styles.elevationBox, Shadow.sm]}>
            <Text style={styles.elevationLabel}>sm</Text>
          </View>
          <View style={[styles.elevationBox, Shadow.md]}>
            <Text style={styles.elevationLabel}>md</Text>
          </View>
          <View style={[styles.elevationBox, Shadow.lg]}>
            <Text style={styles.elevationLabel}>lg</Text>
          </View>
          <View style={[styles.elevationBox, Shadow.xl]}>
            <Text style={styles.elevationLabel}>xl</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          FoodLens Design System v1.0 • Phase 1
        </Text>
      </View>
    </ScrollView>
  );
};

// Helper component for color swatches
const ColorSwatch: React.FC<{
  color: string;
  label: string;
  name: string;
  bordered?: boolean;
}> = ({color, label, name, bordered}) => (
  <View style={styles.swatchContainer}>
    <View
      style={[
        styles.swatch,
        {backgroundColor: color},
        bordered && styles.swatchBordered,
      ]}
    />
    <Text style={styles.swatchName}>{name}</Text>
    <Text style={styles.swatchLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing['4xl'],
  },
  header: {
    backgroundColor: Colors.primaryGreen,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.white,
    fontSize: 28,
  },
  headerSubtitle: {
    ...Typography.subtitle,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.darkText,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadow.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  swatchContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    width: '30%',
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  swatchBordered: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  swatchName: {
    ...Typography.caption,
    color: Colors.darkText,
    textAlign: 'center',
  },
  swatchLabel: {
    ...Typography.caption,
    color: Colors.secondaryText,
    fontSize: 10,
  },
  spacer: {
    height: Spacing.base,
  },
  spacerSm: {
    height: Spacing.sm,
  },
  stateLabel: {
    ...Typography.caption,
    color: Colors.secondaryText,
    marginTop: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  elevationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  elevationBox: {
    width: 64,
    height: 64,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevationLabel: {
    ...Typography.caption,
    color: Colors.secondaryText,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.lightText,
  },
});

export default StyleGuideScreen;
