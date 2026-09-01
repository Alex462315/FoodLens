/**
 * HistoryScreen — Scan History with real data from ScoredResult.
 *
 * Displays a reverse-chronological list of past scans with:
 *   - Product image thumbnail
 *   - Product name
 *   - Scan timestamp (relative)
 *   - Color-coded score badge
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {RiskBadge} from '../components';
import {getScanHistory, ScanHistoryItem} from '../services/scoringService';

/**
 * Format ISO date to a human-friendly relative string.
 */
const formatRelativeDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const HistoryScreen: React.FC = () => {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await getScanHistory();
      setScans(data);
    } catch (err: any) {
      setError('Could not load scan history.');
      console.error('History fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-fetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(true);
  };

  const renderScanItem = ({item}: {item: ScanHistoryItem}) => {
    const score = parseFloat(item.normalized_score);
    const riskColors =
      item.risk_label === 'High'
        ? Colors.riskHigh
        : item.risk_label === 'Moderate'
        ? Colors.riskModerate
        : Colors.riskLow;

    return (
      <View style={styles.scanCard}>
        {/* Product Image */}
        <View style={styles.thumbnailContainer}>
          {item.product_image_url ? (
            <Image
              source={{uri: item.product_image_url}}
              style={styles.thumbnail}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailPlaceholderText}>📦</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.scanInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.product_name || 'Unknown Product'}
          </Text>
          <Text style={styles.scanDate}>
            {formatRelativeDate(item.created_at)}
          </Text>
          {item.has_allergen_warning && (
            <Text style={styles.allergenWarning}>⚠️ Allergen detected</Text>
          )}
        </View>

        {/* Score Badge */}
        <View style={styles.scoreBadgeContainer}>
          <View
            style={[
              styles.scoreBadge,
              {backgroundColor: riskColors.bg},
            ]}>
            <Text
              style={[
                styles.scoreBadgeText,
                {color: riskColors.text},
              ]}>
              {Math.round(score)}
            </Text>
          </View>
          <RiskBadge level={item.risk_label.toLowerCase() as any} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
        <Text style={styles.headerSubtitle}>
          {scans.length > 0
            ? `${scans.length} scan${scans.length > 1 ? 's' : ''}`
            : 'Your past scans will appear here'}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchHistory()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptyText}>
            Scan a product barcode to see your history here
          </Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={item => item.id.toString()}
          renderItem={renderScanItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primaryGreen]}
              tintColor={Colors.primaryGreen}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
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
    marginTop: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },

  // Scan Card
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  thumbnail: {
    width: 56,
    height: 56,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGreenBg,
  },
  thumbnailPlaceholderText: {
    fontSize: 24,
  },
  scanInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  productName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  scanDate: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    marginTop: 2,
  },
  allergenWarning: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    color: Colors.redDark,
    marginTop: 2,
  },

  // Score Badge
  scoreBadgeContainer: {
    alignItems: 'center',
    gap: 4,
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
  },

  // Center states
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
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
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: Colors.white,
  },
});

export default HistoryScreen;
