/**
 * HealthProfileFormScreen — Create or Edit a health profile.
 * Shared form: mode "create" shows empty, mode "edit" shows pre-filled.
 * Includes severity selector for health conditions (Mild / Moderate / Severe).
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius} from '../theme/spacing';
import {PrimaryButton, FormInput} from '../components';
import {
  HealthProfile,
  HealthProfilePayload,
  ConditionItem,
  SeverityLevel,
  createHealthProfile,
  updateHealthProfile,
} from '../services/healthProfileService';
import {AxiosError} from 'axios';

interface HealthProfileFormScreenProps {
  navigation: any;
  route: {
    params: {
      mode: 'create' | 'edit';
      profile?: HealthProfile;
    };
  };
}

const RELATION_OPTIONS = ['self', 'parent', 'sibling', 'child', 'spouse', 'other'];
const GENDER_OPTIONS = ['male', 'female', 'other'];
const SEVERITY_OPTIONS: {label: string; value: SeverityLevel}[] = [
  {label: 'Mild', value: 'mild'},
  {label: 'Moderate', value: 'moderate'},
  {label: 'Severe', value: 'severe'},
];

// Helper to normalize condition input (supports old string or new object format)
const normalizeConditions = (rawConditions?: any[]): ConditionItem[] => {
  if (!rawConditions || !Array.isArray(rawConditions)) return [];
  return rawConditions.map(item => {
    if (typeof item === 'string') {
      return {condition_name: item, severity: 'moderate'};
    }
    return {
      condition_name: item.condition_name || item.name || '',
      severity: (item.severity as SeverityLevel) || 'moderate',
    };
  });
};

const HealthProfileFormScreen: React.FC<HealthProfileFormScreenProps> = ({
  navigation,
  route,
}) => {
  const {mode, profile} = route.params;
  const isEdit = mode === 'edit';

  // Form state
  const [profileName, setProfileName] = useState(profile?.profile_name || '');
  const [relation, setRelation] = useState(profile?.relation || 'self');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [heightCm, setHeightCm] = useState(
    profile?.height_cm?.toString() || '',
  );
  const [weightKg, setWeightKg] = useState(
    profile?.weight_kg?.toString() || '',
  );
  const [conditions, setConditions] = useState<ConditionItem[]>(
    normalizeConditions(profile?.conditions),
  );
  const [allergies, setAllergies] = useState<string[]>(
    profile?.allergies || [],
  );

  const [newConditionName, setNewConditionName] = useState('');
  const [newConditionSeverity, setNewConditionSeverity] =
    useState<SeverityLevel>('moderate');
  const [newAllergy, setNewAllergy] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profileName.trim()) {
      newErrors.profile_name = 'Profile name is required.';
    }
    if (!age.trim()) {
      newErrors.age = 'Age is required.';
    } else {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        newErrors.age = 'Age must be between 1 and 120.';
      }
    }
    if (heightCm && (isNaN(Number(heightCm)) || Number(heightCm) <= 0)) {
      newErrors.height_cm = 'Height must be a positive number.';
    }
    if (weightKg && (isNaN(Number(weightKg)) || Number(weightKg) <= 0)) {
      newErrors.weight_kg = 'Weight must be a positive number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setGeneralError('');

    if (!validate()) return;

    const payload: HealthProfilePayload = {
      profile_name: profileName.trim(),
      relation,
      age: parseInt(age, 10),
      gender,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      conditions,
      allergies,
    };

    setLoading(true);
    try {
      if (isEdit && profile) {
        await updateHealthProfile(profile.id, payload);
        Alert.alert('Success', 'Profile updated successfully.', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        await createHealthProfile(payload);
        Alert.alert('Success', 'Profile created successfully.', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
    } catch (error) {
      const axiosError = error as AxiosError<Record<string, string[]>>;

      if (axiosError.response?.data) {
        const backendErrors = axiosError.response.data;
        const fieldErrors: Record<string, string> = {};

        for (const [field, messages] of Object.entries(backendErrors)) {
          if (Array.isArray(messages)) {
            fieldErrors[field] = messages.join(' ');
          } else if (typeof messages === 'string') {
            fieldErrors[field] = messages;
          }
        }

        if (fieldErrors.non_field_errors) {
          setGeneralError(fieldErrors.non_field_errors);
          delete fieldErrors.non_field_errors;
        }

        setErrors(fieldErrors);
      } else {
        setGeneralError('Failed to save profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    const trimmed = newConditionName.trim();
    if (trimmed) {
      const exists = conditions.some(
        c => c.condition_name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (!exists) {
        setConditions([
          ...conditions,
          {condition_name: trimmed, severity: newConditionSeverity},
        ]);
      }
      setNewConditionName('');
      setNewConditionSeverity('moderate');
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAllergy = () => {
    const trimmed = newAllergy.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
    }
    setNewAllergy('');
  };

  const removeAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const renderOptionPicker = (
    label: string,
    options: string[],
    selected: string,
    onSelect: (value: string) => void,
  ) => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionChip,
              selected === option && styles.optionChipSelected,
            ]}
            onPress={() => onSelect(option)}>
            <Text
              style={[
                styles.optionText,
                selected === option && styles.optionTextSelected,
              ]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEdit ? 'Edit Profile' : 'New Health Profile'}
            </Text>
            <Text style={styles.subtitle}>
              {isEdit
                ? 'Update the health profile details'
                : 'Add a profile for personalized food analysis'}
            </Text>
          </View>

          {/* General Error */}
          {generalError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <FormInput
            label="Profile Name"
            placeholder="e.g., Myself, Mom, Dad"
            value={profileName}
            onChangeText={text => {
              setProfileName(text);
              if (errors.profile_name) {
                setErrors(prev => ({...prev, profile_name: ''}));
              }
            }}
            error={errors.profile_name}
          />

          {renderOptionPicker('Relation', RELATION_OPTIONS, relation, setRelation)}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormInput
                label="Age"
                placeholder="22"
                value={age}
                onChangeText={text => {
                  setAge(text);
                  if (errors.age) setErrors(prev => ({...prev, age: ''}));
                }}
                keyboardType="numeric"
                error={errors.age}
              />
            </View>
            <View style={styles.halfField}>
              {renderOptionPicker('Gender', GENDER_OPTIONS, gender, setGender)}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormInput
                label="Height (cm)"
                placeholder="175"
                value={heightCm}
                onChangeText={text => {
                  setHeightCm(text);
                  if (errors.height_cm)
                    setErrors(prev => ({...prev, height_cm: ''}));
                }}
                keyboardType="numeric"
                error={errors.height_cm}
              />
            </View>
            <View style={styles.halfField}>
              <FormInput
                label="Weight (kg)"
                placeholder="70"
                value={weightKg}
                onChangeText={text => {
                  setWeightKg(text);
                  if (errors.weight_kg)
                    setErrors(prev => ({...prev, weight_kg: ''}));
                }}
                keyboardType="numeric"
                error={errors.weight_kg}
              />
            </View>
          </View>

          {/* Conditions Section with Severity Selector */}
          <View style={styles.tagInputContainer}>
            <Text style={styles.pickerLabel}>Conditions</Text>

            {/* Condition Chips Display */}
            {conditions.length > 0 && (
              <View style={styles.tagsRow}>
                {conditions.map((c, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.tag}
                    onPress={() => removeCondition(index)}>
                    <Text style={styles.tagLabel}>
                      {c.condition_name} · {c.severity.charAt(0).toUpperCase() + c.severity.slice(1)} ✕
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Condition Input + Severity Selector */}
            <View style={styles.conditionInputContainer}>
              <FormInput
                label=""
                placeholder="Add condition (e.g. Diabetes)..."
                value={newConditionName}
                onChangeText={setNewConditionName}
                onSubmitEditing={addCondition}
                returnKeyType="next"
                containerStyle={styles.tagInputWrapper}
              />

              {/* Severity Selector */}
              <View style={styles.severityRow}>
                <Text style={styles.severityLabel}>Severity:</Text>
                <View style={styles.severityOptions}>
                  {SEVERITY_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.severityChip,
                        newConditionSeverity === opt.value &&
                          styles.severityChipSelected,
                      ]}
                      onPress={() => setNewConditionSeverity(opt.value)}>
                      <Text
                        style={[
                          styles.severityText,
                          newConditionSeverity === opt.value &&
                            styles.severityTextSelected,
                        ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.addButtonFull} onPress={addCondition}>
                <Text style={styles.addButtonText}>+ Add Condition</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Allergies Section */}
          <View style={styles.tagInputContainer}>
            <Text style={styles.pickerLabel}>Allergies</Text>
            {allergies.length > 0 && (
              <View style={styles.tagsRow}>
                {allergies.map((allergy, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tag, styles.allergyTag]}
                    onPress={() => removeAllergy(index)}>
                    <Text style={[styles.tagLabel, styles.allergyLabel]}>
                      {allergy} ✕
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.tagInputRow}>
              <View style={styles.tagInputField}>
                <FormInput
                  label=""
                  placeholder="Add allergy (e.g. Peanuts)..."
                  value={newAllergy}
                  onChangeText={setNewAllergy}
                  onSubmitEditing={addAllergy}
                  returnKeyType="done"
                  containerStyle={styles.tagInputWrapper}
                />
              </View>
              <TouchableOpacity style={styles.addButton} onPress={addAllergy}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <PrimaryButton
            title={isEdit ? 'Update Profile' : 'Create Profile'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },

  // Header
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.primaryGreen,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.secondaryText,
  },

  // Error
  errorBanner: {
    backgroundColor: Colors.redBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  errorBannerText: {
    ...Typography.body,
    color: Colors.redDark,
  },

  // Layout
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },

  // Option Picker
  pickerContainer: {
    marginBottom: Spacing.base,
  },
  pickerLabel: {
    ...Typography.subtitle,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionChipSelected: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
  },
  optionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  optionTextSelected: {
    color: Colors.white,
  },

  // Tag Input & Severity Selector
  tagInputContainer: {
    marginBottom: Spacing.base,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.lightGreenBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tagLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
  },
  allergyTag: {
    backgroundColor: Colors.redBg,
  },
  allergyLabel: {
    color: Colors.redDark,
  },
  conditionInputContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  severityLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    marginRight: Spacing.sm,
  },
  severityOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  severityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  severityChipSelected: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
  },
  severityText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  severityTextSelected: {
    color: Colors.white,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tagInputField: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  tagInputWrapper: {
    marginBottom: 0,
  },
  addButtonFull: {
    backgroundColor: Colors.primaryGreen,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: 20,
    minHeight: 48,
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.white,
  },

  // Submit
  submitButton: {
    marginTop: Spacing.xl,
  },
});

export default HealthProfileFormScreen;
