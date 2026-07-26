/**
 * HealthRiskScoreGauge — Circular donut/ring chart with score
 * Color segments: green → amber → red
 * Numeric score (0–100) centered, risk label below.
 * Matches the Figma design's Health Risk Score display.
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle, G} from 'react-native-svg';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {getRiskLevel, getRiskColor, RiskLevel} from './RiskBadge';

interface HealthRiskScoreGaugeProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

const HealthRiskScoreGauge: React.FC<HealthRiskScoreGaugeProps> = ({
  score,
  size = 140,
  strokeWidth = 12,
  showLabel = true,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const riskLevel = getRiskLevel(clampedScore);
  const activeColor = getRiskColor(riskLevel);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate the stroke dash for the score arc
  const scoreArc = (clampedScore / 100) * circumference;
  const remainingArc = circumference - scoreArc;

  // Risk label text
  const riskLabels: Record<RiskLevel, string> = {
    low: 'Low Risk',
    moderate: 'Moderate Risk',
    high: 'High Risk',
  };

  // Risk label color
  const riskLabelColors: Record<RiskLevel, string> = {
    low: Colors.riskLow.text,
    moderate: Colors.riskModerate.text,
    high: Colors.riskHigh.text,
  };

  return (
    <View style={styles.container}>
      <View style={[styles.gaugeContainer, {width: size, height: size}]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background track */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={Colors.border}
              strokeWidth={strokeWidth}
              fill="none"
              opacity={0.3}
            />
            {/* Score arc */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={activeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${scoreArc} ${remainingArc}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>

        {/* Centered score number */}
        <View style={styles.scoreOverlay}>
          <Text style={[styles.scoreText, {color: activeColor}]}>
            {clampedScore}
          </Text>
        </View>
      </View>

      {/* Risk label below the gauge */}
      {showLabel && (
        <Text style={[styles.riskLabel, {color: riskLabelColors[riskLevel]}]}>
          {riskLabels[riskLevel]}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xlarge,
  },
  riskLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    marginTop: 4,
  },
});

export default HealthRiskScoreGauge;
