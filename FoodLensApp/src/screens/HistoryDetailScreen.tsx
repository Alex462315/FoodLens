/**
 * HistoryDetailScreen — Full product detail view opened from Scan History.
 *
 * Re-displays a past scan's full result: score gauge, risk label, allergen
 * warning, ingredients breakdown, and nutrition facts — all from saved data.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import {RouteProp, useRoute} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {ScanHistoryItem} from '../services/scoringService';

type RouteParams = {
  HistoryDetail: {scanDetail: ScanHistoryItem};
};

const CATEGORY_EMOJI: Record<string, string> = {
  sweetener: '🍬', fat: '🧈', sodium_containing: '🧂',
  preservative: '🧪', refined_carb: '🍞', natural: '🌿',
  artificial_color: '🎨', flavor_enhancer: '👃', emulsifier: '🔬',
};

const HistoryDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'HistoryDetail'>>();
  const {scanDetail} = route.params;

  const score = Math.round(parseFloat(String(scanDetail.normalized_score)));
  const isHigh = scanDetail.risk_label === 'High';
  const isMod  = scanDetail.risk_label === 'Moderate';
  const scoreColor = isHigh ? '#EF4444' : isMod ? '#F59E0B' : '#10B981';

  const n = scanDetail.nutrition_data || {};

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Product Header ────────────────────────────── */}
        <View style={styles.headerCard}>
          {scanDetail.product_image_url ? (
            <Image source={{uri: scanDetail.product_image_url}} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}><Text style={styles.imagePlaceholderText}>📦</Text></View>
          )}
          <Text style={styles.productName}>{scanDetail.product_name || 'Unknown Product'}</Text>
          {scanDetail.barcode ? (
            <Text style={styles.barcode}>Barcode: {scanDetail.barcode}</Text>
          ) : null}
        </View>

        {/* ── Score ─────────────────────────────────────── */}
        <View style={styles.scoreCard}>
          <Text style={[styles.scoreNumber, {color: scoreColor}]}>{score}</Text>
          <Text style={styles.scoreLabel}>out of 100</Text>
          <View style={[styles.riskBadge, {backgroundColor: scoreColor + '22', borderColor: scoreColor}]}>
            <Text style={[styles.riskBadgeText, {color: scoreColor}]}>
              {isHigh ? '🔴' : isMod ? '🟡' : '🟢'} {scanDetail.risk_label} Risk
            </Text>
          </View>
        </View>

        {/* ── Allergen Warning ──────────────────────────── */}
        {scanDetail.has_allergen_warning && (
          <View style={styles.allergenBanner}>
            <Text style={styles.allergenIcon}>🚨</Text>
            <View style={{flex: 1}}>
              <Text style={styles.allergenTitle}>Allergen Warning</Text>
              <Text style={styles.allergenText}>
                Contains: {(scanDetail.allergen_details || []).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* ── Ingredients Breakdown ─────────────────────── */}
        {scanDetail.ingredient_breakdown && scanDetail.ingredient_breakdown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ingredients Breakdown</Text>
            {scanDetail.ingredient_breakdown.map((item, i) => {
              const matched = item.matched_name !== null;
              const emoji = matched ? (CATEGORY_EMOJI[item.category || ''] ?? '🔬') : '❓';
              const riskScore = item.adjusted_risk_score;
              const chipColor = matched
                ? (riskScore >= 7 ? '#FEF2F2' : riskScore >= 4 ? '#FFFBEB' : '#F0FDF4')
                : Colors.background;
              const borderColor = matched
                ? (riskScore >= 7 ? '#EF4444' : riskScore >= 4 ? '#F59E0B' : '#10B981')
                : Colors.border;
              return (
                <View key={i} style={[styles.chip, {backgroundColor: chipColor, borderColor}]}>
                  <Text style={styles.chipEmoji}>{emoji}</Text>
                  <View style={{flex: 1}}>
                    <Text style={styles.chipName}>{item.original_name}</Text>
                    {matched ? (
                      <Text style={styles.chipSub}>
                        {item.category?.replace(/_/g, ' ')} · Risk {riskScore.toFixed(1)}/10
                      </Text>
                    ) : (
                      <Text style={styles.chipNotFound}>Not in database</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Nutrition Facts ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔥 Nutrition Facts</Text>
          <Text style={styles.cardSubtitle}>Per 100g</Text>
          {[
            ['Calories', n.energy_kcal, 'kcal'],
            ['Protein',  n.proteins,    'g'],
            ['Carbohydrates', n.carbohydrates, 'g'],
            ['Sugars',   n.sugars,      'g'],
            ['Fat',      n.fat,         'g'],
            ['Salt',     n.salt,        'g'],
          ].map(([label, val, unit]) => (
            val != null ? (
              <View key={String(label)} style={styles.nutriRow}>
                <Text style={styles.nutriLabel}>{label as string}</Text>
                <Text style={styles.nutriVal}>{Number(val).toFixed(1)}{unit as string}</Text>
              </View>
            ) : null
          ))}
          {Object.keys(n).length === 0 && (
            <Text style={styles.noNutri}>Nutrition data not available for this product.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.base, paddingBottom: Spacing['3xl']},
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  productImage: {width: 120, height: 120, marginBottom: Spacing.sm},
  imagePlaceholder: {width: 80, height: 80, justifyContent: 'center', alignItems: 'center'},
  imagePlaceholderText: {fontSize: 48},
  productName: {fontFamily: FontFamily.bold, fontSize: FontSize.h2, color: Colors.darkText, textAlign: 'center'},
  barcode: {fontFamily: FontFamily.regular, fontSize: FontSize.small, color: Colors.secondaryText, marginTop: 2},
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  scoreNumber: {fontFamily: FontFamily.bold, fontSize: 64},
  scoreLabel: {fontFamily: FontFamily.regular, fontSize: FontSize.body, color: Colors.secondaryText},
  riskBadge: {
    marginTop: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  riskBadgeText: {fontFamily: FontFamily.bold, fontSize: FontSize.body},
  allergenBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  allergenIcon: {fontSize: 22},
  allergenTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.body, color: '#991B1B'},
  allergenText: {fontFamily: FontFamily.regular, fontSize: FontSize.small, color: '#991B1B'},
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  cardTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.h2, color: Colors.darkText, marginBottom: 4},
  cardSubtitle: {fontFamily: FontFamily.regular, fontSize: FontSize.small, color: Colors.secondaryText, marginBottom: Spacing.sm},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  chipEmoji: {fontSize: 18, marginRight: Spacing.sm},
  chipName: {fontFamily: FontFamily.semiBold, fontSize: FontSize.body, color: Colors.darkText},
  chipSub: {fontFamily: FontFamily.regular, fontSize: FontSize.small, color: Colors.secondaryText},
  chipNotFound: {fontFamily: FontFamily.regular, fontSize: FontSize.small, color: Colors.secondaryText, fontStyle: 'italic'},
  nutriRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  nutriLabel: {fontFamily: FontFamily.regular, fontSize: FontSize.body, color: Colors.darkText},
  nutriVal: {fontFamily: FontFamily.semiBold, fontSize: FontSize.body, color: Colors.primaryGreen},
  noNutri: {fontFamily: FontFamily.regular, fontSize: FontSize.body, color: Colors.secondaryText, textAlign: 'center', paddingVertical: Spacing.md},
});

export default HistoryDetailScreen;
