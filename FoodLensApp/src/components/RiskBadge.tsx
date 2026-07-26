/**
 * RiskBadge — Color-coded pill badge for Low / Moderate / High risk levels
 * Matches the Figma design's risk indicator pills.
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {BorderRadius, Spacing} from '../theme/spacing';

export type RiskLevel = 'low' | 'moderate' | 'high';

interface RiskBadgeProps {
  level: RiskLevel;
  showDot?: boolean;
  compact?: boolean;
}

const RISK_CONFIG: Record<
  RiskLevel,
  {label: string; bg: string; text: string; dot: string}
> = {
  low: {
    label: 'Low Risk',
    bg: Colors.riskLow.bg,
    text: Colors.riskLow.text,
    dot: Colors.riskLow.accent,
  },
  moderate: {
    label: 'Moderate Risk',
    bg: Colors.riskModerate.bg,
    text: Colors.riskModerate.text,
    dot: Colors.riskModerate.accent,
  },
  high: {
    label: 'High Risk',
    bg: Colors.riskHigh.bg,
    text: Colors.riskHigh.text,
    dot: Colors.riskHigh.accent,
  },
};

const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  showDot = true,
  compact = false,
}) => {
  const config = RISK_CONFIG[level];

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: config.bg},
        compact && styles.compact,
      ]}>
      {showDot && <View style={[styles.dot, {backgroundColor: config.dot}]} />}
      <Text
        style={[
          styles.label,
          {color: config.text},
          compact && styles.compactLabel,
        ]}>
        {config.label}
      </Text>
    </View>
  );
};

/**
 * Utility to get risk level from a numeric score (0–100)
 */
export const getRiskLevel = (score: number): RiskLevel => {
  if (score <= 33) {
    return 'low';
  }
  if (score <= 66) {
    return 'moderate';
  }
  return 'high';
};

/**
 * Utility to get the main color for a risk level
 */
export const getRiskColor = (level: RiskLevel): string => {
  return RISK_CONFIG[level].dot;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
  },
  compactLabel: {
    fontSize: FontSize.small,
  },
});

export default RiskBadge;
