/**
 * AnalyticsScreen — Personal scan analytics dashboard.
 *
 * Shows:
 * - Total scans, average score, allergen warning count
 * - Score distribution bar chart (Low / Moderate / High)
 * - Top 10 most commonly flagged ingredients in user's scan history
 *
 * Abstract: "Administration and Analytics — aggregate analytics view
 * highlighting the most commonly flagged ingredients across all users."
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import apiClient from '../services/apiClient';

interface AnalyticsData {
  total_scans: number;
  average_score: number;
  allergen_warning_count: number;
  score_distribution: {Low: number; Moderate: number; High: number; Unknown: number};
  top_flagged_ingredients: Array<{
    ingredient: string;
    category: string;
    base_risk_score: number;
    times_seen: number;
  }>;
}

const CATEGORY_EMOJI: Record<string, string> = {
  sweetener: '🍬',
  fat: '🧈',
  sodium_containing: '🧂',
  preservative: '🧪',
  refined_carb: '🍞',
  natural: '🌿',
  artificial_color: '🎨',
  flavor_enhancer: '👃',
  emulsifier: '🔬',
};

const RISK_COLOR = {High: '#EF4444', Moderate: '#F59E0B', Low: '#10B981'};

const AnalyticsScreen: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, []),
  );

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AnalyticsData>('/scoring/analytics/');
      setData(res.data);
    } catch {
      setError('Could not load analytics. Make sure you have scanned some products first.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 7) return '#EF4444';
    if (score >= 4) return '#F59E0B';
    return '#10B981';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📈 My Scan Analytics</Text>
        <Text style={styles.headerSubtitle}>
          Insights from your personal food scan history
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
          <Text style={styles.loadingText}>Analysing your scan history…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>📭</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : data && data.total_scans === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptyText}>
            Scan some products first to see your personalised analytics here.
          </Text>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          {/* ── Summary Stats ─────────────────────────────── */}
          <View style={styles.statsRow}>
            <StatCard
              value={String(data.total_scans)}
              label="Total Scans"
              icon="📦"
            />
            <StatCard
              value={`${data.average_score}/100`}
              label="Avg Risk Score"
              icon="🎯"
              valueColor={
                data.average_score >= 67 ? '#EF4444'
                : data.average_score >= 34 ? '#F59E0B' : '#10B981'
              }
            />
            <StatCard
              value={String(data.allergen_warning_count)}
              label="Allergen Alerts"
              icon="🚨"
              valueColor={data.allergen_warning_count > 0 ? '#EF4444' : '#10B981'}
            />
          </View>

          {/* ── Score Distribution ────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Risk Score Distribution</Text>
            <Text style={styles.cardSubtitle}>Breakdown of all your scanned products</Text>

            {(['High', 'Moderate', 'Low'] as const).map(level => {
              const count = data.score_distribution[level] ?? 0;
              const pct = data.total_scans > 0
                ? Math.round((count / data.total_scans) * 100)
                : 0;
              return (
                <View key={level} style={styles.distRow}>
                  <View style={styles.distLabelRow}>
                    <View
                      style={[
                        styles.distDot,
                        {backgroundColor: RISK_COLOR[level]},
                      ]}
                    />
                    <Text style={styles.distLabel}>{level} Risk</Text>
                    <Text style={styles.distCount}>{count} products</Text>
                  </View>
                  <View style={styles.distTrack}>
                    <View
                      style={[
                        styles.distFill,
                        {width: `${pct}%`, backgroundColor: RISK_COLOR[level]},
                      ]}
                    />
                  </View>
                  <Text style={[styles.distPct, {color: RISK_COLOR[level]}]}>
                    {pct}%
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ── Top Flagged Ingredients ───────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Most Seen Ingredients</Text>
            <Text style={styles.cardSubtitle}>
              Ingredients appearing most often in your scanned products
            </Text>

            {data.top_flagged_ingredients.length === 0 ? (
              <Text style={styles.emptyText}>No ingredient data yet.</Text>
            ) : (
              data.top_flagged_ingredients.map((item, idx) => {
                const maxSeen = data.top_flagged_ingredients[0]?.times_seen ?? 1;
                const barPct = Math.round((item.times_seen / maxSeen) * 100);
                const riskColor = getRiskColor(item.base_risk_score);
                const emoji = CATEGORY_EMOJI[item.category] ?? '🔬';

                return (
                  <View key={idx} style={styles.ingredientRow}>
                    <View style={styles.ingredientLeft}>
                      <Text style={styles.ingredientRank}>#{idx + 1}</Text>
                      <Text style={styles.ingredientEmoji}>{emoji}</Text>
                      <View style={styles.ingredientInfo}>
                        <Text style={styles.ingredientName}>{item.ingredient}</Text>
                        <Text style={styles.ingredientCategory}>
                          {item.category.replace(/_/g, ' ')}
                          {' · '}
                          Risk: {item.base_risk_score.toFixed(1)}/10
                        </Text>
                        <View style={styles.ingBarTrack}>
                          <View
                            style={[
                              styles.ingBarFill,
                              {width: `${barPct}%`, backgroundColor: riskColor},
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                    <View style={[styles.seenBadge, {borderColor: riskColor}]}>
                      <Text style={[styles.seenBadgeText, {color: riskColor}]}>
                        {item.times_seen}x
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ── Insight Banner ────────────────────────────── */}
          {data.top_flagged_ingredients.length > 0 && (
            <View style={styles.insightBanner}>
              <Text style={styles.insightIcon}>💡</Text>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>
                  {data.top_flagged_ingredients[0]?.ingredient}
                </Text>
                {' '}is the most frequently encountered ingredient in your scans. '}
                Consider checking products for this ingredient when making healthier choices.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

// ── Sub-component ───────────────────────────────────────────────────────────
const StatCard: React.FC<{
  value: string; label: string; icon: string; valueColor?: string;
}> = ({value, label, icon, valueColor = Colors.primaryGreen}) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, {color: valueColor}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  scroll: {paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl']},
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: Spacing.sm,
  },
  errorIcon: {fontSize: 48, marginBottom: Spacing.md},
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statIcon: {fontSize: 22, marginBottom: Spacing.xs},
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.primaryGreen,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginBottom: Spacing.md,
  },

  // Distribution
  distRow: {marginBottom: Spacing.md},
  distLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  distDot: {width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm},
  distLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.darkText,
    flex: 1,
  },
  distCount: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
  },
  distTrack: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
    marginRight: Spacing.sm,
  },
  distFill: {height: 8, borderRadius: 4},
  distPct: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.small,
    width: 36,
    textAlign: 'right',
  },

  // Ingredient Rows
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  ingredientLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ingredientRank: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    width: 24,
    paddingTop: 2,
  },
  ingredientEmoji: {fontSize: 20, marginRight: Spacing.sm},
  ingredientInfo: {flex: 1},
  ingredientName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  ingredientCategory: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  ingBarTrack: {
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  ingBarFill: {height: 4, borderRadius: 2},
  seenBadge: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: Spacing.sm,
  },
  seenBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.small,
  },

  // Insight Banner
  insightBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGreenBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGreen,
    gap: Spacing.sm,
  },
  insightIcon: {fontSize: 20},
  insightText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.darkText,
    lineHeight: 20,
  },
  insightBold: {fontFamily: FontFamily.bold, color: Colors.primaryGreen},
});

export default AnalyticsScreen;
