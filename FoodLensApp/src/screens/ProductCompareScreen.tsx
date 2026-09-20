/**
 * ProductCompareScreen — Side-by-side comparison of two scanned products.
 *
 * Pulls the last 10 scans from history, lets user pick 2,
 * then shows a head-to-head comparison of:
 *   - Health Risk Score (gauge + badge)
 *   - Nutritional values (calories, sugar, fat, salt, protein)
 *   - A clear "Healthier Choice" recommendation banner
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
import {lookupProductByBarcode} from '../services/productService';

interface ScanRecord {
  id: number;
  product_name: string;
  product_image_url: string;
  normalized_score: number;
  risk_label: string;
  barcode: string;
  created_at: string;
  nutrition_data?: Record<string, number>;
  has_allergen_warning: boolean;
}

const RISK_COLOR: Record<string, string> = {
  High: '#EF4444',
  Moderate: '#F59E0B',
  Low: '#10B981',
  Unknown: '#9CA3AF',
};

const NutrientRow: React.FC<{
  label: string;
  unit: string;
  val1?: number;
  val2?: number;
  lowerIsBetter?: boolean;
}> = ({label, unit, val1, val2, lowerIsBetter = true}) => {
  const v1 = val1 ?? 0;
  const v2 = val2 ?? 0;
  const p1Better = lowerIsBetter ? v1 < v2 : v1 > v2;
  const p2Better = lowerIsBetter ? v2 < v1 : v2 > v1;

  return (
    <View style={cmpStyles.nutrientRow}>
      <Text
        style={[
          cmpStyles.nutrientVal,
          p1Better && cmpStyles.nutrientBetter,
          !p1Better && p2Better && cmpStyles.nutrientWorse,
        ]}>
        {v1.toFixed(1)}
        {unit}
      </Text>
      <Text style={cmpStyles.nutrientLabel}>{label}</Text>
      <Text
        style={[
          cmpStyles.nutrientVal,
          p2Better && cmpStyles.nutrientBetter,
          !p2Better && p1Better && cmpStyles.nutrientWorse,
        ]}>
        {v2.toFixed(1)}
        {unit}
      </Text>
    </View>
  );
};

const ProductCompareScreen: React.FC = () => {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [product1, setProduct1] = useState<ScanRecord | null>(null);
  const [product2, setProduct2] = useState<ScanRecord | null>(null);
  const [selecting, setSelecting] = useState<1 | 2 | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, []),
  );

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ScanRecord[]>('/scoring/history/');
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enrich a scan record with live nutrition from Open Food Facts
   * if the stored nutrition_data is empty and a barcode is available.
   */
  const enrichWithNutrition = async (scan: ScanRecord): Promise<ScanRecord> => {
    const hasNutrition = scan.nutrition_data && Object.keys(scan.nutrition_data).length > 0;
    if (hasNutrition || !scan.barcode) return scan; // already has data or OCR scan
    try {
      const product = await lookupProductByBarcode(scan.barcode);
      if (product.found && product.nutrition) {
        return {
          ...scan,
          nutrition_data: product.nutrition as unknown as Record<string, number>,
        };
      }
    } catch {
      // silently ignore — just show 0.0
    }
    return scan;
  };

  const selectProduct = async (scan: ScanRecord) => {
    const enriched = await enrichWithNutrition(scan);
    if (selecting === 1) setProduct1(enriched);
    else if (selecting === 2) setProduct2(enriched);
    setSelecting(null);
  };

  // ── Healthier choice logic ──────────────────────────────────────────────
  const winner: 'product1' | 'product2' | 'tie' | null = (() => {
    if (!product1 || !product2) return null;
    if (product1.normalized_score < product2.normalized_score) return 'product1';
    if (product2.normalized_score < product1.normalized_score) return 'product2';
    return 'tie';
  })();

  const winnerName =
    winner === 'product1'
      ? product1?.product_name
      : winner === 'product2'
      ? product2?.product_name
      : null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={cmpStyles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={cmpStyles.header}>
        <Text style={cmpStyles.headerTitle}>⚖️ Compare Products</Text>
        <Text style={cmpStyles.headerSubtitle}>
          Pick 2 scanned products to compare side-by-side
        </Text>
      </View>

      {loading ? (
        <View style={cmpStyles.center}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
        </View>
      ) : history.length < 2 ? (
        <View style={cmpStyles.center}>
          <Text style={cmpStyles.emptyIcon}>📋</Text>
          <Text style={cmpStyles.emptyTitle}>Not enough scans yet</Text>
          <Text style={cmpStyles.emptyText}>
            Scan at least 2 products to use the comparison feature.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={cmpStyles.scroll}
          showsVerticalScrollIndicator={false}>

          {/* ── Product Selector Row ─────────────────────── */}
          <View style={cmpStyles.selectorRow}>
            {[1, 2].map(slot => {
              const prod = slot === 1 ? product1 : product2;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    cmpStyles.selectorCard,
                    selecting === slot && cmpStyles.selectorCardActive,
                  ]}
                  onPress={() => setSelecting(slot as 1 | 2)}
                  activeOpacity={0.75}>
                  {prod ? (
                    <>
                      {prod.product_image_url ? (
                        <Image
                          source={{uri: prod.product_image_url}}
                          style={cmpStyles.selectorImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={{fontSize: 32}}>📦</Text>
                      )}
                      <Text style={cmpStyles.selectorName} numberOfLines={2}>
                        {prod.product_name || 'Unknown Product'}
                      </Text>
                      <View
                        style={[
                          cmpStyles.scorePill,
                          {backgroundColor: RISK_COLOR[prod.risk_label] || '#9CA3AF'},
                        ]}>
                        <Text style={cmpStyles.scorePillText}>
                          {Math.round(prod.normalized_score)}/100 · {prod.risk_label}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={cmpStyles.addIcon}>＋</Text>
                      <Text style={cmpStyles.addLabel}>
                        {selecting === slot ? 'Choose below ↓' : `Select Product ${slot}`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Product Picker List ──────────────────────── */}
          {selecting !== null && (
            <View style={cmpStyles.pickerCard}>
              <Text style={cmpStyles.pickerTitle}>
                Choose Product {selecting} from your scan history:
              </Text>
              {history.map(scan => (
                <TouchableOpacity
                  key={scan.id}
                  style={cmpStyles.pickerItem}
                  onPress={() => selectProduct(scan)}
                  activeOpacity={0.7}>
                  {scan.product_image_url ? (
                    <Image
                      source={{uri: scan.product_image_url}}
                      style={cmpStyles.pickerImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={cmpStyles.pickerImagePlaceholder}>
                      <Text>📦</Text>
                    </View>
                  )}
                  <View style={cmpStyles.pickerInfo}>
                    <Text style={cmpStyles.pickerName} numberOfLines={1}>
                      {scan.product_name || 'Unknown Product'}
                    </Text>
                    <Text style={cmpStyles.pickerScore}>
                      Score: {Math.round(scan.normalized_score)}/100 · {scan.risk_label}
                    </Text>
                  </View>
                  <View
                    style={[
                      cmpStyles.miniDot,
                      {backgroundColor: RISK_COLOR[scan.risk_label] ?? '#9CA3AF'},
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Winner Banner ────────────────────────────── */}
          {winner && (
            <View
              style={[
                cmpStyles.winnerBanner,
                winner === 'tie' && {backgroundColor: '#F59E0B'},
              ]}>
              <Text style={cmpStyles.winnerText}>
                {winner === 'tie'
                  ? '🤝 Tie — Both products have the same risk score'
                  : `✅ Healthier Choice: ${winnerName}`}
              </Text>
            </View>
          )}

          {/* ── Score Comparison ─────────────────────────── */}
          {product1 && product2 && (
            <View style={cmpStyles.card}>
              <Text style={cmpStyles.cardTitle}>Health Risk Score</Text>

              {/* Score Bars */}
              <View style={cmpStyles.scoreBarsRow}>
                {[product1, product2].map((p, idx) => {
                  const score = Math.round(p.normalized_score);
                  const color = RISK_COLOR[p.risk_label] ?? '#9CA3AF';
                  const isWinner =
                    (idx === 0 && winner === 'product1') ||
                    (idx === 1 && winner === 'product2');
                  return (
                    <View key={idx} style={cmpStyles.scoreBarWrapper}>
                      <Text style={cmpStyles.scoreBarName} numberOfLines={2}>
                        {p.product_name}
                        {isWinner ? ' 🏆' : ''}
                      </Text>
                      <View style={cmpStyles.scoreBarTrack}>
                        <View
                          style={[
                            cmpStyles.scoreBarFill,
                            {width: `${score}%`, backgroundColor: color},
                          ]}
                        />
                      </View>
                      <Text style={[cmpStyles.scoreBarValue, {color}]}>
                        {score} / 100
                      </Text>
                      {p.has_allergen_warning && (
                        <Text style={cmpStyles.allergenTag}>🚨 Allergen Warning</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Nutrition Comparison ─────────────────────── */}
          {product1 && product2 && (
            <View style={cmpStyles.card}>
              <Text style={cmpStyles.cardTitle}>Nutritional Comparison</Text>
              <Text style={cmpStyles.cardSubtitle}>Per 100g · Green = better value</Text>

              {/* Column Headers */}
              <View style={cmpStyles.nutrientHeader}>
                <Text style={cmpStyles.nutrientHeaderName} numberOfLines={1}>
                  {product1.product_name}
                </Text>
                <Text style={cmpStyles.nutrientHeaderCenter} />
                <Text style={cmpStyles.nutrientHeaderName} numberOfLines={1}>
                  {product2.product_name}
                </Text>
              </View>

              <NutrientRow
                label="🔥 Calories"
                unit=" kcal"
                val1={product1.nutrition_data?.energy_kcal}
                val2={product2.nutrition_data?.energy_kcal}
              />
              <NutrientRow
                label="🍬 Sugars"
                unit="g"
                val1={product1.nutrition_data?.sugars}
                val2={product2.nutrition_data?.sugars}
              />
              <NutrientRow
                label="🧈 Fat"
                unit="g"
                val1={product1.nutrition_data?.fat}
                val2={product2.nutrition_data?.fat}
              />
              <NutrientRow
                label="🧂 Salt"
                unit="g"
                val1={product1.nutrition_data?.salt}
                val2={product2.nutrition_data?.salt}
              />
              <NutrientRow
                label="💪 Protein"
                unit="g"
                val1={product1.nutrition_data?.proteins}
                val2={product2.nutrition_data?.proteins}
                lowerIsBetter={false}
              />
              <NutrientRow
                label="🌾 Carbs"
                unit="g"
                val1={product1.nutrition_data?.carbohydrates}
                val2={product2.nutrition_data?.carbohydrates}
              />

              {/* Note for OCR scans / missing nutrition */}
              {(!product1.barcode || !product2.barcode) && (
                <Text style={cmpStyles.nutritionNote}>
                  📷 OCR scans don't have nutrition data — only barcode products do.
                </Text>
              )}
              {product1.barcode && product2.barcode &&
                !product1.nutrition_data?.energy_kcal &&
                !product2.nutrition_data?.energy_kcal && (
                <Text style={cmpStyles.nutritionNote}>
                  ℹ️ No nutrition data found for these products on Open Food Facts.
                </Text>
              )}
            </View>
          )}

          {!product1 || !product2 ? (
            <View style={cmpStyles.promptCard}>
              <Text style={cmpStyles.promptText}>
                👆 Tap a product slot above to choose from your scan history
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const cmpStyles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl},
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

  // Selector
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  selectorCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.divider,
    minHeight: 140,
    justifyContent: 'center',
    ...Shadow.sm,
  },
  selectorCardActive: {
    borderColor: Colors.primaryGreen,
    borderWidth: 2,
  },
  selectorImage: {width: 60, height: 60, borderRadius: BorderRadius.md},
  selectorName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.darkText,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  scorePill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: Spacing.xs,
  },
  scorePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  addIcon: {fontSize: 28, color: Colors.secondaryText},
  addLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // Picker
  pickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  pickerTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  pickerImage: {width: 40, height: 40, borderRadius: BorderRadius.md},
  pickerImagePlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: Colors.lightGreenBg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerInfo: {flex: 1, marginLeft: Spacing.sm},
  pickerName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.darkText,
  },
  pickerScore: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
  },
  miniDot: {width: 10, height: 10, borderRadius: 5},

  // Winner Banner
  winnerBanner: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    alignItems: 'center',
  },
  winnerText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: '#FFFFFF',
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

  // Score Bars
  scoreBarsRow: {gap: Spacing.md},
  scoreBarWrapper: {marginBottom: Spacing.sm},
  scoreBarName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.darkText,
    marginBottom: 4,
  },
  scoreBarTrack: {
    height: 10,
    backgroundColor: Colors.background,
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreBarFill: {height: 10, borderRadius: 5},
  scoreBarValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.small,
    marginTop: 4,
  },
  allergenTag: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: '#EF4444',
    marginTop: 2,
  },

  // Nutrition Table
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  nutrientHeaderName: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.primaryGreen,
    textAlign: 'center',
  },
  nutrientHeaderCenter: {flex: 1},
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  nutrientLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.darkText,
    textAlign: 'center',
  },
  nutrientVal: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.darkText,
    textAlign: 'center',
  },
  nutrientBetter: {color: '#10B981'},
  nutrientWorse: {color: '#EF4444'},

  // Prompt
  promptCard: {
    backgroundColor: Colors.lightGreenBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  promptText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },

  // Empty
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyTitle: {
    fontFamily: FontFamily.bold,
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
  nutritionNote: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});

export default ProductCompareScreen;
