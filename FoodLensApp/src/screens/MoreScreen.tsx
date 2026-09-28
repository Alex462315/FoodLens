/**
 * MoreScreen — App menu with links to additional features.
 * Fully responsive to Light & Dark theme.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../theme/ThemeContext';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {useAuth} from '../context/AuthContext';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
  colors: any;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  colors,
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}>
    <View
      style={[
        styles.menuIconContainer,
        {backgroundColor: colors.inputBg},
      ]}>
      <Text style={styles.menuIcon}>{icon}</Text>
    </View>
    <View style={styles.menuContent}>
      <View style={styles.menuTitleRow}>
        <Text style={[styles.menuTitle, {color: colors.darkText}]}>{title}</Text>
        {badge && (
          <View
            style={[
              styles.badge,
              badge === 'ADMIN'
                ? {backgroundColor: colors.redDark}
                : {backgroundColor: colors.primaryGreen},
            ]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.menuSubtitle, {color: colors.secondaryText}]}>
        {subtitle}
      </Text>
    </View>
    <Text style={[styles.menuArrow, {color: colors.lightText}]}>›</Text>
  </TouchableOpacity>
);

const MoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {user} = useAuth();
  const {isDark, colors, themeMode} = useTheme();
  const isStaff = user?.is_staff ?? false;

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
          <Text style={[styles.headerTitle, {color: colors.darkText}]}>More</Text>
          <Text style={[styles.headerSubtitle, {color: colors.secondaryText}]}>
            Tools & Features
          </Text>
        </View>

        {/* Health & Nutrition */}
        <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
          HEALTH & NUTRITION
        </Text>
        <View
          style={[
            styles.menuCard,
            {backgroundColor: colors.surface, borderColor: colors.border},
          ]}>
          <MenuItem
            icon="📊"
            title="Nutrition Tracker"
            subtitle="Daily & weekly calorie, sugar & nutrient trends"
            badge="NEW"
            onPress={() => navigation.navigate('NutritionSummary')}
            colors={colors}
          />
          <View style={[styles.divider, {backgroundColor: colors.border}]} />
          <MenuItem
            icon="⚖️"
            title="Compare Products"
            subtitle="Side-by-side health score & nutrition comparison"
            badge="NEW"
            onPress={() => navigation.navigate('ProductCompare')}
            colors={colors}
          />
          <View style={[styles.divider, {backgroundColor: colors.border}]} />
          <MenuItem
            icon="📋"
            title="Scan History"
            subtitle="View all your past product scans"
            onPress={() => navigation.navigate('History')}
            colors={colors}
          />
        </View>

        {/* Admin Analytics — only visible to is_staff users */}
        {isStaff && (
          <>
            <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
              ADMINISTRATION
            </Text>
            <View
              style={[
                styles.menuCard,
                {backgroundColor: colors.surface, borderColor: colors.border},
              ]}>
              <MenuItem
                icon="📊"
                title="Admin Analytics"
                subtitle="Aggregate stats, flagged ingredients across all users"
                badge="ADMIN"
                onPress={() => navigation.navigate('Analytics')}
                colors={colors}
              />
              <View style={[styles.divider, {backgroundColor: colors.border}]} />
              <MenuItem
                icon="👥"
                title="User Management"
                subtitle="View all users, delete accounts"
                badge="ADMIN"
                onPress={() => navigation.navigate('AdminUsers')}
                colors={colors}
              />
              <View style={[styles.divider, {backgroundColor: colors.border}]} />
              <MenuItem
                icon="📋"
                title="Review Submissions"
                subtitle="Approve or reject community product submissions"
                badge="ADMIN"
                onPress={() => navigation.navigate('AdminSubmissions')}
                colors={colors}
              />
            </View>
          </>
        )}

        {/* Community — hidden for admins/staff, only visible to regular users */}
        {!isStaff && (
          <>
            <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
              COMMUNITY
            </Text>
            <View
              style={[
                styles.menuCard,
                {backgroundColor: colors.surface, borderColor: colors.border},
              ]}>
              <MenuItem
                icon="🌍"
                title="Submit Missing Product"
                subtitle="Help the community by adding unrecognized regional products"
                badge="NEW"
                onPress={() => navigation.navigate('CommunitySubmit')}
                colors={colors}
              />
            </View>
          </>
        )}

        {/* App */}
        <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
          APP
        </Text>
        <View
          style={[
            styles.menuCard,
            {backgroundColor: colors.surface, borderColor: colors.border},
          ]}>
          <MenuItem
            icon="⚙️"
            title="Settings & Appearance"
            subtitle={`Theme: ${themeMode === 'light' ? 'Light' : themeMode === 'dark' ? 'Dark' : 'System Auto'} · Account settings`}
            onPress={() => navigation.navigate('Settings')}
            colors={colors}
          />
          <View style={[styles.divider, {backgroundColor: colors.border}]} />
          <MenuItem
            icon="👤"
            title="My Health Profile"
            subtitle="Manage conditions, allergies & family profiles"
            onPress={() => navigation.navigate('Profile')}
            colors={colors}
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, {color: colors.secondaryText}]}>
          ABOUT
        </Text>
        <View
          style={[
            styles.menuCard,
            {backgroundColor: colors.surface, borderColor: colors.border},
          ]}>
          <MenuItem
            icon="ℹ️"
            title="About FoodLens"
            subtitle="Version 1.0 · Capstone Project 2026"
            onPress={() => {}}
            colors={colors}
          />
          <View style={[styles.divider, {backgroundColor: colors.border}]} />
          <MenuItem
            icon="🔒"
            title="Data & Privacy"
            subtitle="Scores are deterministic — never LLM-guessed"
            onPress={() => {}}
            colors={colors}
          />
        </View>
      </ScrollView>
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
  menuCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuIcon: {
    fontSize: 22,
  },
  menuContent: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
  },
  menuSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    marginTop: 2,
  },
  menuArrow: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginLeft: 76,
  },
});

export default MoreScreen;
