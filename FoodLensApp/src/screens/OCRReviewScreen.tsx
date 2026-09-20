/**
 * OCRReviewScreen — Confidence-aware review step (Section 3.2)
 *
 * Shown after camera/gallery capture. Calls the OCR backend endpoint,
 * displays the extracted text, shows confidence signal, and lets the
 * user proceed to scoring, retake, or continue despite low confidence.
 *
 * Per the prompt:
 *  - High confidence (≥65): proceed automatically with one "Looks good" tap
 *  - Low confidence (<65):  show warning, offer both "Retake" and "Continue Anyway"
 *  - User can optionally type a product label (stored locally, not sent for verification)
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {extractTextFromImage} from '../services/ocrService';
import {parseIngredients, computeScore} from '../services/scoringService';
import {getHealthProfiles, HealthProfile} from '../services/healthProfileService';

// Confidence threshold — above this is "good", below shows warning
const HIGH_CONFIDENCE_THRESHOLD = 65;

type RouteParams = {
  OCRReview: {imageUri: string};
};

type Stage =
  | 'extracting'    // calling OCR backend
  | 'review'        // showing extracted text + confidence
  | 'scoring'       // calling parse + compute
  | 'error';

const OCRReviewScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'OCRReview'>>();
  const navigation = useNavigation<any>();

  const {imageUri} = route.params;

  const [stage, setStage] = useState<Stage>('extracting');
  const [rawText, setRawText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [productLabel, setProductLabel] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  // Health profiles — fetched on mount, first profile used for scoring
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  // Fetch profiles on mount
  useEffect(() => {
    getHealthProfiles()
      .then(data => {
        setProfiles(data);
        if (data.length > 0) setSelectedProfileId(data[0].id);
      })
      .catch(() => {
        // Non-fatal: user will see the alert when they try to proceed
      });
  }, []);

  // ── Step 1: Call OCR endpoint on mount ───────────────────────────────────
  const runOCR = useCallback(async () => {
    setStage('extracting');
    setErrorMsg('');
    try {
      const result = await extractTextFromImage(imageUri);
      setRawText(result.raw_text || '');
      setConfidence(result.confidence);
      setWarning(result.warning || null);
      setStage('review');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Could not connect to server. Make sure the backend is running.';
      setErrorMsg(msg);
      setStage('error');
    }
  }, [imageUri]);

  useEffect(() => {
    runOCR();
  }, [runOCR]);

  // ── Step 2: Score the extracted text ─────────────────────────────────────
  const handleProceed = async () => {
    if (!rawText.trim()) {
      Alert.alert(
        'No Text',
        'No ingredient text was found in this image. Please retake with better lighting.',
      );
      return;
    }

    if (!selectedProfileId) {
      Alert.alert(
        'No Health Profile',
        'Please create a health profile in the Health tab before scanning.',
        [{text: 'OK'}],
      );
      return;
    }

    setStage('scoring');

    try {
      // Step A: Parse ingredients text
      const parsed = await parseIngredients(rawText);

      if (parsed.ingredients.length === 0) {
        Alert.alert(
          'No Ingredients Recognized',
          'The extracted text did not match any ingredients in our database. ' +
            'Try retaking the photo or editing the text above.',
        );
        setStage('review');
        return;
      }

      // Step B: Compute personalized score (same as barcode path)
      const ingredientInputs = parsed.ingredients.map(ing => ({
        ingredient_id: ing.matched_ingredient_id,
        position: ing.position,
        raw_token: ing.raw_token,
      }));

      const scoreResult = await computeScore(
        ingredientInputs,
        selectedProfileId,
        {
          // No barcode, no real product name — honest handling per prompt
          barcode: '',
          product_name: productLabel.trim() || 'Scanned Product (OCR)',
          product_image_url: '',   // skipped — OCR has no product image
        },
      );

      // Step C: Navigate to the existing ProductResultScreen via the ocrResult param
      navigation.replace('ProductResultScreen', {
        barcode: '',
        ocrResult: {
          ...scoreResult,
          product_name: productLabel.trim() || 'Scanned Product (OCR)',
          product_image_url: '',
          barcode: '',
          ocr_source: true,
        },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Scoring failed. Please try again.';
      Alert.alert('Scoring Error', msg);
      setStage('review');
    }
  };

  const handleRetake = () => {
    navigation.goBack();
  };

  // ── Confidence pill color ─────────────────────────────────────────────────
  const isHighConfidence = confidence >= HIGH_CONFIDENCE_THRESHOLD;
  const confColor = confidence >= 75
    ? '#10B981'
    : confidence >= 50
    ? '#F59E0B'
    : '#EF4444';

  // ── Render: Extracting ────────────────────────────────────────────────────
  if (stage === 'extracting') {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primaryGreen} />
        <Text style={styles.loadingTitle}>Reading Ingredient Label</Text>
        <Text style={styles.loadingSubtitle}>
          Preprocessing image and running OCR...
        </Text>
      </SafeAreaView>
    );
  }

  // ── Render: Scoring ───────────────────────────────────────────────────────
  if (stage === 'scoring') {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primaryGreen} />
        <Text style={styles.loadingTitle}>Analyzing Ingredients</Text>
        <Text style={styles.loadingSubtitle}>
          Matching ingredients and computing your personalized score...
        </Text>
      </SafeAreaView>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>OCR Failed</Text>
        <Text style={styles.errorMsg}>{errorMsg}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={runOCR}>
          <Text style={styles.primaryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake}>
          <Text style={styles.secondaryBtnText}>Retake Photo</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Render: Review ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Confidence Signal ──────────────────────────────────── */}
        <View style={styles.confidenceCard}>
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>OCR Confidence</Text>
            <View style={[styles.confPill, {backgroundColor: confColor + '22', borderColor: confColor}]}>
              <Text style={[styles.confPillText, {color: confColor}]}>
                {confidence}%
              </Text>
            </View>
          </View>

          {/* Confidence bar */}
          <View style={styles.confBarBg}>
            <View style={[styles.confBarFill, {width: `${confidence}%` as any, backgroundColor: confColor}]} />
          </View>

          {/* Low confidence warning */}
          {!isHighConfidence && (
            <View style={styles.lowConfBanner}>
              <Text style={styles.lowConfIcon}>📷</Text>
              <Text style={styles.lowConfText}>
                This photo was hard to read — you can retake it for better accuracy, or continue anyway.
              </Text>
            </View>
          )}

          {/* No-text warning */}
          {warning && (
            <View style={[styles.lowConfBanner, {backgroundColor: '#FEF2F2', borderLeftColor: '#EF4444'}]}>
              <Text style={styles.lowConfIcon}>⚠️</Text>
              <Text style={[styles.lowConfText, {color: '#991B1B'}]}>{warning}</Text>
            </View>
          )}
        </View>

        {/* ── Profile Selector ─────────────────────────────────────── */}
        {profiles.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 Scoring For</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.profileChipsRow}>
              {profiles.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.profileChip,
                    selectedProfileId === p.id && styles.profileChipActive,
                  ]}
                  onPress={() => setSelectedProfileId(p.id)}>
                  <Text
                    style={[
                      styles.profileChipText,
                      selectedProfileId === p.id && styles.profileChipTextActive,
                    ]}>
                    {p.profile_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {profiles.length === 0 && (
          <View style={[styles.card, {borderLeftWidth: 4, borderLeftColor: '#F59E0B'}]}>
            <Text style={[styles.cardTitle, {color: '#92400E'}]}>⚠️ No Health Profile</Text>
            <Text style={styles.cardSubtitle}>
              Go to the Health tab and create a profile to get a personalized risk score.
            </Text>
          </View>
        )}

        {/* ── Extracted Text ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Extracted Text</Text>
          <Text style={styles.cardSubtitle}>
            You can edit this if OCR made mistakes before scoring.
          </Text>
          <TextInput
            style={styles.textArea}
            value={rawText}
            onChangeText={setRawText}
            multiline
            placeholder="No text extracted. Try retaking the photo..."
            placeholderTextColor={Colors.lightText}
            textAlignVertical="top"
          />
        </View>

        {/* ── Optional Product Label ─────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏷️ Product Label (Optional)</Text>
          <Text style={styles.cardSubtitle}>
            Give this product a name for your scan history.
          </Text>
          <TextInput
            style={styles.labelInput}
            value={productLabel}
            onChangeText={setProductLabel}
            placeholder='e.g. "Nutella", "Local brand chips"'
            placeholderTextColor={Colors.lightText}
            maxLength={80}
          />
        </View>

        {/* ── Action Buttons ─────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.primaryBtn, !rawText.trim() && styles.disabledBtn]}
          onPress={handleProceed}
          disabled={!rawText.trim()}>
          <Text style={styles.primaryBtnText}>
            {isHighConfidence ? '✅ Looks Good — Analyse' : '⚡ Continue Anyway'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake}>
          <Text style={styles.secondaryBtnText}>🔄 Retake Photo</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  scroll: {padding: Spacing.base, paddingBottom: Spacing['3xl']},

  // Loading
  loadingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // Error
  errorIcon: {fontSize: 48, marginBottom: Spacing.md},
  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  errorMsg: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },

  // Confidence card
  confidenceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  confidenceLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  confPill: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  confPillText: {fontFamily: FontFamily.bold, fontSize: FontSize.body},
  confBarBg: {
    height: 8,
    backgroundColor: Colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  confBarFill: {height: '100%', borderRadius: 4},
  lowConfBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  lowConfIcon: {fontSize: 16},
  lowConfText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: '#92400E',
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
    marginBottom: Spacing.sm,
  },
  textArea: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minHeight: 120,
    lineHeight: 22,
  },
  labelInput: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    height: 48,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  disabledBtn: {opacity: 0.4},
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.white,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primaryGreen,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  secondaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },

  // Profile selector
  profileChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  profileChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  profileChipActive: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
  },
  profileChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  profileChipTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
  },
});

export default OCRReviewScreen;
