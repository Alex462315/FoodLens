/**
 * HomeScreen — Dashboard with greeting and honest empty states.
 * Real: greeting uses actual logged-in username from AuthContext.
 * Empty states: Health Risk Score at 0, no scans yet.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {HealthRiskScoreGauge} from '../components';
import {useAuth} from '../context/AuthContext';

const HomeScreen: React.FC = () => {
  const {user, logout} = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header with Greeting and Logout */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.username || 'User'} 👋
            </Text>
            <Text style={styles.subGreeting}>
              What would you like to scan today?
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar (visual only) */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search products...</Text>
        </View>

        {/* Health Risk Score Card — Empty State */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health Risk Score</Text>
          <View style={styles.gaugeContainer}>
            <HealthRiskScoreGauge score={0} size={140} showLabel={false} />
            <Text style={styles.emptyStateText}>No scans yet</Text>
          </View>
          <TouchableOpacity style={styles.viewDetailsButton} disabled>
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Scans — Empty State */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Recent Scans</Text>
          </View>
          <View style={styles.emptyScansContainer}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptyDescription}>
              You haven't scanned any products yet — tap Scan to get started
            </Text>
          </View>
        </View>
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
    paddingBottom: Spacing['3xl'],
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  greeting: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
  },
  subGreeting: {
    ...Typography.body,
    color: Colors.secondaryText,
    marginTop: Spacing.xs,
  },
  logoutButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  logoutText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.red,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  searchPlaceholder: {
    ...Typography.body,
    color: Colors.lightText,
  },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Gauge
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.secondaryText,
    marginTop: Spacing.sm,
  },
  viewDetailsButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    opacity: 0.5,
  },
  viewDetailsText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.primaryGreen,
  },

  // Empty Scans
  emptyScansContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});

export default HomeScreen;
