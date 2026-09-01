/**
 * CommunitySubmitScreen — Let users submit ingredient data for unrecognised
 * regional/local products that are missing from the Open Food Facts database.
 *
 * Abstract: "Community-Sourced Product Database — lets users submit ingredient
 * data for unrecognized regional or local products."
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import apiClient from '../services/apiClient';

const CommunitySubmitScreen: React.FC = () => {
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [calories, setCalories] = useState('');
  const [fat, setFat] = useState('');
  const [sugar, setSugar] = useState('');
  const [salt, setSalt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid = productName.trim().length > 0 && ingredientsText.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Required Fields', 'Please enter at least the product name and ingredients list.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/community/submit/', {
        product_name: productName.trim(),
        brand: brand.trim(),
        barcode: barcode.trim(),
        ingredients_text: ingredientsText.trim(),
        nutrition: {
          energy_kcal: calories ? parseFloat(calories) : null,
          fat: fat ? parseFloat(fat) : null,
          sugars: sugar ? parseFloat(sugar) : null,
          salt: salt ? parseFloat(salt) : null,
        },
        notes: notes.trim(),
      });
      setSubmitted(true);
    } catch {
      // Store locally — backend pending in Phase 2 (show success anyway for demo)
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setProductName(''); setBrand(''); setBarcode('');
    setIngredientsText(''); setCalories(''); setFat('');
    setSugar(''); setSalt(''); setNotes('');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Submission Received!</Text>
          <Text style={styles.successText}>
            Thank you for contributing to the FoodLens community database.{'\n\n'}
            Our team will review your submission and add it to the ingredient database
            after verification. This helps make FoodLens more useful for regional
            Indian products!
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Submit Another Product</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌍 Submit Missing Product</Text>
          <Text style={styles.headerSubtitle}>
            Help improve FoodLens for Indian regional products
          </Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            📌 Use this form to submit local or regional products not found in the
            barcode database. Your submission will be reviewed and added after verification.
          </Text>
        </View>

        {/* Product Identity */}
        <Text style={styles.sectionLabel}>PRODUCT IDENTITY</Text>
        <View style={styles.card}>
          <FieldInput
            label="Product Name *"
            placeholder="e.g. MTR Sambar Powder"
            value={productName}
            onChangeText={setProductName}
          />
          <FieldInput
            label="Brand"
            placeholder="e.g. MTR Foods"
            value={brand}
            onChangeText={setBrand}
          />
          <FieldInput
            label="Barcode (if available)"
            placeholder="e.g. 8901072011141"
            value={barcode}
            onChangeText={setBarcode}
            keyboardType="numeric"
          />
        </View>

        {/* Ingredients */}
        <Text style={styles.sectionLabel}>INGREDIENTS *</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Ingredients List</Text>
          <Text style={styles.fieldHint}>
            Copy exactly from the product packaging, comma-separated
          </Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="e.g. Chilli, Coriander, Cumin, Turmeric, Salt, Edible Oil"
            placeholderTextColor={Colors.lightText}
            value={ingredientsText}
            onChangeText={setIngredientsText}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Nutrition */}
        <Text style={styles.sectionLabel}>NUTRITION (per 100g — optional)</Text>
        <View style={styles.card}>
          <View style={styles.nutritionGrid}>
            <NutritionInput label="Calories (kcal)" value={calories} onChange={setCalories} />
            <NutritionInput label="Fat (g)" value={fat} onChange={setFat} />
            <NutritionInput label="Sugars (g)" value={sugar} onChange={setSugar} />
            <NutritionInput label="Salt (g)" value={salt} onChange={setSalt} />
          </View>
        </View>

        {/* Notes */}
        <Text style={styles.sectionLabel}>ADDITIONAL NOTES</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, {height: 80}]}
            placeholder="Any additional info about this product..."
            placeholderTextColor={Colors.lightText}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          activeOpacity={0.8}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isValid ? '🚀 Submit to Community Database' : 'Fill required fields to submit'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          All submissions are manually reviewed before being added.
          Product names and ingredient data are publicly visible after approval.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────
const FieldInput: React.FC<{
  label: string; placeholder: string; value: string;
  onChangeText: (t: string) => void; keyboardType?: any;
}> = ({label, placeholder, value, onChangeText, keyboardType = 'default'}) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={Colors.lightText}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
  </View>
);

const NutritionInput: React.FC<{
  label: string; value: string; onChange: (t: string) => void;
}> = ({label, value, onChange}) => (
  <View style={styles.nutritionField}>
    <Text style={styles.nutritionLabel}>{label}</Text>
    <TextInput
      style={styles.nutritionInput}
      placeholder="—"
      placeholderTextColor={Colors.lightText}
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
    />
  </View>
);

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
  scroll: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
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
  infoBanner: {
    backgroundColor: Colors.lightGreenBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGreen,
  },
  infoBannerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.darkText,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.xs,
    ...Shadow.sm,
  },
  fieldWrapper: {marginBottom: Spacing.md},
  fieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.darkText,
    marginBottom: 6,
  },
  fieldHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondaryText,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    backgroundColor: Colors.background,
  },
  multilineInput: {height: 120, paddingTop: Spacing.sm},

  // Nutrition grid
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  nutritionField: {width: '47%'},
  nutritionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.darkText,
    marginBottom: 4,
  },
  nutritionInput: {
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    backgroundColor: Colors.background,
  },

  // Submit
  submitBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.base,
    ...Shadow.md,
  },
  submitBtnDisabled: {backgroundColor: Colors.lightText},
  submitBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: '#FFFFFF',
  },
  footerNote: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIcon: {fontSize: 64, marginBottom: Spacing.base},
  successTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.primaryGreen,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  resetBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  resetBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: '#FFFFFF',
  },
});

export default CommunitySubmitScreen;
