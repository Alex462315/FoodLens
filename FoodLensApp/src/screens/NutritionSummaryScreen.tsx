/**
 * NutritionSummaryScreen — Enhanced Daily Calorie Tracker
 *
 * Features:
 *  1. Set a personal daily calorie goal
 *  2. Snap a food photo → Gemini Vision auto-detects nutritional info
 *  3. Log food manually (name + calories + macros)
 *  4. Real-time tracker: consumed vs remaining vs goal
 *  5. Combines manual entries + scanned products into one daily total
 *  6. Visual circular progress ring + nutrient bars
 */

import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  Image,
  Animated,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {launchCamera} from 'react-native-image-picker';
import {useTheme} from '../theme';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {
  getDailyCalorieSummary,
  getCalorieGoal,
  setCalorieGoal,
  logFoodEntry,
  deleteFoodEntry,
  analyzeFoodPhoto,
  DailyCalorieSummary,
} from '../services/calorieService';

// ─── Circular Progress Component ─────────────────────────────────────────────

const CircularProgress: React.FC<{
  consumed: number;
  goal: number;
  remaining: number;
  exceeded: boolean;
}> = ({consumed, goal, remaining, exceeded}) => {
  const pct = Math.min((consumed / (goal || 1)) * 100, 100);
  const barColor = exceeded ? '#EF4444' : pct > 75 ? '#F59E0B' : '#22C55E';

  return (
    <View style={cpStyles.container}>
      <View style={cpStyles.ring}>
        <View
          style={[
            cpStyles.fill,
            {
              borderColor: barColor,
              borderTopColor: 'transparent',
              transform: [{rotate: `${(pct / 100) * 360}deg`}],
            },
          ]}
        />
        <View style={cpStyles.inner}>
          <Text style={[cpStyles.consumed, {color: barColor}]}>
            {Math.round(consumed)}
          </Text>
          <Text style={cpStyles.unit}>kcal</Text>
          <Text style={cpStyles.label}>consumed</Text>
        </View>
      </View>
      <View style={cpStyles.stats}>
        <View style={cpStyles.stat}>
          <Text style={cpStyles.statVal}>{Math.round(goal)}</Text>
          <Text style={cpStyles.statLabel}>🎯 Goal</Text>
        </View>
        <View style={cpStyles.divider} />
        <View style={cpStyles.stat}>
          <Text style={[cpStyles.statVal, {color: exceeded ? '#EF4444' : '#22C55E'}]}>
            {exceeded ? '0' : Math.round(remaining)}
          </Text>
          <Text style={cpStyles.statLabel}>{exceeded ? '⚠️ Over' : '✅ Left'}</Text>
        </View>
      </View>
    </View>
  );
};

