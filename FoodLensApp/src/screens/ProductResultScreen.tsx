/**
 * ProductResultScreen — Displays real product data + personalized health risk score.
 *
 * End-to-end flow:
 *   1. Show product info (image, name, brand, barcode) from Open Food Facts
 *   2. Fetch user's health profiles
 *   3. Parse ingredients_text → matched ingredients
 *   4. Compute personalized score against selected profile
 *   5. Display HealthRiskScoreGauge + RiskBadge + allergen warning banner
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Share,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import apiClient from '../services/apiClient';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {PrimaryButton, HealthRiskScoreGauge, RiskBadge} from '../components';
import {getRiskLevel} from '../components/RiskBadge';
import {
  ProductLookupResult,
  lookupProductByBarcode,
  ProductAlternative,
  getProductAlternatives,
} from '../services/productService';
import {
  HealthProfile,
  getHealthProfiles,
} from '../services/healthProfileService';
import {
  ComputeScoreResponse,
  scoreProduct,
} from '../services/scoringService';
import {
  generateExplanation,
  submitFeedback,
  ExplanationResponse,
} from '../services/explanationService';
import {
  speakText,
  stopSpeaking,
  buildProductHealthSummary,
} from '../services/speechService';
import {checkProductCalories, CalorieCheckResult} from '../services/calorieService';

// Shape of an OCR-sourced result passed from OCRReviewScreen
export interface OCRSourceResult extends ComputeScoreResponse {
  product_name: string;   // user's optional label or 'Scanned Product (OCR)'
  product_image_url: '';  // always empty for OCR
  barcode: '';            // always empty for OCR
  ocr_source: true;
}

const ProductResultScreen = ({navigation, route}: any) => {
  const {barcode, initialResult, ocrResult} = route.params as {
    barcode: string;
    initialResult?: ProductLookupResult;
    ocrResult?: OCRSourceResult;  // set by OCRReviewScreen instead of barcode
  };

  // ── OCR path: score is pre-computed, skip lookup entirely ─────────────────
  const isOcrSource = !!ocrResult;

  // Product state
  const [result, setResult] = useState<ProductLookupResult | null>(
    initialResult || null,
  );
  const [loading, setLoading] = useState(!initialResult && !isOcrSource);
  const [error, setError] = useState<string | null>(null);

  // Scoring state — pre-populated from OCR pipeline if ocrResult is given
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [scoreResult, setScoreResult] = useState<ComputeScoreResponse | null>(
    ocrResult ?? null,
  );
  const [scoringLoading, setScoringLoading] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);

  // AI Explanation state — inline on this screen
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'none' | 'helpful' | 'not_helpful'>('none');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Sharing & Export states
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrMode, setQrMode] = useState<'card' | 'web'>('card');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Healthier Alternatives state
  const [alternatives, setAlternatives] = useState<ProductAlternative[]>([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);

  // Text-to-Speech audio playback states
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);
  const [isSpeakingAi, setIsSpeakingAi] = useState(false);

  // Calorie check state — checks if product kcal fits in remaining daily intake
  const [calorieCheck, setCalorieCheck] = useState<CalorieCheckResult | null>(null);

  // Halt speech if navigating away
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Fetch calorie check when product nutrition data is available
  useEffect(() => {
    const productKcal = result?.nutrition?.energy_kcal;
    if (productKcal && productKcal > 0) {
      checkProductCalories(productKcal)
        .then(setCalorieCheck)
        .catch(() => {/* silent fail */});
    }
  }, [result?.nutrition?.energy_kcal]);

  const displayProductName = isOcrSource
    ? (ocrResult?.product_name || 'Scanned Label')
    : (result?.name || 'Product');

  const activeScore = isOcrSource ? ocrResult : scoreResult;

  const handleNativeShare = async () => {
    if (!activeScore) return;
    const riskEmoji =
      activeScore.risk_label === 'High' ? '🔴'
      : activeScore.risk_label === 'Moderate' ? '🟡' : '🟢';
    const scoreVal = Math.round(parseFloat(String(activeScore.normalized_score)));
    const allergenNote = activeScore.has_allergen_warning && activeScore.allergen_details?.length
      ? '\n🚨 Allergen Warning: ' + activeScore.allergen_details.join(', ')
      : '';
    await Share.share({
      title: `FoodLens — ${displayProductName} Health Score`,
      message:
        `${riskEmoji} FoodLens Health Score for "${displayProductName}"\n` +
        `Score: ${scoreVal}/100 — ${activeScore.risk_label} Risk${allergenNote}\n\n` +
        `Scanned with FoodLens — AI-Powered Ingredient Safety Checker`,
    });
  };

  const handleExportPdf = async () => {
    const scoredId = activeScore?.scored_result_id;
    if (!scoredId) {
      Alert.alert('Notice', 'Scored result is still processing. Please try again in a moment.');
      return;
    }
    setExportingPdf(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const pdfUrl = `${apiClient.defaults.baseURL}/scoring/history/${scoredId}/pdf/?token=${token || ''}`;
      const wifiPdfUrl = `http://10.10.158.126:8000/api/scoring/history/${scoredId}/pdf/?token=${token || ''}`;

      Alert.alert(
        '📄 PDF Health Report',
        `Generated personalized health analysis for "${displayProductName}".`,
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
                title: `FoodLens Report — ${displayProductName}`,
                message: `📄 FoodLens Health Analysis Report for "${displayProductName}":\n${wifiPdfUrl}`,
              });
            },
          },
          {text: 'Cancel', style: 'cancel'},
        ],
      );
    } catch {
      Alert.alert('PDF Export Error', 'Could not open PDF report. Please verify connection.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleToggleAudioSummary = async () => {
    if (isSpeakingSummary) {
      await stopSpeaking();
      setIsSpeakingSummary(false);
      return;
    }

    await stopSpeaking();
    setIsSpeakingAi(false);

    const currentProfile = profiles.find(p => p.id === selectedProfileId);
    const conditions = currentProfile?.conditions?.map(c => c.condition_name) || [];

    const script = buildProductHealthSummary({
      productName: displayProductName,
      brand: result?.brand,
      riskLabel: activeScore?.risk_label,
      score: activeScore?.normalized_score !== undefined
        ? parseFloat(String(activeScore.normalized_score))
        : undefined,
      hasAllergens: activeScore?.has_allergen_warning,
      allergenDetails: activeScore?.allergen_details,
      userConditions: conditions,
      aiExplanation: explanation?.explanation_text,
    });

    setIsSpeakingSummary(true);
    speakText(script, {
      onFinish: () => setIsSpeakingSummary(false),
      onError: () => setIsSpeakingSummary(false),
    });
  };

  const handleToggleAiSpeech = async () => {
    if (isSpeakingAi) {
      await stopSpeaking();
      setIsSpeakingAi(false);
      return;
    }
    if (!explanation?.explanation_text) return;

    await stopSpeaking();
    setIsSpeakingSummary(false);
    setIsSpeakingAi(true);

    speakText(explanation.explanation_text, {
      onFinish: () => setIsSpeakingAi(false),
      onError: () => setIsSpeakingAi(false),
    });
  };

  const renderShareSection = () => {
    if (!activeScore) return null;

    return (
      <View style={styles.shareSection}>
        <Text style={styles.shareSectionHeader}>SHARE & ACTIONS</Text>

        {/* Text-to-Speech Audio Report Button */}
        <TouchableOpacity
          style={[styles.shareButton, isSpeakingSummary && styles.speakingButtonActive]}
          onPress={handleToggleAudioSummary}
          activeOpacity={0.7}>
          <Text style={styles.shareIcon}>{isSpeakingSummary ? '⏹️' : '🔊'}</Text>
          <View style={styles.shareTextContainer}>
            <Text style={[styles.shareTitle, isSpeakingSummary && styles.speakingTitleActive]}>
              {isSpeakingSummary ? 'Playing Spoken Health Report...' : 'Listen to Audio Health Report'}
            </Text>
            <Text style={styles.shareSubtitle}>
              {isSpeakingSummary ? 'Tap to stop speech' : 'Hear risks, allergens & AI summary read aloud'}
            </Text>
          </View>
          <Text style={styles.shareArrow}>{isSpeakingSummary ? '■' : '›'}</Text>
        </TouchableOpacity>

        {/* Native Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleNativeShare}
          activeOpacity={0.7}>
          <Text style={styles.shareIcon}>📤</Text>
          <View style={styles.shareTextContainer}>
            <Text style={styles.shareTitle}>Share Score Summary</Text>
            <Text style={styles.shareSubtitle}>Send quick score to family or chat</Text>
          </View>
          <Text style={styles.shareArrow}>›</Text>
        </TouchableOpacity>

        {/* PDF Report Export Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleExportPdf}
          disabled={exportingPdf}
          activeOpacity={0.7}>
          <Text style={styles.shareIcon}>📄</Text>
          <View style={styles.shareTextContainer}>
            <Text style={styles.shareTitle}>Export PDF Health Report</Text>
            <Text style={styles.shareSubtitle}>Download comprehensive PDF with AI insights</Text>
          </View>
          {exportingPdf ? (
            <ActivityIndicator size="small" color={Colors.primaryGreen} />
          ) : (
            <Text style={styles.shareArrow}>›</Text>
          )}
        </TouchableOpacity>

        {/* QR Code Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => setShowQrModal(true)}
          activeOpacity={0.7}>
          <Text style={styles.shareIcon}>📱</Text>
          <View style={styles.shareTextContainer}>
            <Text style={styles.shareTitle}>Scan QR Code to Share</Text>
            <Text style={styles.shareSubtitle}>Display scannable QR code for nearby phones</Text>
          </View>
          <Text style={styles.shareArrow}>›</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderQrModal = () => {
    if (!activeScore) return null;
    const scoreVal = Math.round(parseFloat(String(activeScore.normalized_score || 0)));
    const riskEmoji =
      activeScore.risk_label === 'High' ? '🔴'
      : activeScore.risk_label === 'Moderate' ? '🟡' : '🟢';

    const allergenText = activeScore.has_allergen_warning && activeScore.allergen_details?.length
      ? `🚨 Allergen Alert: ${activeScore.allergen_details.join(', ')}`
      : '🚨 Allergen Alert: None Detected (Safe)';

    // Concise ingredient list (top 6)
    const ingSummary = (activeScore.ingredient_breakdown || [])
      .slice(0, 6)
      .map(i => `• ${i.matched_name || i.raw_token}${i.category ? ` (${i.category.replace('_', ' ')})` : ''}`)
      .join('\n');

    const cardContent =
`🥗 FOODLENS™ HEALTH REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Product: ${displayProductName}
🛡️ Health Score: ${scoreVal}/100
⚠️ Risk Level: ${activeScore.risk_label || 'Moderate'} Risk ${riskEmoji}
🏷️ Barcode: ${barcode || (isOcrSource ? 'OCR-LABEL' : result?.barcode || 'N/A')}
${allergenText}
${ingSummary ? `\n📋 Analyzed Ingredients:\n${ingSummary}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified by FoodLens AI Safety Engine`;

    const scoredId = activeScore.scored_result_id;
    const webReportUrl = scoredId
      ? `http://10.10.158.126:8000/api/scoring/report/${scoredId}/`
      : `${apiClient.defaults.baseURL}/scoring/report/${scoredId || ''}/`;

    const qrValue = qrMode === 'web' ? webReportUrl : cardContent;

    return (
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>📱 Scan & Share Result</Text>
            <Text style={styles.qrModalSubtitle}>
              {qrMode === 'card'
                ? 'Scan with any phone camera to view formatted health report card.'
                : 'Scan with any phone camera to open interactive web report in browser.'}
            </Text>

            {/* Mode Switch Tabs */}
            <View style={styles.qrTabContainer}>
              <TouchableOpacity
                style={[styles.qrTab, qrMode === 'card' && styles.qrTabActive]}
                onPress={() => setQrMode('card')}
                activeOpacity={0.8}>
                <Text style={[styles.qrTabText, qrMode === 'card' && styles.qrTabTextActive]}>
                  📋 Report Card
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qrTab, qrMode === 'web' && styles.qrTabActive]}
                onPress={() => setQrMode('web')}
                activeOpacity={0.8}>
                <Text style={[styles.qrTabText, qrMode === 'web' && styles.qrTabTextActive]}>
                  🌐 Web Page Link
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={qrValue}
                size={185}
                color={Colors.darkText}
                backgroundColor="#FFFFFF"
              />
            </View>

            <View style={styles.qrSummaryCard}>
              <Text style={styles.qrProductName} numberOfLines={1}>
                {displayProductName}
              </Text>
              <Text style={styles.qrScoreText}>
                Score: {scoreVal}/100 • {activeScore.risk_label} Risk
              </Text>
              <Text style={styles.qrFormatHintText}>
                {qrMode === 'card' ? '📄 Human-readable summary card' : '🔗 Opens in Chrome/Safari'}
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
    );
  };


  // Fetch product on mount (barcode path only)
  useEffect(() => {
    if (!initialResult && !isOcrSource && barcode) {
      fetchProduct();
    }
  }, [barcode, initialResult, isOcrSource]);

  // Fetch profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  // Set header title and quick share action button
  useEffect(() => {
    navigation.setOptions({
      title: isOcrSource ? 'Label Scan Result' : 'Product Details',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleNativeShare}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          style={{paddingHorizontal: 8}}
          accessibilityLabel="Share Result">
          <Text style={{fontSize: 20}}>📤</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isOcrSource, activeScore, displayProductName]);

  // Auto-score when product + profile are both ready (barcode path only)
  // Auto-fetch AI explanation when score is available
  useEffect(() => {
    const resultId = scoreResult?.scored_result_id;
    if (resultId && !explanation && !explanationLoading) {
      fetchExplanation(resultId);
    }
  }, [scoreResult?.scored_result_id]);

  const fetchExplanation = async (scoredResultId: number) => {
    setExplanationLoading(true);
    setExplanationError(null);
    try {
      const data = await generateExplanation(scoredResultId);
      setExplanation(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        "Couldn't generate explanation right now.";
      setExplanationError(message);
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (!explanation) return;
    const newState = isHelpful ? 'helpful' : 'not_helpful';
    if (
      (feedbackState === 'helpful' && isHelpful) ||
      (feedbackState === 'not_helpful' && !isHelpful)
    ) return;

    setFeedbackLoading(true);
    try {
      await submitFeedback(explanation.id, isHelpful);
      setFeedbackState(newState);
    } catch (err) {
      console.warn('Feedback submission failed:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Render inline AI explanation card
  const renderAIExplanation = () => {
    if (!scoreResult?.scored_result_id) return null;

    return (
      <View style={styles.aiCard}>
        <View style={styles.aiCardHeader}>
          <Text style={styles.aiCardIcon}>🤖</Text>
          <View style={{flex: 1}}>
            <Text style={styles.aiCardTitle}>AI Explanation</Text>
            <Text style={styles.aiCardSubtitle}>
              Why this score based on your health profile
            </Text>
          </View>
          {explanation && (
            <TouchableOpacity
              style={[styles.ttsHeaderButton, isSpeakingAi && styles.ttsHeaderButtonActive]}
              onPress={handleToggleAiSpeech}
              activeOpacity={0.7}
              accessibilityLabel="Listen to AI Explanation">
              <Text style={styles.ttsHeaderIcon}>{isSpeakingAi ? '⏹️' : '🔊'}</Text>
              <Text style={[styles.ttsHeaderText, isSpeakingAi && styles.ttsHeaderTextActive]}>
                {isSpeakingAi ? 'Stop' : 'Listen'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {explanationLoading ? (
          <View style={styles.aiLoadingContainer}>
            <ActivityIndicator size="small" color={Colors.primaryGreen} />
            <Text style={styles.aiLoadingText}>
              Generating personalized explanation...
            </Text>
          </View>
        ) : explanationError ? (
          <View style={styles.aiErrorContainer}>
            <Text style={styles.aiErrorText}>{explanationError}</Text>
            <TouchableOpacity
              onPress={() => fetchExplanation(scoreResult.scored_result_id)}
              style={styles.aiRetryButton}>
              <Text style={styles.aiRetryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : explanation ? (
          <>
            <View style={styles.aiChatBubble}>
              <Text style={styles.aiExplanationText}>
                {explanation.explanation_text}
              </Text>
              <Text style={styles.aiModelTag}>
                Powered by {explanation.llm_model_used}
              </Text>
            </View>

            {/* Inline feedback */}
            <View style={styles.aiFeedbackRow}>
              <Text style={styles.aiFeedbackLabel}>Helpful?</Text>
              <View style={styles.aiFeedbackButtons}>
                <TouchableOpacity
                  style={[
                    styles.aiFeedbackBtn,
                    feedbackState === 'helpful' && styles.aiFeedbackBtnActive,
                  ]}
                  onPress={() => handleFeedback(true)}
                  disabled={feedbackLoading}>
                  <Text style={styles.aiFeedbackBtnIcon}>👍</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.aiFeedbackBtn,
                    feedbackState === 'not_helpful' && styles.aiFeedbackBtnActiveNeg,
                  ]}
                  onPress={() => handleFeedback(false)}
                  disabled={feedbackLoading}>
                  <Text style={styles.aiFeedbackBtnIcon}>👎</Text>
                </TouchableOpacity>
              </View>
              {feedbackState !== 'none' && (
                <Text style={styles.aiFeedbackConfirm}>
                  {feedbackState === 'helpful' ? '✅ Thanks!' : '📝 Noted!'}
                </Text>
              )}
            </View>

            {/* Disclaimer */}
            <Text style={styles.aiDisclaimer}>
              ℹ️ Based on pre-computed scoring data. The AI does not make independent health claims.
            </Text>
          </>
        ) : null}
      </View>
    );
  };

  // Auto-fetch healthier alternatives when product or profile changes
  useEffect(() => {
    const prodName = isOcrSource ? ocrResult?.product_name : result?.name;
    if (prodName) {
      fetchAlternatives(prodName);
    }
  }, [result?.name, ocrResult?.product_name, selectedProfileId]);

  const fetchAlternatives = async (productName: string) => {
    setAlternativesLoading(true);
    try {
      const data = await getProductAlternatives({
        productName,
        categories: result?.categories || '',
        ingredientsText: isOcrSource ? '' : (result?.ingredients_text || ''),
        profileId: selectedProfileId,
      });
      setAlternatives(data.alternatives || []);
    } catch (err) {
      console.warn('Failed to fetch alternatives:', err);
    } finally {
      setAlternativesLoading(false);
    }
  };

  const handleCompareWithAlternative = (alt: ProductAlternative) => {
    const prodName = isOcrSource ? (ocrResult?.product_name || 'Scanned Item') : (result?.name || 'Scanned Item');
    const prodScore = isOcrSource
      ? parseFloat(String(ocrResult?.normalized_score || 50))
      : (scoreResult?.normalized_score ? parseFloat(String(scoreResult.normalized_score)) : 50);
    const prodRisk = isOcrSource ? (ocrResult?.risk_label || 'Moderate') : (scoreResult?.risk_label || 'Moderate');

    const prefillProduct1 = {
      id: scoreResult?.scored_result_id || 99991,
      product_name: prodName,
      product_image_url: result?.image_url || '',
      normalized_score: prodScore,
      risk_label: prodRisk,
      barcode: barcode || '',
      created_at: new Date().toISOString(),
      nutrition_data: (result?.nutrition || {}) as any,
      has_allergen_warning: !!scoreResult?.has_allergen_warning,
    };

    const prefillProduct2 = {
      id: 99992,
      product_name: alt.name,
      product_image_url: alt.image_url,
      normalized_score: alt.normalized_score,
      risk_label: alt.risk_label,
      barcode: '',
      created_at: new Date().toISOString(),
      nutrition_data: (alt.nutrition || {}) as any,
      has_allergen_warning: false,
    };

    navigation.navigate('ProductCompare', {
      prefillProduct1,
      prefillProduct2,
    });
  };

  const handleNavigateToCommunitySubmit = () => {
    let ingText = '';

    // Filter ONLY unrecognized ingredients (not in database)
    if (scoreResult?.ingredient_breakdown && scoreResult.ingredient_breakdown.length > 0) {
      const unrecognized = scoreResult.ingredient_breakdown
        .filter(i => i.matched_name === null)
        .map(i => i.raw_token)
        .filter(Boolean);

      if (unrecognized.length > 0) {
        ingText = unrecognized.join(', ');
      }
    }

    // Fallback if no breakdown is available
    if (!ingText && result?.ingredients_text) {
      ingText = result.ingredients_text.trim();
    }

    navigation.navigate('CommunitySubmit', {
      prefillBarcode: barcode || '',
      prefillProductName: result?.name || '',
      prefillBrand: result?.brand || '',
      prefillIngredients: ingText,
      prefillCalories: result?.nutrition?.energy_kcal ?? null,
      prefillFat: result?.nutrition?.fat ?? null,
      prefillSugar: result?.nutrition?.sugars ?? null,
      prefillSalt: result?.nutrition?.salt ?? null,
    });
  };

  const renderHealthierAlternatives = () => {
    if (!alternativesLoading && alternatives.length === 0) return null;

    return (
      <View style={styles.altsSection}>
        <View style={styles.altsSectionHeader}>
          <Text style={styles.altsIcon}>🌱</Text>
          <View style={{flex: 1}}>
            <Text style={styles.altsTitle}>Healthier Alternatives</Text>
            <Text style={styles.altsSubtitle}>
              Clean, lower-risk food swaps personalized for your profile
            </Text>
          </View>
        </View>

        {alternativesLoading ? (
          <View style={styles.altsLoadingContainer}>
            <ActivityIndicator size="small" color={Colors.primaryGreen} />
            <Text style={styles.altsLoadingText}>
              Curating safer swaps based on your health profile...
            </Text>
          </View>
        ) : (
          alternatives.map(alt => (
            <View key={alt.id} style={styles.altCard}>
              <View style={styles.altCardTopRow}>
                {alt.image_url ? (
                  <Image
                    source={{uri: alt.image_url}}
                    style={styles.altImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.altImagePlaceholder}>
                    <Text style={{fontSize: 24}}>🥗</Text>
                  </View>
                )}
                <View style={styles.altInfo}>
                  <Text style={styles.altCategory}>{alt.category.toUpperCase()}</Text>
                  <Text style={styles.altName} numberOfLines={2}>
                    {alt.name}
                  </Text>
                  <View style={styles.altScorePill}>
                    <Text style={styles.altScorePillText}>
                      🛡️ Score: {Math.round(alt.normalized_score)}/100 · {alt.risk_label} Risk
                    </Text>
                  </View>
                </View>
              </View>

              {/* Why it's better highlight */}
              <View style={styles.altWhyBetterBox}>
                <Text style={styles.altWhyBetterText}>
                  ✨ <Text style={{fontFamily: FontFamily.bold}}>Why it's better: </Text>
                  {alt.why_better}
                </Text>
              </View>

              {/* Quick Nutrition Badges */}
              <View style={styles.altNutrientRow}>
                {alt.nutrition.sugars != null && (
                  <View style={styles.altNutrientPill}>
                    <Text style={styles.altNutrientLabel}>Sugar</Text>
                    <Text style={styles.altNutrientVal}>{alt.nutrition.sugars}g</Text>
                  </View>
                )}
                {alt.nutrition.proteins != null && (
                  <View style={styles.altNutrientPill}>
                    <Text style={styles.altNutrientLabel}>Protein</Text>
                    <Text style={styles.altNutrientVal}>{alt.nutrition.proteins}g</Text>
                  </View>
                )}
                {alt.nutrition.energy_kcal != null && (
                  <View style={styles.altNutrientPill}>
                    <Text style={styles.altNutrientLabel}>Calories</Text>
                    <Text style={styles.altNutrientVal}>
                      {Math.round(alt.nutrition.energy_kcal)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Compare Head-to-Head Button */}
              <TouchableOpacity
                style={styles.altCompareBtn}
                onPress={() => handleCompareWithAlternative(alt)}
                activeOpacity={0.8}>
                <Text style={styles.altCompareBtnText}>⚖️ Compare Head-to-Head</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  useEffect(() => {
    if (!isOcrSource && result?.found && result.ingredients_text && selectedProfileId) {
      computeProductScore(result.ingredients_text, selectedProfileId);
    }
  }, [result, selectedProfileId, isOcrSource]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lookupProductByBarcode(barcode);
      setResult(data);
    } catch (err: any) {
      console.error('Failed to lookup product:', err);
      const msg =
        err.response?.data?.error ||
        'Could not lookup product. Please check your connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const data = await getHealthProfiles();
      setProfiles(data);
      // Auto-select first profile (usually "self")
      if (data.length > 0 && !selectedProfileId) {
        setSelectedProfileId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    }
  };

  const computeProductScore = async (ingredientsText: string, profileId: number) => {
    setScoringLoading(true);
    setScoringError(null);
    setScoreResult(null);
    try {
      const scoreData = await scoreProduct(ingredientsText, profileId, {
        barcode: barcode,
        product_name: result?.name || '',
        product_image_url: result?.image_url || '',
        nutrition: result?.nutrition
          ? (result.nutrition as unknown as Record<string, number | null>)
          : {},
      });
      setScoreResult(scoreData);
    } catch (err: any) {
      console.error('Scoring failed:', err);
      setScoringError(
        err.response?.data?.error || 'Could not compute health score.',
      );
    } finally {
      setScoringLoading(false);
    }
  };

  const handleProfileSelect = (profileId: number) => {
    setSelectedProfileId(profileId);
    // Score will auto-recompute via useEffect
  };

  const handleScanAgain = () => {
    navigation.navigate('ScanScreen');
  };

  // --- Loading State (barcode path only) ---
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
          <Text style={styles.loadingText}>
            Looking up barcode {barcode}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.centeredContainer}>
          <Text style={styles.iconEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Lookup Failed</Text>
          <Text style={styles.errorDescription}>{error}</Text>
          <PrimaryButton
            title="Try Again"
            onPress={fetchProduct}
            style={styles.actionButton}
          />
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={handleScanAgain}>
            <Text style={styles.secondaryLinkText}>Scan Different Barcode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── OCR source: bypass barcode lookup, show score directly ──────────────
  // MUST be checked BEFORE the !result / !result.found guard below
  if (isOcrSource && ocrResult) {
    const ocrScore = Math.round(parseFloat(ocrResult.normalized_score));
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* OCR header — no product image, just the label */}
          <View style={styles.ocrHeaderCard}>
            <Text style={styles.ocrBadge}>📷 Ingredient Label Scan</Text>
            <Text style={styles.productName}>
              {ocrResult.product_name || 'Scanned Product (OCR)'}
            </Text>
            <Text style={styles.ocrNoteText}>
              Product identity not verified — this name is your personal note only.
            </Text>
          </View>

          {/* Score — already computed by OCRReviewScreen */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreCardTitleRow}>
              <Text style={styles.scoreCardTitle}>Health Risk Score</Text>
              <TouchableOpacity
                style={[styles.ttsQuickButton, isSpeakingSummary && styles.ttsQuickButtonActive]}
                onPress={handleToggleAudioSummary}
                activeOpacity={0.7}
                accessibilityLabel="Listen to Health Report">
                <Text style={styles.ttsQuickIcon}>{isSpeakingSummary ? '⏹️' : '🔊'}</Text>
                <Text style={[styles.ttsQuickText, isSpeakingSummary && styles.ttsQuickTextActive]}>
                  {isSpeakingSummary ? 'Stop' : 'Listen'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gaugeContainer}>
              <HealthRiskScoreGauge
                score={ocrScore}
                size={160}
                strokeWidth={14}
                showLabel={true}
                overrideRiskLevel={
                  ocrResult.has_allergen_warning
                    ? 'high'
                    : undefined
                }
              />
            </View>

            <View style={styles.riskBadgeRow}>
              <RiskBadge
                level={
                  ocrResult.has_allergen_warning
                    ? 'high'
                    : (ocrResult.risk_label?.toLowerCase() as any) || 'low'
                }
              />
            </View>

            {/* Allergen warning */}
            {ocrResult.has_allergen_warning && (
              <View style={styles.allergenBanner}>
                <Text style={styles.allergenBannerIcon}>⚠️</Text>
                <Text style={styles.allergenBannerText}>
                  One or more ingredients may trigger your allergies.
                </Text>
              </View>
            )}
          </View>

          {/* AI Explanation — inline */}
          {renderAIExplanation()}

          {/* Healthier Alternatives */}
          {renderHealthierAlternatives()}

          {/* Ingredient breakdown */}
          {ocrResult.ingredient_breakdown?.length > 0 && (
            <View style={styles.ingredientCard}>
              <Text style={styles.ingredientCardTitle}>🔍 Ingredient Breakdown</Text>
              {ocrResult.ingredient_breakdown
                .filter(i => i.matched_name !== null)
                .map((item, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    <Text style={styles.ingredientName}>{item.matched_name}</Text>
                    <Text style={styles.ingredientImpact}>
                      {parseFloat(item.ingredient_impact ?? '0').toFixed(1)}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {/* Share & Export Options for Ingredient Label Scan */}
          {renderShareSection()}

          {/* QR Code Sharing Modal */}
          {renderQrModal()}

          <PrimaryButton
            title="Scan Another Product"
            onPress={handleScanAgain}
            style={styles.actionButton}
          />

          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => navigation.navigate('ScanScreen')}>
            <Text style={styles.secondaryLinkText}>Back to Scanner</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Not Found State ---
  if (!result || !result.found) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ScrollView contentContainerStyle={styles.centeredContainer}>
          <Text style={styles.iconEmoji}>📦</Text>
          <Text style={styles.notFoundTitle}>Product Not Found</Text>
          <Text style={styles.notFoundDescription}>
            We couldn't find a product matching barcode{' '}
            <Text style={styles.boldBarcode}>{barcode}</Text> in our database
            yet.
          </Text>

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerIcon}>💡</Text>
            <Text style={styles.infoBannerText}>
              FoodLens connects to Open Food Facts. Regional or new products
              might not be registered yet.
            </Text>
          </View>

          <View style={styles.communityPromptBanner}>
            <Text style={styles.communityPromptIcon}>🌍</Text>
            <View style={styles.communityPromptContent}>
              <Text style={styles.communityPromptTitle}>Know this product?</Text>
              <Text style={styles.communityPromptText}>
                Help the FoodLens community by submitting its ingredient details.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.communitySubmitButton}
            onPress={() => navigation.navigate('CommunitySubmit', {
              prefillBarcode: barcode || '',
            })}>
            <Text style={styles.communitySubmitButtonText}>📝 Submit to Community Database</Text>
          </TouchableOpacity>

          <PrimaryButton
            title="Scan Again"
            onPress={handleScanAgain}
            style={styles.actionButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Found State (barcode path) ---
  const normalizedScore = scoreResult
    ? Math.round(parseFloat(scoreResult.normalized_score))
    : null;
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageCard}>
          {result.image_url ? (
            <Image
              source={{uri: result.image_url}}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>🥫</Text>
            </View>
          )}
        </View>

        {/* Product Name & Brand */}
        <View style={styles.detailsCard}>
          <Text style={styles.brandName}>{result.brand || 'Unknown Brand'}</Text>
          <Text style={styles.productName}>{result.name}</Text>
          <Text style={styles.barcodeText}>Barcode: {result.barcode}</Text>

          {/* Badges if available */}
          {(result.nutriscore_grade || result.allergens) ? (
            <View style={styles.badgeRow}>
              {result.nutriscore_grade ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>
                    Nutri-Score: {result.nutriscore_grade.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ============================================================ */}
        {/* HEALTH RISK SCORE SECTION — The core feature of FoodLens     */}
        {/* ============================================================ */}

        {/* Profile Selector */}
        {profiles.length > 0 && (
          <View style={styles.profileSelector}>
            <Text style={styles.profileSelectorLabel}>Scoring for:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.profileChipsContainer}>
              {profiles.map(profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.profileChip,
                    selectedProfileId === profile.id && styles.profileChipActive,
                  ]}
                  onPress={() => handleProfileSelect(profile.id)}>
                  <Text
                    style={[
                      styles.profileChipText,
                      selectedProfileId === profile.id &&
                        styles.profileChipTextActive,
                    ]}>
                    {profile.profile_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Score Display */}
        {result.ingredients_text ? (
          <View style={styles.scoreCard}>
            {scoringLoading ? (
              <View style={styles.scoreLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.primaryGreen} />
                <Text style={styles.scoreLoadingText}>
                  Analyzing ingredients...
                </Text>
              </View>
            ) : scoringError ? (
              <View style={styles.scoreErrorContainer}>
                <Text style={styles.scoreErrorIcon}>⚠️</Text>
                <Text style={styles.scoreErrorText}>{scoringError}</Text>
                <TouchableOpacity
                  onPress={() =>
                    selectedProfileId &&
                    computeProductScore(
                      result.ingredients_text!,
                      selectedProfileId,
                    )
                  }>
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : scoreResult && normalizedScore !== null ? (
              <>
                {/* Gauge + Risk Badge */}
                <View style={styles.scoreCardTitleRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.scoreCardTitle}>
                      Health Risk Score
                    </Text>
                    {selectedProfile && (
                      <Text style={styles.scoringForText}>
                        Personalized for {selectedProfile.profile_name}
                        {selectedProfile.conditions.length > 0
                          ? ` (${selectedProfile.conditions
                              .map(c => c.condition_name)
                              .join(', ')})`
                          : ''}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.ttsQuickButton, isSpeakingSummary && styles.ttsQuickButtonActive]}
                    onPress={handleToggleAudioSummary}
                    activeOpacity={0.7}
                    accessibilityLabel="Listen to Health Report">
                    <Text style={styles.ttsQuickIcon}>{isSpeakingSummary ? '⏹️' : '🔊'}</Text>
                    <Text style={[styles.ttsQuickText, isSpeakingSummary && styles.ttsQuickTextActive]}>
                      {isSpeakingSummary ? 'Stop' : 'Listen'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.gaugeContainer}>
                  <HealthRiskScoreGauge
                    score={normalizedScore}
                    size={160}
                    strokeWidth={14}
                    showLabel={true}
                    overrideRiskLevel={
                      scoreResult.has_allergen_warning
                        ? 'high'
                        : scoreResult.ingredient_breakdown.length > 0 &&
                          scoreResult.ingredient_breakdown.filter(i => i.matched_name !== null).length === 0
                        ? 'unknown'
                        : undefined
                    }
                  />
                </View>

                <View style={styles.riskBadgeContainer}>
                  <RiskBadge
                    level={
                      scoreResult.has_allergen_warning
                        ? 'high'
                        : scoreResult.ingredient_breakdown.length > 0 &&
                          scoreResult.ingredient_breakdown.filter(i => i.matched_name !== null).length === 0
                        ? 'unknown'
                        : getRiskLevel(normalizedScore)
                    }
                  />
                </View>

                {/* Match stats */}
                <Text style={styles.matchStatsText}>
                  {scoreResult.ingredient_breakdown.filter(
                    i => i.matched_name !== null,
                  ).length}{' '}
                  of {scoreResult.ingredient_breakdown.length} ingredients
                  recognized
                </Text>
              </>
            ) : profiles.length === 0 ? (
              <View style={styles.noProfileContainer}>
                <Text style={styles.noProfileIcon}>👤</Text>
                <Text style={styles.noProfileTitle}>No Health Profile</Text>
                <Text style={styles.noProfileText}>
                  Create a health profile to get personalized risk scoring.
                </Text>
                <PrimaryButton
                  title="Create Profile"
                  onPress={() => navigation.navigate('Profile')}
                  style={styles.createProfileButton}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.noIngredientsCard}>
            <Text style={styles.noIngredientsIcon}>🔍</Text>
            <Text style={styles.noIngredientsTitle}>
              No Ingredients Data
            </Text>
            <Text style={styles.noIngredientsText}>
              This product doesn't have ingredient information in Open Food
              Facts. Scoring is not available.
            </Text>
          </View>
        )}

        {/* Allergen Warning Banner */}
        {scoreResult?.has_allergen_warning && (
          <View style={styles.allergenBanner}>
            <Text style={styles.allergenBannerIcon}>🚨</Text>
            <View style={styles.allergenBannerContent}>
              <Text style={styles.allergenBannerTitle}>
                Allergen Warning
              </Text>
              <Text style={styles.allergenBannerText}>
                This product contains ingredients that match your allergen
                profile:{' '}
                <Text style={styles.allergenNames}>
                  {scoreResult.allergen_details.join(', ')}
                </Text>
              </Text>
            </View>
          </View>
        )}

        {/* ── CALORIE CHECK BANNER ─────────────────────────────── */}
        {calorieCheck && (
          <View
            style={[
              styles.calorieBanner,
              calorieCheck.status === 'ok'
                ? styles.calorieBannerOk
                : calorieCheck.status === 'warning'
                ? styles.calorieBannerWarning
                : styles.calorieBannerExceeded,
            ]}>
            <Text style={styles.calorieBannerIcon}>
              {calorieCheck.status === 'ok' ? '✅' : calorieCheck.status === 'warning' ? '⚠️' : '🚫'}
            </Text>
            <View style={styles.calorieBannerContent}>
              <Text style={styles.calorieBannerTitle}>
                {calorieCheck.status === 'ok'
                  ? 'Within Daily Goal'
                  : calorieCheck.status === 'warning'
                  ? 'Near Daily Limit'
                  : 'Exceeds Daily Limit'}
              </Text>
              <Text style={styles.calorieBannerText}>{calorieCheck.message}</Text>
              <View style={styles.calorieStatsRow}>
                <Text style={styles.calorieStatItem}>
                  🔥 {calorieCheck.product_kcal} kcal this product
                </Text>
                <Text style={styles.calorieStatItem}>
                  🎯 {calorieCheck.remaining_kcal} kcal remaining
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Coverage / Unmatched Warning Banner */}
        {scoreResult &&
          scoreResult.ingredient_breakdown.length > 0 &&
          scoreResult.ingredient_breakdown.filter(i => i.matched_name !== null).length === 0 && (
            <View style={styles.coverageWarningBanner}>
              <Text style={styles.coverageWarningIcon}>⚠️</Text>
              <View style={styles.coverageWarningContent}>
                <Text style={styles.coverageWarningTitle}>
                  Unrecognized Ingredients
                </Text>
                <Text style={styles.coverageWarningText}>
                  The database text for this product ("{result.ingredients_text}") could not be matched to known food ingredients. Risk score cannot be calculated reliably.
                </Text>
                <TouchableOpacity
                  onPress={handleNavigateToCommunitySubmit}
                  style={styles.communityInlineLink}>
                  <Text style={styles.communityInlineLinkText}>
                    📝 Help improve our database — Submit correct ingredients
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* Ingredients Breakdown List */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Ingredients Breakdown</Text>

          {scoreResult && scoreResult.ingredient_breakdown.length > 0 ? (
            <>
              <View style={styles.ingredientChipsContainer}>
                {scoreResult.ingredient_breakdown.map((item, index) => {
                  const isMatched = item.matched_name !== null;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.ingredientChip,
                        isMatched ? styles.ingredientChipMatched : styles.ingredientChipUnmatched,
                      ]}>
                      <Text style={styles.ingredientChipIcon}>
                        {isMatched ? '✅' : '❓'}
                      </Text>
                      <View style={styles.ingredientChipContent}>
                        <Text style={styles.ingredientChipName}>
                          {isMatched ? item.matched_name : item.raw_token}
                        </Text>
                        <Text style={styles.ingredientChipSubtext}>
                          {isMatched
                            ? `${item.category || 'ingredient'} · Risk ${Math.round(parseFloat(item.adjusted_score))}/10`
                            : 'Not in database'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Community contribution link if any ingredient is unrecognized */}
              {scoreResult.ingredient_breakdown.some(i => i.matched_name === null) && (
                <TouchableOpacity
                  onPress={handleNavigateToCommunitySubmit}
                  style={[styles.communityInlineLink, {marginTop: 12}]}>
                  <Text style={styles.communityInlineLinkText}>
                    📝 Notice missing ingredients? Submit correction to Community
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : result.ingredients_text ? (
            <Text style={styles.ingredientsText}>
              {result.ingredients_text}
            </Text>
          ) : (
            <Text style={styles.emptyIngredientsText}>
              No ingredient list available for this product in Open Food Facts.
            </Text>
          )}
        </View>

        {/* Nutrition Facts Card */}
        {result.nutrition && result.nutrition.energy_kcal != null && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>🔥 Nutrition Facts</Text>
            <Text style={styles.nutritionSubtitle}>Per 100g{result.serving_size ? ` · Serving: ${result.serving_size}` : ''}</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(result.nutrition.energy_kcal)}
                </Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              {result.nutrition.proteins != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.proteins).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
              )}
              {result.nutrition.carbohydrates != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.carbohydrates).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
              )}
              {result.nutrition.fat != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.fat).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              )}
              {result.nutrition.sugars != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.sugars).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Sugars</Text>
                </View>
              )}
              {result.nutrition.fiber != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.fiber).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fiber</Text>
                </View>
              )}
              {result.nutrition.salt != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.salt).toFixed(2)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Salt</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* AI Explanation — inline */}
        {scoreResult && renderAIExplanation()}

        {/* Healthier Alternatives */}
        {renderHealthierAlternatives()}

        {/* Share & Export Options */}
        {renderShareSection()}

        {/* QR Code Sharing Modal */}
        {renderQrModal()}

        {/* Action Button */}
        <PrimaryButton
          title="Scan Another Product"
          onPress={handleScanAgain}
          style={styles.actionButton}
        />

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
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },

  // Centered screens (loading / error / not found)
  centeredContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  iconEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  notFoundTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  notFoundDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  boldBarcode: {
    fontFamily: FontFamily.semiBold,
    color: Colors.darkText,
  },
  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.redDark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGreenBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: 'flex-start',
  },
  infoBannerIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
    lineHeight: 18,
  },

  // Product Image Card
  imageCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 64,
  },

  // Product Details Card
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  brandName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  barcodeText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.lightText,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.lightGreenBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  badgeLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
  },

  // ==========================================
  // Profile Selector
  // ==========================================
  profileSelector: {
    marginBottom: Spacing.md,
  },
  profileSelectorLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    marginBottom: Spacing.xs,
  },
  profileChipsContainer: {
    paddingVertical: Spacing.xs,
  },
  profileChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  profileChipActive: {
    borderColor: Colors.primaryGreen,
    backgroundColor: Colors.lightGreenBg,
  },
  profileChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  profileChipTextActive: {
    color: Colors.primaryGreen,
  },

  // ==========================================
  // Score Card
  // ==========================================
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  scoreCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: 4,
  },
  scoringForText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  gaugeContainer: {
    marginVertical: Spacing.md,
  },
  riskBadgeContainer: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  matchStatsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    textAlign: 'center',
  },

  // Score Loading
  scoreLoadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  scoreLoadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: Spacing.md,
  },

  // Score Error
  scoreErrorContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  scoreErrorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  scoreErrorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.redDark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  retryText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },

  // No Profile
  noProfileContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  noProfileIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  noProfileTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  noProfileText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  createProfileButton: {
    width: '80%',
  },

  // No Ingredients
  noIngredientsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  noIngredientsIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  noIngredientsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  noIngredientsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ==========================================
  // Allergen Warning Banner
  // ==========================================
  allergenBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.redBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.red,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  allergenBannerIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  allergenBannerContent: {
    flex: 1,
  },
  allergenBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.subtitle,
    color: Colors.redDark,
    marginBottom: 4,
  },
  allergenBannerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.redDark,
    lineHeight: 20,
  },
  allergenNames: {
    fontFamily: FontFamily.bold,
    color: Colors.redDark,
  },

  // ==========================================
  // Calorie Check Banner
  // ==========================================
  calorieBanner: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  calorieBannerOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  calorieBannerWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  calorieBannerExceeded: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  calorieBannerIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  calorieBannerContent: {flex: 1},
  calorieBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.subtitle,
    color: Colors.darkText,
    marginBottom: 4,
  },
  calorieBannerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    lineHeight: 20,
    marginBottom: 6,
  },
  calorieStatsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  calorieStatItem: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.darkText,
  },

  // Section Headers
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  ingredientsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    lineHeight: 22,
  },
  emptyIngredientsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    fontStyle: 'italic',
  },

  // Action Button & Links
  actionButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
  },

  // AI Explanation Inline Card
  aiCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGreen,
    ...Shadow.sm,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  aiCardIcon: {
    fontSize: 28,
  },
  aiCardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },
  aiCardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  aiLoadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    flex: 1,
  },
  aiErrorContainer: {
    paddingVertical: Spacing.sm,
  },
  aiErrorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.redDark,
    marginBottom: Spacing.xs,
  },
  aiRetryButton: {
    paddingVertical: Spacing.xs,
  },
  aiRetryText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
  },
  aiChatBubble: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  aiExplanationText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    lineHeight: 23,
    letterSpacing: 0.15,
  },
  aiModelTag: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  aiFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  aiFeedbackLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
  },
  aiFeedbackButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  aiFeedbackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  aiFeedbackBtnActive: {
    borderColor: Colors.primaryGreen,
    backgroundColor: Colors.lightGreenBg,
  },
  aiFeedbackBtnActiveNeg: {
    borderColor: Colors.amberDark,
    backgroundColor: Colors.amberBg,
  },
  aiFeedbackBtnIcon: {
    fontSize: 16,
  },
  aiFeedbackConfirm: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.primaryGreen,
  },
  aiDisclaimer: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    marginTop: Spacing.sm,
    lineHeight: 16,
  },

  secondaryLink: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
  },
  secondaryLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },

  // Nutrition Facts
  nutritionSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    marginBottom: Spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  nutritionItem: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 80,
  },
  nutritionValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.primaryGreen,
  },
  nutritionLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },

  // Coverage Warning Banner
  coverageWarningBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.amberBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.amberDark,
  },
  coverageWarningIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  coverageWarningContent: {
    flex: 1,
  },
  coverageWarningTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.amberDark,
    marginBottom: 2,
  },
  coverageWarningText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.darkText,
    lineHeight: 18,
  },

  // Community Database Prompt (Not Found + Unrecognized)
  communityPromptBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  communityPromptIcon: {
    fontSize: 22,
    marginRight: Spacing.sm,
  },
  communityPromptContent: {
    flex: 1,
  },
  communityPromptTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: '#F57C00',
    marginBottom: 4,
  },
  communityPromptText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: '#795548',
    lineHeight: 18,
  },
  communitySubmitButton: {
    backgroundColor: '#FF9800',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  communitySubmitButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: '#FFFFFF',
  },
  communityInlineLink: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  communityInlineLinkText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: '#1976D2',
    textDecorationLine: 'underline',
  },
  // Ingredient Chips Breakdown
  ingredientChipsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  ingredientChipMatched: {
    backgroundColor: Colors.lightGreenBg,
    borderColor: Colors.lightGreen,
  },
  ingredientChipUnmatched: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  ingredientChipIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  ingredientChipContent: {
    flex: 1,
  },
  ingredientChipName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  ingredientChipSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 1,
  },

  // Share Button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    ...Shadow.sm,
  },
  shareIcon: {fontSize: 24, marginRight: Spacing.md},
  shareTextContainer: {flex: 1},
  shareTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  shareSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  shareArrow: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.lightText,
  },
  shareSection: {
    marginBottom: Spacing.md,
  },
  shareSectionHeader: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },

  // QR Modal Styles
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
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  qrTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    padding: 3,
    marginBottom: Spacing.md,
    width: '100%',
  },
  qrTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  qrTabActive: {
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  qrTabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  qrTabTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.primaryGreen,
  },
  qrFormatHintText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption - 1,
    color: Colors.lightText,
    marginTop: 2,
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

  // ── OCR Result specific ─────────────────────────────────────────────────────
  ocrHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGreen,
    ...Shadow.sm,
  },
  ocrBadge: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ocrNoteText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  riskBadgeRow: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  ingredientCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  ingredientCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  ingredientName: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    flex: 1,
  },
  ingredientImpact: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },

  // ── Healthier Alternatives Section ──────────────────────────────────────────
  altsSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  altsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  altsIcon: {
    fontSize: 26,
    marginRight: Spacing.sm,
  },
  altsTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
  },
  altsSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  altsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  altsLoadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    flex: 1,
  },
  altCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  altCardTopRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  altImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.divider,
  },
  altImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  altInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  altCategory: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.primaryGreen,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  altName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
    lineHeight: 18,
  },
  altScorePill: {
    backgroundColor: '#E6F4EA',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  altScorePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.primaryGreen,
  },
  altWhyBetterBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryGreen,
    borderRadius: 6,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  altWhyBetterText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: '#166534',
    lineHeight: 16,
  },
  altNutrientRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  altNutrientPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  altNutrientLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
  },
  altNutrientVal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.small,
    color: Colors.darkText,
    marginTop: 1,
  },
  altCompareBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altCompareBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.white,
  },
  scoreCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ttsQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  ttsQuickButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  ttsQuickIcon: {
    fontSize: 14,
  },
  ttsQuickText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
  },
  ttsQuickTextActive: {
    color: Colors.riskHigh.text,
  },
  ttsHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  ttsHeaderButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  ttsHeaderIcon: {
    fontSize: 13,
  },
  ttsHeaderText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: '#059669',
  },
  ttsHeaderTextActive: {
    color: Colors.riskHigh.text,
  },
  speakingButtonActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  speakingTitleActive: {
    color: '#B91C1C',
  },
});

export default ProductResultScreen;
