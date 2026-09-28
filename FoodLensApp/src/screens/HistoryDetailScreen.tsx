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
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import apiClient from '../services/apiClient';
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
  const [showQrModal, setShowQrModal] = React.useState(false);
  const [exportingPdf, setExportingPdf] = React.useState(false);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const pdfUrl = `${apiClient.defaults.baseURL}/scoring/history/${scanDetail.id}/pdf/?token=${token || ''}`;
      const wifiPdfUrl = `http://192.168.1.36:8000/api/scoring/history/${scanDetail.id}/pdf/?token=${token || ''}`;

      Alert.alert(
        '📄 PDF Health Report',
        `Generated personalized health analysis for "${scanDetail.product_name || 'Product'}".`,
        [
          {
            text: '👁️ Open & View PDF',
            onPress: async () => {
              try {
                await Linking.openURL(pdfUrl);
              } catch {
                await Linking.openURL(wifiPdfUrl);
              }
            },
          },
          {
            text: '📤 Share PDF Link',
            onPress: async () => {
              await Share.share({
                title: `FoodLens Report — ${scanDetail.product_name || 'Product'}`,
                message: `📄 FoodLens Health Analysis Report for "${scanDetail.product_name || 'Product'}":\n${wifiPdfUrl}`,
              });
            },
          },
          {text: 'Cancel', style: 'cancel'},
        ],
      );
    } catch {
      Alert.alert('Error', 'Could not open PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

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

        {/* ── Share & Export ─────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.pdfBtn]}
            onPress={handleExportPdf}
            disabled={exportingPdf}>
            {exportingPdf ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>📄 Export PDF</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.qrBtn]}
            onPress={() => setShowQrModal(true)}>
            <Text style={styles.actionBtnText}>📱 QR Share</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code Sharing Modal */}
        <Modal
          visible={showQrModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQrModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.qrModalContent}>
              <Text style={styles.qrModalTitle}>📱 Scan & Share Result</Text>
              <Text style={styles.qrModalSubtitle}>
                Scan this QR code with any phone camera to view health details for {scanDetail.product_name || 'this product'}.
              </Text>

              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={JSON.stringify({
                    app: 'FoodLens',
                    product: scanDetail.product_name || 'Food Product',
                    score: score,
                    risk: scanDetail.risk_label || 'Unknown',
                    barcode: scanDetail.barcode || '',
                    allergens: scanDetail.has_allergen_warning ? scanDetail.allergen_details : [],
                  })}
                  size={200}
                  color={Colors.darkText}
                  backgroundColor="#FFFFFF"
                />
              </View>

              <View style={styles.qrSummaryCard}>
                <Text style={styles.qrProductName} numberOfLines={1}>
                  {scanDetail.product_name || 'Product'}
                </Text>
                <Text style={styles.qrScoreText}>
                  Score: {score}/100 • {scanDetail.risk_label} Risk
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeQrBtn}
                onPress={() => setShowQrModal(false)}>
                <Text style={styles.closeQrBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

  // Share & Export Actions
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  actionBtn: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  pdfBtn: {
    backgroundColor: Colors.primaryGreen,
  },
  qrBtn: {
    backgroundColor: '#3B82F6',
  },
  actionBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: '#FFFFFF',
  },

  // QR Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  qrModalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Shadow.lg,
  },
  qrModalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  qrModalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  qrCodeContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  qrSummaryCard: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  qrProductName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.darkText,
    marginBottom: 2,
  },
  qrScoreText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.primaryGreen,
  },
  closeQrBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    width: '100%',
  },
  closeQrBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.white,
  },
});

export default HistoryDetailScreen;
