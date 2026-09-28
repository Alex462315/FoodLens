/**
 * SettingsScreen — Account & App settings.
 * - Theme Selector: Light, Dark, and System Auto mode
 * - Edit Username (inline modal)
 * - Change Password (navigates to ChangePasswordScreen)
 * - Notifications & Language
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {useTheme, ThemeMode} from '../theme/ThemeContext';
import {useAuth} from '../context/AuthContext';
import {AxiosError} from 'axios';

interface Props {
  navigation: any;
}

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
  colors: any;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  colors,
}) => (
  <TouchableOpacity
    style={styles.item}
    onPress={onPress}
    activeOpacity={0.7}>
    <View
      style={[
        styles.iconBox,
        {backgroundColor: colors.inputBg},
        danger && {backgroundColor: colors.redBg},
      ]}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
    <View style={styles.itemContent}>
      <Text
        style={[
          styles.itemTitle,
          {color: colors.darkText},
          danger && {color: colors.redDark},
        ]}>
        {title}
      </Text>
      <Text style={[styles.itemSubtitle, {color: colors.secondaryText}]}>
        {subtitle}
      </Text>
    </View>
    <Text style={[styles.arrow, {color: colors.lightText}]}>›</Text>
  </TouchableOpacity>
);

const SettingsScreen: React.FC<Props> = ({navigation}) => {
  const {user, updateUsername} = useAuth();
  const {themeMode, isDark, colors, setThemeMode} = useTheme();

  // ── Edit Username modal state ──
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const openUsernameModal = () => {
    setNewUsername(user?.username || '');
    setUsernameError('');
    setShowUsernameModal(true);
  };

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();

    if (!trimmed) {
      setUsernameError('Username cannot be empty.');
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 30) {
      setUsernameError('Username must be 3–30 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      setUsernameError('Only letters, numbers, dots, hyphens, and underscores.');
      return;
    }
    if (trimmed === user?.username) {
      setUsernameError("That's already your username.");
      return;
    }

    setSavingUsername(true);
    setUsernameError('');
    try {
      await updateUsername(trimmed);
      setShowUsernameModal(false);
      Alert.alert('✅ Username Updated', `Your username is now "${trimmed}".`);
    } catch (err: any) {
      const axiosError = err as AxiosError<{error?: string}>;
      if (axiosError.response?.data?.error) {
        setUsernameError(axiosError.response.data.error);
      } else if (axiosError.code === 'ERR_NETWORK') {
        setUsernameError('Cannot connect to server.');
      } else {
        setUsernameError('Failed to update username. Try again.');
      }
    } finally {
      setSavingUsername(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: colors.darkText}]}>Settings</Text>
          <Text style={[styles.headerSubtitle, {color: colors.secondaryText}]}>
            Account & Preferences
          </Text>
        </View>

        {/* ── APPEARANCE (Theme Selector) ── */}
        <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
          APPEARANCE
        </Text>
        <View
          style={[
            styles.card,
            {backgroundColor: colors.surface, borderColor: colors.border},
          ]}>
          <View style={styles.themeSection}>
            <View style={styles.themeInfo}>
              <Text style={[styles.itemTitle, {color: colors.darkText}]}>
                App Theme
              </Text>
              <Text style={[styles.itemSubtitle, {color: colors.secondaryText}]}>
                {themeMode === 'light'
                  ? 'Light mode active'
                  : themeMode === 'dark'
                  ? 'Dark mode active'
                  : 'Matches system setting'}
              </Text>
            </View>

            {/* Segmented Theme Buttons */}
            <View
              style={[
                styles.themeSelector,
                {backgroundColor: colors.inputBg, borderColor: colors.border},
              ]}>
              <TouchableOpacity
                style={[
                  styles.themeTab,
                  themeMode === 'light' && [
                    styles.themeTabActive,
                    {backgroundColor: colors.surface, borderColor: colors.border},
                  ],
                ]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.themeTabText,
                    {color: themeMode === 'light' ? colors.primaryGreen : colors.secondaryText},
                    themeMode === 'light' && styles.themeTabTextActive,
                  ]}>
                  ☀️ Light
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeTab,
                  themeMode === 'dark' && [
                    styles.themeTabActive,
                    {backgroundColor: colors.surface, borderColor: colors.border},
                  ],
                ]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.themeTabText,
                    {color: themeMode === 'dark' ? colors.primaryGreen : colors.secondaryText},
                    themeMode === 'dark' && styles.themeTabTextActive,
                  ]}>
                  🌙 Dark
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeTab,
                  themeMode === 'system' && [
                    styles.themeTabActive,
                    {backgroundColor: colors.surface, borderColor: colors.border},
                  ],
                ]}
                onPress={() => setThemeMode('system')}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.themeTabText,
                    {color: themeMode === 'system' ? colors.primaryGreen : colors.secondaryText},
                    themeMode === 'system' && styles.themeTabTextActive,
                  ]}>
                  ⚙️ Auto
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── ACCOUNT ── */}
        <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
          ACCOUNT
        </Text>
        <View
          style={[
            styles.card,
            {backgroundColor: colors.surface, borderColor: colors.border},
          ]}>
          <SettingsItem
            icon="✏️"
            title="Edit Username"
            subtitle={`Current: ${user?.username || '—'}`}
            onPress={openUsernameModal}
            colors={colors}
          />
        </View>

        {/* ── SECURITY ── */}
        <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
          SECURITY
        </Text>
        <View
          style={[
            styles.card,
            {backgroundColor: colors.surface, borderColor: colors.border},
          ]}>
          <SettingsItem
            icon="🔒"
            title="Change Password"
            subtitle="Update your login password"
            onPress={() => navigation.navigate('ChangePassword')}
            colors={colors}
          />
        </View>

        {/* ── APP PREFERENCES ── */}
        <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
          PREFERENCES
        </Text>
        <View
          style={[
            styles.card,
            {backgroundColor: colors.surface, borderColor: colors.border},
          ]}>
          <SettingsItem
            icon="🔔"
            title="Notifications"
            subtitle="Consumption limit alerts (enabled)"
            onPress={() => {}}
            colors={colors}
          />
          <View style={[styles.divider, {backgroundColor: colors.border}]} />
          <SettingsItem
            icon="🌐"
            title="Language"
            subtitle="English"
            onPress={() => {}}
            colors={colors}
          />
        </View>
      </ScrollView>

      {/* ── Edit Username Modal ── */}
      <Modal
        visible={showUsernameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {backgroundColor: colors.surface},
            ]}>
            <Text style={[styles.modalTitle, {color: colors.darkText}]}>
              Edit Username
            </Text>
            <Text style={[styles.modalSubtitle, {color: colors.secondaryText}]}>
              Choose a new username (3–30 characters)
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.inputText,
                  borderColor: colors.border,
                },
                usernameError ? styles.modalInputError : null,
              ]}
              value={newUsername}
              onChangeText={text => {
                setNewUsername(text);
                if (usernameError) setUsernameError('');
              }}
              placeholder="e.g. food_lover_99"
              placeholderTextColor={colors.lightText}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              editable={!savingUsername}
            />

            {usernameError ? (
              <Text style={styles.modalError}>{usernameError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {borderColor: colors.border},
                ]}
                onPress={() => setShowUsernameModal(false)}
                disabled={savingUsername}>
                <Text style={[styles.modalCancelText, {color: colors.secondaryText}]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {backgroundColor: colors.primaryGreen},
                  savingUsername && styles.modalSaveBtnDisabled,
                ]}
                onPress={handleSaveUsername}
                disabled={savingUsername}>
                {savingUsername ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
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
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
  },
  itemSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    marginTop: 2,
  },
  arrow: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
  },
  divider: {
    height: 1,
    marginLeft: 76,
  },

  // ── Appearance Section ──
  themeSection: {
    padding: Spacing.base,
  },
  themeInfo: {
    marginBottom: Spacing.sm,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  themeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTabActive: {
    borderWidth: 1,
    ...Shadow.sm,
  },
  themeTabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
  },
  themeTabTextActive: {
    fontFamily: FontFamily.bold,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 380,
    ...Shadow.lg,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    marginBottom: Spacing.base,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
  },
  modalInputError: {
    borderColor: '#EF4444',
  },
  modalError: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: '#EF4444',
    marginTop: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.base,
    gap: Spacing.sm,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modalCancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  modalSaveBtnDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: '#FFFFFF',
  },
});

export default SettingsScreen;
