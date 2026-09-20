/**
 * MoreScreen — App menu with links to additional features.
 * Includes Nutrition Tracker, About, and future settings.
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
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {useAuth} from '../context/AuthContext';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({icon, title, subtitle, onPress, badge}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuIconContainer}>
      <Text style={styles.menuIcon}>{icon}</Text>
    </View>
    <View style={styles.menuContent}>
      <View style={styles.menuTitleRow}>
        <Text style={styles.menuTitle}>{title}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </View>
    <Text style={styles.menuArrow}>›</Text>
  </TouchableOpacity>
);

const MoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {user} = useAuth();
  const isStaff = user?.is_staff ?? false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
          <Text style={styles.headerSubtitle}>Tools & Features</Text>
        </View>

        {/* Health & Nutrition */}
        <Text style={styles.sectionLabel}>HEALTH & NUTRITION</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="📊"
            title="Nutrition Tracker"
            subtitle="Daily & weekly calorie, sugar & nutrient trends"
            badge="NEW"
            onPress={() => navigation.navigate('NutritionSummary')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="⚖️"
            title="Compare Products"
            subtitle="Side-by-side health score & nutrition comparison"
            badge="NEW"
            onPress={() => navigation.navigate('ProductCompare')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="📋"
            title="Scan History"
            subtitle="View all your past product scans"
            onPress={() => navigation.navigate('History')}
          />
        </View>

        {/* Admin Analytics — only visible to is_staff users */}
        {isStaff && (
          <>
            <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="📊"
                title="Admin Analytics"
                subtitle="Aggregate stats, flagged ingredients across all users"
                badge="ADMIN"
                onPress={() => navigation.navigate('Analytics')}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="👥"
                title="User Management"
                subtitle="View all users, delete accounts"
                badge="ADMIN"
                onPress={() => navigation.navigate('AdminUsers')}
              />
            </View>
          </>
        )}

        {/* Community */}
        <Text style={styles.sectionLabel}>COMMUNITY</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="🌍"
            title="Submit Missing Product"
            subtitle="Help the community by adding unrecognized regional products"
            badge="NEW"
            onPress={() => navigation.navigate('CommunitySubmit')}
          />
        </View>

        {/* App */}
        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="⚙️"
            title="Settings"
            subtitle="Change password & app preferences"
            onPress={() => navigation.navigate('Settings')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="👤"
            title="My Health Profile"
            subtitle="Manage conditions, allergies & preferences"
            onPress={() => navigation.navigate('Profile')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="🤖"
            title="AI Explanations"
            subtitle="Powered by Gemini — plain language summaries"
            onPress={() => {}}
          />
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="ℹ️"
            title="About FoodLens"
            subtitle="Version 1.0 · Capstone Project 2026"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="🔒"
            title="Data & Privacy"
            subtitle="Scores are deterministic — never LLM-guessed"
            onPress={() => {}}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
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
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
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
    backgroundColor: Colors.lightGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuIcon: {fontSize: 22},
  menuContent: {flex: 1},
  menuTitleRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  menuTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  menuSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  menuArrow: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.lightText,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 76,
  },
  badge: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.white,
    letterSpacing: 0.5,
  },
});

export default MoreScreen;