const cpStyles = StyleSheet.create({
  container: {alignItems: 'center', paddingVertical: Spacing.base},
  ring: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 14,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  fill: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 14,
  },
  inner: {alignItems: 'center'},
  consumed: {fontFamily: FontFamily.bold, fontSize: 32, color: '#FFF'},
  unit: {fontFamily: FontFamily.medium, fontSize: 12, color: 'rgba(255,255,255,0.8)'},
  label: {fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)'},
  stats: {flexDirection: 'row', alignItems: 'center', gap: Spacing.xl},
  stat: {alignItems: 'center'},
  statVal: {fontFamily: FontFamily.bold, fontSize: FontSize.h2, color: '#FFF'},
  statLabel: {fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.8)'},
  divider: {width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)'},
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

const NutritionSummaryScreen: React.FC = () => {
  const {colors} = useTheme();

  // Data states
  const [summary, setSummary] = useState<DailyCalorieSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalKcal, setGoalKcal] = useState(2000);

  // Modal states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Goal modal
  const [goalInput, setGoalInput] = useState('');
  const [goalSaving, setGoalSaving] = useState(false);

  // Manual entry modal
  const [manualName, setManualName] = useState('');
  const [manualKcal, setManualKcal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualServing, setManualServing] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  // Photo analysis modal
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<any | null>(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoLogging, setPhotoLogging] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, goal] = await Promise.all([
        getDailyCalorieSummary(),
        getCalorieGoal(),
      ]);
      setSummary(sum);
      setGoalKcal(goal.daily_goal_kcal);
    } catch {
      // keep existing data on refresh errors
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // ── Goal Save ──────────────────────────────────────────────────────────────
  const handleSaveGoal = async () => {
    const val = parseInt(goalInput, 10);
    if (isNaN(val) || val < 500 || val > 10000) {
      Alert.alert('Invalid Goal', 'Please enter a value between 500 and 10,000 kcal.');
      return;
    }
    setGoalSaving(true);
    try {
      await setCalorieGoal(val);
      setGoalKcal(val);
      setShowGoalModal(false);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    } finally {
      setGoalSaving(false);
    }
  };

  // ── Manual Log Save ────────────────────────────────────────────────────────
  const handleLogManual = async () => {
    if (!manualName.trim()) {
      Alert.alert('Missing Info', 'Please enter a food name.');
      return;
    }
    const kcal = parseFloat(manualKcal);
    if (isNaN(kcal) || kcal < 0) {
      Alert.alert('Invalid Calories', 'Please enter a valid calorie value.');
      return;
    }
    setManualSaving(true);
    try {
      await logFoodEntry({
        food_name: manualName.trim(),
        calories_kcal: kcal,
        protein_g: parseFloat(manualProtein) || 0,
        fat_g: parseFloat(manualFat) || 0,
        carbs_g: parseFloat(manualCarbs) || 0,
        serving_description: manualServing.trim(),
        source: 'manual',
      });
      setManualName('');
      setManualKcal('');
      setManualProtein('');
      setManualFat('');
      setManualCarbs('');
      setManualServing('');
      setShowManualModal(false);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to log food entry.');
    } finally {
      setManualSaving(false);
    }
  };

  // ── Delete entry ───────────────────────────────────────────────────────────
  const handleDeleteEntry = (id: number, name: string) => {
    Alert.alert(
      'Delete Entry',
      `Remove "${name}" from today's log?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFoodEntry(id);
              fetchData();
            } catch {
              Alert.alert('Error', 'Could not delete entry.');
            }
          },
        },
      ],
    );
  };

  // ── Photo Capture + Analysis ───────────────────────────────────────────────
  const handleCapturePhoto = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.6,        // Reduce size for faster upload
        maxWidth: 800,
        maxHeight: 800,
        includeBase64: true,  // image-picker provides base64 directly — no RNFS needed
      },
      async response => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.uri) return;

        // image-picker already gives us base64 when includeBase64:true
        const base64 = asset.base64;
        if (!base64) {
          Alert.alert('Error', 'Could not read image data. Please try again.');
          return;
        }

        setPhotoUri(asset.uri);
        setPhotoAnalysis(null);
        setShowPhotoModal(true);
        setPhotoAnalyzing(true);

        try {
          const mime = asset.type || 'image/jpeg';
          const result = await analyzeFoodPhoto(base64, mime);
          if ((result as any).error) {
            Alert.alert('Analysis Failed', (result as any).error);
            setShowPhotoModal(false);
          } else {
            setPhotoAnalysis(result);
          }
        } catch (err: any) {
          const msg = err?.response?.data?.error || err?.message || 'Unknown error';
          Alert.alert('Could not analyze photo', msg);
          setShowPhotoModal(false);
        } finally {
          setPhotoAnalyzing(false);
        }
      },
    );
  };

  // Log analyzed photo result as a food entry
  const handleLogPhotoResult = async () => {
    if (!photoAnalysis) return;
    setPhotoLogging(true);
    try {
      await logFoodEntry({
        food_name: photoAnalysis.food_name,
        calories_kcal: photoAnalysis.calories_kcal,
        protein_g: photoAnalysis.protein_g || 0,
        fat_g: photoAnalysis.fat_g || 0,
        carbs_g: photoAnalysis.carbs_g || 0,
        serving_description: photoAnalysis.serving_description || '',
        source: 'photo',
      });
      setShowPhotoModal(false);
      setPhotoUri(null);
      setPhotoAnalysis(null);
      fetchData();
      Alert.alert('✅ Logged!', `"${photoAnalysis.food_name}" added to today's intake.`);
    } catch {
      Alert.alert('Error', 'Could not log food entry.');
    } finally {
      setPhotoLogging(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const exceeded = summary ? summary.exceeded : false;
  const pctUsed = summary ? summary.pct_used : 0;
  const headerBg = exceeded ? '#EF4444' : pctUsed > 75 ? '#F59E0B' : '#22C55E';

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={headerBg}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HERO HEADER CARD ─────────────────────────────────────── */}
        <View style={[styles.heroCard, {backgroundColor: headerBg}]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroTitle}>🔥 Daily Calories</Text>
              <Text style={styles.heroDate}>{today}</Text>
            </View>
            <TouchableOpacity
              style={styles.goalBtn}
              onPress={() => {
                setGoalInput(String(goalKcal));
                setShowGoalModal(true);
              }}>
              <Text style={styles.goalBtnText}>🎯 Set Goal</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#fff" size="large" style={{marginVertical: 32}} />
          ) : (
            <CircularProgress
              consumed={summary?.total_consumed_kcal || 0}
              goal={summary?.goal_kcal || goalKcal}
              remaining={summary?.remaining_kcal || goalKcal}
              exceeded={exceeded}
            />
          )}

          {/* Source breakdown pills */}
          {summary && (
            <View style={styles.sourcePills}>
              <View style={styles.sourcePill}>
                <Text style={styles.sourcePillIcon}>✏️</Text>
                <Text style={styles.sourcePillLabel}>Manual</Text>
                <Text style={styles.sourcePillVal}>{Math.round(summary.manual_kcal)} kcal</Text>
              </View>
              <View style={styles.sourcePill}>
                <Text style={styles.sourcePillIcon}>📦</Text>
                <Text style={styles.sourcePillLabel}>Scanned</Text>
                <Text style={styles.sourcePillVal}>{Math.round(summary.scanned_kcal)} kcal</Text>
              </View>
            </View>
          )}

          {/* Exceeded banner */}
          {exceeded && (
            <View style={styles.exceededBanner}>
              <Text style={styles.exceededText}>
                ⚠️ You've exceeded your daily calorie goal by{' '}
                {Math.round((summary?.total_consumed_kcal || 0) - (summary?.goal_kcal || goalKcal))} kcal
              </Text>
            </View>
          )}
        </View>

        {/* ── QUICK ADD BUTTONS ─────────────────────────────────────── */}
        <View style={styles.quickAddRow}>
          <TouchableOpacity
            style={[styles.quickAddBtn, {backgroundColor: colors.surface, borderColor: '#22C55E'}]}
            onPress={handleCapturePhoto}>
            <Text style={styles.quickAddIcon}>📷</Text>
            <Text style={[styles.quickAddLabel, {color: colors.darkText}]}>Snap Food</Text>
            <Text style={[styles.quickAddSub, {color: colors.secondaryText}]}>AI detects calories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAddBtn, {backgroundColor: colors.surface, borderColor: '#3B82F6'}]}
            onPress={() => setShowManualModal(true)}>
            <Text style={styles.quickAddIcon}>✏️</Text>
            <Text style={[styles.quickAddLabel, {color: colors.darkText}]}>Manual Entry</Text>
            <Text style={[styles.quickAddSub, {color: colors.secondaryText}]}>Type food & kcal</Text>
          </TouchableOpacity>
        </View>

        {/* ── PROGRESS BAR ─────────────────────────────────────────── */}
        {summary && (
          <View style={[styles.card, {backgroundColor: colors.surface}]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.cardTitle, {color: colors.darkText}]}>Today's Progress</Text>
              <Text style={[styles.progressPct, {color: exceeded ? '#EF4444' : '#22C55E'}]}>
                {pctUsed}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(pctUsed, 100)}%`,
                    backgroundColor: exceeded ? '#EF4444' : pctUsed > 75 ? '#F59E0B' : '#22C55E',
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressCaption, {color: colors.secondaryText}]}>
              {Math.round(summary.total_consumed_kcal)} of {summary.goal_kcal} kcal consumed
              {!exceeded ? ` · ${Math.round(summary.remaining_kcal)} kcal remaining` : ''}
            </Text>
          </View>
        )}

        {/* ── TODAY'S FOOD LOG ─────────────────────────────────────── */}
        <View style={[styles.card, {backgroundColor: colors.surface}]}>
          <View style={styles.logHeader}>
            <Text style={[styles.cardTitle, {color: colors.darkText}]}>Today's Food Log</Text>
            <TouchableOpacity onPress={() => setShowManualModal(true)}>
              <Text style={styles.addMoreText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {!summary || summary.manual_entries.length === 0 ? (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyLogIcon}>🍽️</Text>
              <Text style={[styles.emptyLogText, {color: colors.secondaryText}]}>
                No manual entries yet. Snap a photo or type in what you ate.
              </Text>
            </View>
          ) : (
            summary.manual_entries.map(entry => (
              <View key={entry.id} style={[styles.entryRow, {borderBottomColor: colors.divider}]}>
                <View style={styles.entryIcon}>
                  <Text style={styles.entryIconText}>
                    {entry.source === 'photo' ? '📷' : '✏️'}
                  </Text>
                </View>
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryName, {color: colors.darkText}]} numberOfLines={1}>
                    {entry.food_name}
                  </Text>
                  <Text style={[styles.entryMeta, {color: colors.secondaryText}]}>
                    {entry.serving_description || 'Custom serving'}
                    {' · '}{entry.source === 'photo' ? 'Photo analyzed' : 'Manual entry'}
                  </Text>
                </View>
                <Text style={[styles.entryKcal, {color: colors.primaryGreen}]}>
                  {Math.round(entry.calories_kcal)} kcal
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteEntry(entry.id, entry.food_name)}
                  style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ── TIP CARD ─────────────────────────────────────────────── */}
        <View style={[styles.tipCard, {backgroundColor: colors.lightGreenBg}]}>
          <Text style={[styles.tipText, {color: colors.secondaryText}]}>
            💡 <Text style={{fontFamily: FontFamily.semiBold}}>Tip:</Text> Every packaged product you scan
            with FoodLens is automatically counted in your daily calorie total — no manual entry needed!
          </Text>
        </View>

      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════
          GOAL SETTING MODAL
      ══════════════════════════════════════════════════════════════ */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {backgroundColor: colors.surface}]}>
            <Text style={[styles.modalTitle, {color: colors.darkText}]}>🎯 Set Daily Calorie Goal</Text>
            <Text style={[styles.modalSub, {color: colors.secondaryText}]}>
              Enter your target daily calorie intake (500–10,000 kcal)
            </Text>

            <TextInput
              style={[styles.modalInput, {
                backgroundColor: colors.background,
                color: colors.darkText,
                borderColor: colors.border,
              }]}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="numeric"
              placeholder="e.g. 2000"
              placeholderTextColor={colors.lightText}
              maxLength={5}
            />

            {/* Preset buttons */}
            <View style={styles.presets}>
              {[1500, 1800, 2000, 2200, 2500].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: goalInput === String(v) ? '#22C55E' : colors.background,
                      borderColor: '#22C55E',
                    },
                  ]}
                  onPress={() => setGoalInput(String(v))}>
                  <Text style={[styles.presetBtnText, {
                    color: goalInput === String(v) ? '#fff' : '#22C55E',
                  }]}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, {borderColor: colors.border}]}
                onPress={() => setShowGoalModal(false)}>
                <Text style={[styles.modalCancelText, {color: colors.secondaryText}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveGoal}
                disabled={goalSaving}>
                {goalSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Goal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MANUAL ENTRY MODAL
      ══════════════════════════════════════════════════════════════ */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {backgroundColor: colors.surface}]}>
            <Text style={[styles.modalTitle, {color: colors.darkText}]}>✏️ Log Food Manually</Text>

            <TextInput
              style={[styles.modalInput, {backgroundColor: colors.background, color: colors.darkText, borderColor: colors.border}]}
              value={manualName}
              onChangeText={setManualName}
              placeholder="Food name (e.g. Rice and Curry)"
              placeholderTextColor={colors.lightText}
            />
            <TextInput
              style={[styles.modalInput, {backgroundColor: colors.background, color: colors.darkText, borderColor: colors.border}]}
              value={manualKcal}
              onChangeText={setManualKcal}
              keyboardType="numeric"
              placeholder="Calories (kcal) *"
              placeholderTextColor={colors.lightText}
            />
            <TextInput
              style={[styles.modalInput, {backgroundColor: colors.background, color: colors.darkText, borderColor: colors.border}]}
              value={manualServing}
              onChangeText={setManualServing}
              placeholder="Serving size (e.g. 1 plate, 100g)"
              placeholderTextColor={colors.lightText}
            />

            {/* Optional macros row */}
            <Text style={[styles.macroLabel, {color: colors.secondaryText}]}>
              Optional macros:
            </Text>
            <View style={styles.macroRow}>
              <TextInput
                style={[styles.macroInput, {backgroundColor: colors.background, color: colors.darkText, borderColor: colors.border}]}
                value={manualProtein}
                onChangeText={setManualProtein}
                keyboardType="numeric"
                placeholder="Protein g"
                placeholderTextColor={colors.lightText}
              />
              <TextInput
                style={[styles.macroInput, {backgroundColor: colors.background, color: colors.darkText, borderColor: colors.border}]}
                value={manualFat}
                onChangeText={setManualFat}
                keyboardType="numeric"
                placeholder="Fat g"
                placeholderTextColor={colors.lightText}
              />
              <TextInput
                style={[styles.macroInput, {backgroundColor: colors.background, color: colors.darkText, borderColor: colors.border}]}
                value={manualCarbs}
                onChangeText={setManualCarbs}
                keyboardType="numeric"
                placeholder="Carbs g"
                placeholderTextColor={colors.lightText}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, {borderColor: colors.border}]}
                onPress={() => setShowManualModal(false)}>
                <Text style={[styles.modalCancelText, {color: colors.secondaryText}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleLogManual}
                disabled={manualSaving}>
                {manualSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Log Food</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          PHOTO ANALYSIS MODAL
      ══════════════════════════════════════════════════════════════ */}
      <Modal visible={showPhotoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {backgroundColor: colors.surface}]}>
            <Text style={[styles.modalTitle, {color: colors.darkText}]}>📷 Food Photo Analysis</Text>

            {photoUri && (
              <Image
                source={{uri: photoUri}}
                style={styles.photoPreview}
                resizeMode="cover"
              />
            )}

            {photoAnalyzing ? (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={[styles.analyzingText, {color: colors.secondaryText}]}>
                  🤖 AI is analyzing your food...
                </Text>
              </View>
            ) : photoAnalysis ? (
              <View style={styles.analysisResult}>
                <Text style={[styles.analysisName, {color: colors.darkText}]}>
                  {photoAnalysis.food_name}
                </Text>
                <View style={styles.analysisKcalRow}>
                  <Text style={styles.analysisKcal}>
                    {Math.round(photoAnalysis.calories_kcal)}
                  </Text>
                  <Text style={[styles.analysisKcalUnit, {color: colors.secondaryText}]}>kcal</Text>
                </View>
                <Text style={[styles.analysisServing, {color: colors.secondaryText}]}>
                  {photoAnalysis.serving_description}
                </Text>
                <View style={styles.analysisMacros}>
                  {[
                    {label: 'Protein', val: photoAnalysis.protein_g, unit: 'g', color: '#3B82F6'},
                    {label: 'Fat', val: photoAnalysis.fat_g, unit: 'g', color: '#EF4444'},
                    {label: 'Carbs', val: photoAnalysis.carbs_g, unit: 'g', color: '#F59E0B'},
                  ].map(m => (
                    <View key={m.label} style={[styles.macroChip, {borderColor: m.color}]}>
                      <Text style={[styles.macroChipVal, {color: m.color}]}>
                        {Math.round(m.val)}{m.unit}
                      </Text>
                      <Text style={[styles.macroChipLabel, {color: colors.secondaryText}]}>
                        {m.label}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.confidenceText, {color: colors.secondaryText}]}>
                  Confidence: {photoAnalysis.confidence === 'high' ? '🟢 High'
                    : photoAnalysis.confidence === 'medium' ? '🟡 Medium' : '🔴 Low'}
                </Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, {borderColor: colors.border}]}
                onPress={() => {
                  setShowPhotoModal(false);
                  setPhotoUri(null);
                  setPhotoAnalysis(null);
                }}>
                <Text style={[styles.modalCancelText, {color: colors.secondaryText}]}>Cancel</Text>
              </TouchableOpacity>
              {photoAnalysis && (
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleLogPhotoResult}
                  disabled={photoLogging}>
                  {photoLogging ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Log This</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {paddingBottom: 100},

  // Hero
  heroCard: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
    ...Shadow.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: '#FFF',
  },
  heroDate: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  goalBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  goalBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: '#FFF',
  },
  sourcePills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.base,
    marginTop: Spacing.sm,
  },
  sourcePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  sourcePillIcon: {fontSize: 14},
  sourcePillLabel: {fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.85)'},
  sourcePillVal: {fontFamily: FontFamily.bold, fontSize: 12, color: '#FFF'},
  exceededBanner: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  exceededText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: '#FFF',
    textAlign: 'center',
  },

  // Quick add
  quickAddRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  quickAddBtn: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  quickAddIcon: {fontSize: 28, marginBottom: 4},
  quickAddLabel: {fontFamily: FontFamily.semiBold, fontSize: FontSize.body},
  quickAddSub: {fontFamily: FontFamily.regular, fontSize: FontSize.small, marginTop: 2, textAlign: 'center'},

  // Card
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    ...Shadow.sm,
  },
  cardTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.h2},

  // Progress
  progressHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  progressPct: {fontFamily: FontFamily.bold, fontSize: 22},
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {height: 12, borderRadius: 6},
  progressCaption: {fontFamily: FontFamily.regular, fontSize: FontSize.small, marginTop: 4},

  // Log
  logHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  addMoreText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.caption, color: '#22C55E'},
  emptyLog: {alignItems: 'center', paddingVertical: Spacing.base},
  emptyLogIcon: {fontSize: 36, marginBottom: Spacing.sm},
  emptyLogText: {fontFamily: FontFamily.regular, fontSize: FontSize.caption, textAlign: 'center'},
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  entryIconText: {fontSize: 16},
  entryInfo: {flex: 1},
  entryName: {fontFamily: FontFamily.semiBold, fontSize: FontSize.body},
  entryMeta: {fontFamily: FontFamily.regular, fontSize: FontSize.small, marginTop: 1},
  entryKcal: {fontFamily: FontFamily.bold, fontSize: FontSize.body, marginRight: Spacing.sm},
  deleteBtn: {padding: 4},
  deleteBtnText: {color: '#EF4444', fontSize: 14, fontFamily: FontFamily.bold},

  // Tip
  tipCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  tipText: {fontFamily: FontFamily.regular, fontSize: FontSize.small, lineHeight: 19},

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    ...Shadow.lg,
  },
  modalTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.h1, marginBottom: 4},
  modalSub: {fontFamily: FontFamily.regular, fontSize: FontSize.caption, marginBottom: Spacing.base},
  modalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    marginBottom: Spacing.sm,
  },
  presets: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.base},
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  presetBtnText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.caption},
  macroLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.small, marginBottom: 6},
  macroRow: {flexDirection: 'row', gap: 8, marginBottom: Spacing.md},
  macroInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
  },
  modalActions: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm},
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.body},
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: {fontFamily: FontFamily.bold, fontSize: FontSize.body, color: '#FFF'},

  // Photo modal
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  analyzingContainer: {alignItems: 'center', paddingVertical: Spacing.base, gap: Spacing.sm},
  analyzingText: {fontFamily: FontFamily.medium, fontSize: FontSize.body},
  analysisResult: {marginBottom: Spacing.sm},
  analysisName: {fontFamily: FontFamily.bold, fontSize: FontSize.h2, marginBottom: 4},
  analysisKcalRow: {flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 2},
  analysisKcal: {fontFamily: FontFamily.bold, fontSize: 42, color: '#22C55E'},
  analysisKcalUnit: {fontFamily: FontFamily.medium, fontSize: 18},
  analysisServing: {fontFamily: FontFamily.regular, fontSize: FontSize.caption, marginBottom: Spacing.sm},
  analysisMacros: {flexDirection: 'row', gap: 8, marginBottom: 8},
  macroChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: 8,
    alignItems: 'center',
  },
  macroChipVal: {fontFamily: FontFamily.bold, fontSize: FontSize.body},
  macroChipLabel: {fontFamily: FontFamily.regular, fontSize: FontSize.small},
  confidenceText: {fontFamily: FontFamily.regular, fontSize: FontSize.small},
});

export default NutritionSummaryScreen;
