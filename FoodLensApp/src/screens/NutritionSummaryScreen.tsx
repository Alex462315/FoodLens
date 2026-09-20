/**
 * NutritionSummaryScreen — Daily/Weekly consumption tracker.
 *
 * Shows aggregated nutritional data from scan history:
 *   - Period toggle (Daily / Weekly / Monthly)
 *   - Calorie, Sugar, Fat, Protein, Salt totals + averages
 *   - Per-scan product nutrition breakdown
 *   - Visual progress bars vs WHO recommended daily limits
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import apiClient from '../services/apiClient';

// WHO recommended daily limits (per person)
const DAILY_LIMITS = {
  energy_kcal: 2000,
  sugars: 25,       // WHO: <25g free sugars/day
  fat: 65,          // ~30% of 2000 kcal
  salt: 5,          // WHO: <5g/day
  proteins: 50,     // General reference
  fiber: 25,        // WHO recommendation
};

type Period = 'daily' | 'weekly' | 'monthly';

interface NutritionSummary {
  period: Period;
  scan_count: number;
  total_scans_in_period: number;
  totals: Record<string, number>;
  averages: Record<string, number>;
  daily_breakdown: Array<{date: string; scan_count: number; [key: string]: any}>;
  top_products: Array<{
    product_name: string;
    product_image_url: string;
    energy_kcal: number;
    sugars: number;
    fat: number;
    salt: number;
    scanned_at: string;
  }>;
}

const NutritionSummaryScreen: React.FC = () => {
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<NutritionSummary>(
        `/scoring/nutrition-summary/?period=${p}`,
      );
      setData(res.data);
    } catch (err: any) {
      setError('Could not load nutrition summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSummary(period);
    }, [period, fetchSummary]),
  );

  const changePeriod = (p: Period) => {
    setPeriod(p);
    fetchSummary(p);
  };

  const periodLabel = period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : 'This Month';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔥 Nutrition Tracker</Text>
        <Text style={styles.headerSubtitle}>Track your food consumption patterns</Text>
      </View>

      {/* Period Toggle */}
      <View style={styles.periodToggle}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => changePeriod(p)}>
            <Text
              style={[
                styles.periodButtonText,
                period === p && styles.periodButtonTextActive,
              ]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !data || data.scan_count === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          {data && data.total_scans_in_period > 0 ? (
            // Scans exist but none have nutrition data (older scans pre-fix)
            <>
              <Text style={styles.emptyTitle}>No nutrition data {periodLabel}</Text>
              <Text style={styles.emptyText}>
                You have {data.total_scans_in_period} scan
                {data.total_scans_in_period > 1 ? 's' : ''} this period, but
                none contain nutritional information yet. Re-scan a barcode
                product to start tracking nutrition.
              </Text>
            </>
          ) : (
            // No scans at all
            <>
              <Text style={styles.emptyTitle}>No scans {periodLabel}</Text>
              <Text style={styles.emptyText}>
                Scan a barcode product (e.g. Nutella, Lays, Britannia) to
                start tracking your nutritional intake.
              </Text>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* Summary Header Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{periodLabel}</Text>
            <Text style={styles.summarySubtitle}>{data.scan_count} product{data.scan_count > 1 ? 's' : ''} scanned</Text>
            <View style={styles.calorieCircle}>
              <Text style={styles.calorieValue}>
                {Math.round(data.totals.energy_kcal || 0)}
              </Text>
              <Text style={styles.calorieUnit}>kcal total</Text>
            </View>
            {data.averages.energy_kcal > 0 && (
              <Text style={styles.calorieAvg}>
                Avg {Math.round(data.averages.energy_kcal)} kcal per product
              </Text>
            )}
          </View>

          {/* Nutrient Progress Bars */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nutrient Totals vs Daily Limits</Text>
            <Text style={styles.cardSubtitle}>Based on WHO recommended daily allowances</Text>

            {[
              {key: 'sugars', label: 'Sugar', unit: 'g', limit: DAILY_LIMITS.sugars, color: '#F59E0B'},
              {key: 'fat', label: 'Fat', unit: 'g', limit: DAILY_LIMITS.fat, color: '#EF4444'},
              {key: 'salt', label: 'Salt', unit: 'g', limit: DAILY_LIMITS.salt, color: '#8B5CF6'},
              {key: 'proteins', label: 'Protein', unit: 'g', limit: DAILY_LIMITS.proteins, color: '#3B82F6'},
              {key: 'fiber', label: 'Fiber', unit: 'g', limit: DAILY_LIMITS.fiber, color: '#10B981'},
            ].map(({key, label, unit, limit, color}) => {
              const val = data.totals[key] || 0;
              // For weekly/monthly, scale limit up
              const scaledLimit = period === 'weekly' ? limit * 7 : period === 'monthly' ? limit * 30 : limit;
              const pct = Math.min((val / scaledLimit) * 100, 100);
              const isOver = pct >= 90;

              return (
                <View key={key} style={styles.nutrientRow}>
                  <View style={styles.nutrientLabelRow}>
                    <Text style={styles.nutrientLabel}>{label}</Text>
                    <Text style={[styles.nutrientValue, isOver && styles.nutrientValueOver]}>
                      {val.toFixed(1)}{unit}
                      <Text style={styles.nutrientLimit}> / {scaledLimit}{unit}</Text>
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: isOver ? '#EF4444' : color,
                        },
                      ]}
                    />
                  </View>
                  {isOver && (
                    <Text style={styles.overLimitText}>⚠️ Approaching limit</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Macro Breakdown Grid */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Average Per Scan</Text>
            <View style={styles.macroGrid}>
              {[
                {key: 'energy_kcal', label: 'Calories', unit: 'kcal', icon: '🔥'},
                {key: 'carbohydrates', label: 'Carbs', unit: 'g', icon: '🌾'},
                {key: 'fat', label: 'Fat', unit: 'g', icon: '🧈'},
                {key: 'proteins', label: 'Protein', unit: 'g', icon: '💪'},
                {key: 'sugars', label: 'Sugars', unit: 'g', icon: '🍬'},
                {key: 'salt', label: 'Salt', unit: 'g', icon: '🧂'},
              ].map(({key, label, unit, icon}) => (
                <View key={key} style={styles.macroItem}>
                  <Text style={styles.macroIcon}>{icon}</Text>
                  <Text style={styles.macroValue}>
                    {key === 'energy_kcal'
                      ? Math.round(data.averages[key] || 0)
                      : (data.averages[key] || 0).toFixed(1)}
                  </Text>
                  <Text style={styles.macroUnit}>{unit}</Text>
                  <Text style={styles.macroLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Top Scanned Products */}
          {data.top_products.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Scanned Products</Text>
              {data.top_products.map((product, index) => (
                <View key={index} style={styles.productRow}>
                  {product.product_image_url ? (
                    <Image
                      source={{uri: product.product_image_url}}
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Text style={{fontSize: 18}}>📦</Text>
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.product_name}
                    </Text>
                    <Text style={styles.productNutrition}>
                      {Math.round(product.energy_kcal || 0)} kcal
                      {product.sugars != null ? ` · ${Number(product.sugars).toFixed(1)}g sugar` : ''}
                      {product.salt != null ? ` · ${Number(product.salt).toFixed(2)}g salt` : ''}
                    </Text>
                    <Text style={styles.productDate}>{product.scanned_at}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>
              ℹ️ Nutritional data sourced from Open Food Facts (per 100g). Actual consumption depends on serving size. Consult a dietitian for personalized advice.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
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

  // Period toggle
  periodToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    ...Shadow.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: Colors.primaryGreen,
  },
  periodButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  periodButtonTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
  },

  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },

  // Summary card
  summaryCard: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadow.md,
  },
  summaryTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.white,
  },
  summarySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  calorieCircle: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  calorieValue: {
    fontFamily: FontFamily.bold,
    fontSize: 48,
    color: Colors.white,
  },
  calorieUnit: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: 'rgba(255,255,255,0.85)',
  },
  calorieAvg: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: 'rgba(255,255,255,0.75)',
  },

  // Cards
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginBottom: Spacing.md,
  },

  // Nutrient rows
  nutrientRow: {marginBottom: Spacing.md},
  nutrientLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  nutrientLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  nutrientValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  nutrientValueOver: {color: '#EF4444'},
  nutrientLimit: {
    fontFamily: FontFamily.regular,
    color: Colors.secondaryText,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  overLimitText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: '#EF4444',
    marginTop: 2,
  },

  // Macro grid
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  macroItem: {
    width: '30%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  macroIcon: {fontSize: 20, marginBottom: 2},
  macroValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.primaryGreen,
  },
  macroUnit: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
  },
  macroLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.darkText,
    marginTop: 2,
    textAlign: 'center',
  },

  // Products list
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  productImage: {width: 44, height: 44, borderRadius: BorderRadius.md},
  productImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {flex: 1, marginLeft: Spacing.md},
  productName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  productNutrition: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  productDate: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    marginTop: 2,
  },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: Colors.lightGreenBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  disclaimerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    lineHeight: 18,
  },

  // Center states
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
});

export default NutritionSummaryScreen;
