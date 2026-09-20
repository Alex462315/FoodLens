/**
 * SettingsScreen — Minimal settings screen.
 * Hosts the Change Password entry point as required by the prompt.
 * Additional settings can be added here in future phases.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';

interface Props {
  navigation: any;
}

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({icon, title, subtitle, onPress, danger}) => (
  <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
    <View style={styles.itemContent}>
      <Text style={[styles.itemTitle, danger && styles.itemTitleDanger]}>{title}</Text>
      <Text style={styles.itemSubtitle}>{subtitle}</Text>
    </View>
    <Text style={styles.arrow}>›</Text>
  </TouchableOpacity>
);

const SettingsScreen: React.FC<Props> = ({navigation}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Account & Preferences</Text>
        </View>

        {/* Account Security */}
        <Text style={styles.sectionLabel}>ACCOUNT SECURITY</Text>
        <View style={styles.card}>
          <SettingsItem
            icon="🔒"
            title="Change Password"
            subtitle="Update your login password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </View>

        {/* Placeholder for future settings */}
        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.card}>
          <SettingsItem
            icon="🔔"
            title="Notifications"
            subtitle="Consumption limit alerts (coming soon)"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="🌐"
            title="Language"
            subtitle="English (multi-language coming soon)"
            onPress={() => {}}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea:   {flex: 1, backgroundColor: Colors.background},
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  header: {paddingTop: Spacing.xl, paddingBottom: Spacing.md},
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
    backgroundColor: Colors.lightGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconBoxDanger: {backgroundColor: Colors.redBg},
  icon:         {fontSize: 22},
  itemContent:  {flex: 1},
  itemTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  itemTitleDanger: {color: Colors.redDark},
  itemSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  arrow: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.lightText,
  },
  divider: {height: 1, backgroundColor: Colors.divider, marginLeft: 76},
});

export default SettingsScreen;
