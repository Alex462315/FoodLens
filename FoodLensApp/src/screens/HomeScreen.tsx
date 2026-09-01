/**
 * HomeScreen — Dashboard with real user data.
 *
 * Features:
 *   - Personalized greeting using logged-in username
 *   - Latest scan Health Risk Score gauge (or empty state)
 *   - Recent Scans horizontal list (last 5 scans)
 *   - Quick action cards
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {HealthRiskScoreGauge, RiskBadge} from '../components';
import {useAuth} from '../context/AuthContext';
import {getScanHistory, ScanHistoryItem} from '../services/scoringService';

const HomeScreen: React.FC = () => {
  const {user, logout} = useAuth();
  const navigation = useNavigation<any>();
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent scans on focus
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const scans = await getScanHistory();
          setRecentScans(scans.slice(0, 5)); // Show last 5
        } catch (err) {
          console.error('Failed to fetch recent scans:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, []),
  );

  const latestScan = recentScans.length > 0 ? recentScans[0] : null;
  const latestScore = latestScan
    ? parseFloat(latestScan.normalized_score)
    : 0;

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

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
              {getGreetingTime()}, {user?.username || 'User'} 👋
            </Text>
            <Text style={styles.subGreeting}>
              What would you like to scan today?
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Health Risk Score Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health Risk Score</Text>
          {loading ? (
            <View style={styles.gaugeContainer}>
              <ActivityIndicator size="large" color={Colors.primaryGreen} />
            </View>
          ) : latestScan ? (
            <View style={styles.gaugeContainer}>
              <HealthRiskScoreGauge
                score={latestScore}
                size={140}
                showLabel={false}
              />
              <Text style={styles.latestProductName}>
                {latestScan.product_name || 'Latest Scan'}
              </Text>
              <RiskBadge
                level={
                  latestScan.risk_label.toLowerCase() as
                    | 'low'
                    | 'moderate'
                    | 'high'
                }
              />
            </View>
          ) : (
            <View style={styles.gaugeContainer}>
              <HealthRiskScoreGauge score={0} size={140} showLabel={false} />
              <Text style={styles.emptyStateText}>No scans yet</Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.viewDetailsButton,
              !latestScan && styles.viewDetailsButtonDisabled,
            ]}
            disabled={!latestScan}
            onPress={() => navigation.navigate('History')}>
            <Text
              style={[
                styles.viewDetailsText,
                !latestScan && styles.viewDetailsTextDisabled,
              ]}>
              View All Scans
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Scan')}
            activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>📸</Text>
            <Text style={styles.quickActionLabel}>Scan Product</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>👤</Text>
            <Text style={styles.quickActionLabel}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Scans */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Recent Scans</Text>
            {recentScans.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('History')}>
                <Text style={styles.seeAllText}>See All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color={Colors.primaryGreen}
              style={{marginVertical: Spacing.lg}}
            />
          ) : recentScans.length === 0 ? (
            <View style={styles.emptyScansContainer}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyTitle}>No scans yet</Text>
              <Text style={styles.emptyDescription}>
                You haven't scanned any products yet — tap Scan to get started
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScansScroll}>
              {recentScans.map(scan => {
                const riskColors =
                  scan.risk_label === 'High'
                    ? Colors.riskHigh
                    : scan.risk_label === 'Moderate'
                    ? Colors.riskModerate
                    : Colors.riskLow;

                return (
                  <View key={scan.id} style={styles.recentScanCard}>
                    {/* Thumbnail */}
                    {scan.product_image_url ? (
                      <Image
                        source={{uri: scan.product_image_url}}
                        style={styles.recentScanImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.recentScanImagePlaceholder}>
                        <Text style={{fontSize: 24}}>📦</Text>
                      </View>
                    )}
                    {/* Name */}
                    <Text style={styles.recentScanName} numberOfLines={2}>
                      {scan.product_name || 'Unknown'}
                    </Text>
                    {/* Score pill */}
                    <View
                      style={[
                        styles.recentScanScorePill,
                        {backgroundColor: riskColors.bg},
                      ]}>
                      <Text
                        style={[
                          styles.recentScanScoreText,
                          {color: riskColors.text},
                        ]}>
                        {Math.round(parseFloat(scan.normalized_score))}/100
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
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

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.md,
  },
  cardTitle: {
    ...Typography.h2,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  seeAllText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
  },

  // Gauge
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  latestProductName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.secondaryText,
    marginTop: Spacing.sm,
  },
  viewDetailsButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  viewDetailsButtonDisabled: {
    opacity: 0.5,
  },
  viewDetailsText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },
  viewDetailsTextDisabled: {
    color: Colors.lightText,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    ...Shadow.sm,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  quickActionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.darkText,
  },

  // Empty Scans
  emptyScansContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },

  // Recent Scans Horizontal List
  recentScansScroll: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  recentScanCard: {
    width: 120,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  recentScanImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  recentScanImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  recentScanName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.darkText,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  recentScanScorePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  recentScanScoreText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
  },
});

export default HomeScreen;
