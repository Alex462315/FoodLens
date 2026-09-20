/**
 * AnalyticsScreen — Admin Dashboard (Analytics)
 *
 * Part C of the prompt: aggregate analytics visible only to is_staff users.
 *
 * Previous syntax error: the screen had a stray Unicode apostrophe (') in the
 * JSX text on the insight banner line that was breaking the parser. This was
 * fixed in a prior session but is documented here per the prompt requirement.
 *
 * This screen now:
 * - Fetches /api/admin/analytics/ (is_staff gated, 403 for normal users)
 * - Shows summary cards (total users, total scans)
 * - Risk-level distribution bar chart (Low / Moderate / High)
 * - Top-10 most-flagged ingredients list
 *
 * Navigation to this screen is gated in MoreScreen — only is_staff users see it.
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
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import apiClient from '../services/apiClient';

// ── Types ───────────────────────────────────────────────────────────────────
interface AdminAnalytics {
  total_users: number;
  total_scans: number;
  risk_level_distribution: {low: number; moderate: number; high: number};
  most_flagged_ingredients: Array<{name: string; flagged_count: number}>;
}

const RISK_COLORS: Record<string, string> = {
  high: '#EF4444',
  moderate: '#F59E0B',
  low: '#10B981',
};

const RISK_LABELS: Record<string, string> = {
  high: 'High Risk',
  moderate: 'Moderate Risk',
  low: 'Low Risk',
};

// ── Main Component ──────────────────────────────────────────────────────────
const AnalyticsScreen: React.FC = () => {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await apiClient.get<AdminAnalytics>('/admin/analytics/');
      setData(res.data);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('Admin access required. Your account does not have staff privileges.');
      } else {
        setError('Could not load admin analytics. Check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAdminAnalytics();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>ADMIN</Text>
        </View>
        <Text style={styles.headerTitle}>📊 Analytics Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Aggregate stats across all FoodLens users
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading analytics…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>🔒</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAdminAnalytics(true)}
              tintColor={Colors.primaryGreen}
              colors={[Colors.primaryGreen]}
            />
          }>

          {/* ── Summary Cards ──────────────────────────────── */}
          <View style={styles.statsRow}>
            <SummaryCard
              icon="👥"
              value={String(data.total_users)}
              label="Total Users"
              color="#6366F1"
            />
            <SummaryCard
              icon="📦"
              value={String(data.total_scans)}
              label="Total Scans"
              color={Colors.primaryGreen}
            />
          </View>

          {/* ── Risk Distribution ──────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Risk Level Distribution</Text>
            <Text style={styles.cardSubtitle}>
              Breakdown of all product scans across every user
            </Text>

            {(() => {
              const dist = data.risk_level_distribution;
              const total = dist.low + dist.moderate + dist.high;

              return (['high', 'moderate', 'low'] as const).map(level => {
                const count = dist[level];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <View key={level} style={styles.distRow}>
                    <View style={styles.distLabelRow}>
                      <View
                        style={[styles.distDot, {backgroundColor: RISK_COLORS[level]}]}
                      />
                      <Text style={styles.distLabel}>{RISK_LABELS[level]}</Text>
                      <Text style={styles.distCount}>
                        {count} scan{count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.distBarRow}>
                      <View style={styles.distTrack}>
                        <View
                          style={[
                            styles.distFill,
                            {
                              width: `${Math.max(pct, 2)}%`,
                              backgroundColor: RISK_COLORS[level],
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.distPct, {color: RISK_COLORS[level]}]}>
                        {pct}%
                      </Text>
                    </View>
                  </View>
                );
              });
            })()}
          </View>

          {/* ── Most Flagged Ingredients ───────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Most Flagged Ingredients</Text>
            <Text style={styles.cardSubtitle}>
              Top ingredients appearing across all user scans
            </Text>

            {data.most_flagged_ingredients.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No ingredient data yet.</Text>
              </View>
            ) : (
              data.most_flagged_ingredients.slice(0, 10).map((item, idx) => {
                const maxCount = data.most_flagged_ingredients[0]?.flagged_count ?? 1;
                const barPct = Math.round((item.flagged_count / maxCount) * 100);
                const isTop3 = idx < 3;

                return (
                  <View
                    key={idx}
                    style={[styles.ingredientRow, idx === 0 && styles.ingredientRowFirst]}>
                    <View style={[styles.rankBadge, isTop3 && styles.rankBadgeTop]}>
                      <Text style={[styles.rankText, isTop3 && styles.rankTextTop]}>
                        {idx + 1}
                      </Text>
                    </View>
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>{item.name}</Text>
                      <View style={styles.ingBarTrack}>
                        <View
                          style={[
                            styles.ingBarFill,
                            {
                              width: `${barPct}%`,
                              backgroundColor: isTop3 ? '#EF4444' : '#F59E0B',
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{item.flagged_count}</Text>
                      <Text style={styles.countLabel}>times</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ── Insight Banner ─────────────────────────────── */}
          {data.most_flagged_ingredients.length > 0 && (
            <View style={styles.insightBanner}>
              <Text style={styles.insightIcon}>💡</Text>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>
                  {data.most_flagged_ingredients[0]?.name}
                </Text>
                {' '}is the most flagged ingredient across all users with{' '}
                <Text style={styles.insightBold}>
                  {data.most_flagged_ingredients[0]?.flagged_count}
                </Text>
                {' '}occurrences. Consider monitoring products containing this ingredient.
              </Text>
            </View>
          )}

          {/* Spacer */}
          <View style={{height: Spacing.xl}} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

// ── Sub-component ───────────────────────────────────────────────────────────
const SummaryCard: React.FC<{
  icon: string;
  value: string;
  label: string;
  color: string;
}> = ({icon, value, label, color}) => (
  <View style={styles.summaryCard}>
    <View style={[styles.summaryIconBox, {backgroundColor: color + '18'}]}>
      <Text style={styles.summaryIcon}>{icon}</Text>
    </View>
    <Text style={[styles.summaryValue, {color}]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6366F1',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: Spacing.sm,
  },
  headerBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
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
    lineHeight: 22,
  },

  // Summary Cards
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadow.sm,
  },
  summaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  summaryIcon: {fontSize: 24},
  summaryValue: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    marginBottom: 2,
  },
  summaryLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    textAlign: 'center',
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
    marginBottom: 6,
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
  distBarRow: {flexDirection: 'row', alignItems: 'center'},
  distTrack: {
    height: 10,
    backgroundColor: Colors.background,
    borderRadius: 5,
    overflow: 'hidden',
    flex: 1,
    marginRight: Spacing.sm,
  },
  distFill: {height: 10, borderRadius: 5},
  distPct: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.small,
    width: 40,
    textAlign: 'right',
  },

  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  ingredientRowFirst: {borderTopWidth: 0},
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  rankBadgeTop: {backgroundColor: '#FEE2E2'},
  rankText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
  },
  rankTextTop: {color: '#EF4444'},
  ingredientInfo: {flex: 1},
  ingredientName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
    marginBottom: 4,
  },
  ingBarTrack: {
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  ingBarFill: {height: 4, borderRadius: 2},
  countBadge: {
    alignItems: 'center',
    marginLeft: Spacing.sm,
    minWidth: 40,
  },
  countText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
  },
  countLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondaryText,
  },

  // Empty
  emptyBox: {alignItems: 'center', paddingVertical: Spacing.xl},
  emptyIcon: {fontSize: 40, marginBottom: Spacing.sm},
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
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
