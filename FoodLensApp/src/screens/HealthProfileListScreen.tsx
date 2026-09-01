/**
 * HealthProfileListScreen — Shows all user's health profiles
 * with create, edit, and delete functionality.
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {
  HealthProfile,
  getHealthProfiles,
  deleteHealthProfile,
} from '../services/healthProfileService';

interface HealthProfileListScreenProps {
  navigation: any;
}

const HealthProfileListScreen: React.FC<HealthProfileListScreenProps> = ({
  navigation,
}) => {
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      const data = await getHealthProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [fetchProfiles]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const handleDelete = (profile: HealthProfile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${profile.profile_name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHealthProfile(profile.id);
              setProfiles(prev => prev.filter(p => p.id !== profile.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete profile.');
            }
          },
        },
      ],
    );
  };

  const renderProfileCard = ({item}: {item: HealthProfile}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('HealthProfileForm', {
          mode: 'edit',
          profile: item,
        })
      }
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.profile_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.profile_name}</Text>
            <Text style={styles.cardRelation}>
              {item.relation} · {item.age} yrs · {item.gender}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteButton}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Health Info */}
      <View style={styles.cardBody}>
        {item.height_cm || item.weight_kg ? (
          <View style={styles.metricsRow}>
            {item.height_cm ? (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Height</Text>
                <Text style={styles.metricValue}>{item.height_cm} cm</Text>
              </View>
            ) : null}
            {item.weight_kg ? (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Weight</Text>
                <Text style={styles.metricValue}>{item.weight_kg} kg</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {item.conditions.length > 0 ? (
          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>Conditions</Text>
            <View style={styles.tagsRow}>
              {item.conditions.map((c: any, i: number) => {
                const name = typeof c === 'string' ? c : c.condition_name;
                const severity = typeof c === 'string' ? 'moderate' : (c.severity || 'moderate');
                const formattedSeverity = severity.charAt(0).toUpperCase() + severity.slice(1);
                return (
                  <View key={i} style={styles.tagChip}>
                    <Text style={styles.tagText}>{name} ({formattedSeverity})</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {item.allergies.length > 0 ? (
          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>Allergies</Text>
            <View style={styles.tagsRow}>
              {item.allergies.map((a, i) => (
                <View key={i} style={[styles.tagChip, styles.allergyChip]}>
                  <Text style={[styles.tagText, styles.allergyText]}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👤</Text>
      <Text style={styles.emptyTitle}>No Health Profiles Yet</Text>
      <Text style={styles.emptyDescription}>
        Add a health profile to get personalized food analysis and risk scores.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Profiles</Text>
        <Text style={styles.headerSubtitle}>
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProfileCard}
        contentContainerStyle={[
          styles.listContent,
          profiles.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primaryGreen]}
          />
        }
      />

      {/* FAB — Add Profile */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('HealthProfileForm', {mode: 'create'})
        }
        activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.secondaryText,
    marginTop: Spacing.xs,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lightGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.primaryGreen,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
  },
  cardRelation: {
    ...Typography.caption,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  deleteIcon: {
    fontSize: 18,
  },

  // Card Body
  cardBody: {
    marginTop: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  metric: {
    marginRight: Spacing.xl,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.secondaryText,
  },
  metricValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.darkText,
    marginTop: 2,
  },

  // Tags
  tagsSection: {
    marginBottom: Spacing.sm,
  },
  tagsLabel: {
    ...Typography.caption,
    color: Colors.secondaryText,
    marginBottom: Spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: Colors.lightGreenBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tagText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
  },
  allergyChip: {
    backgroundColor: Colors.redBg,
  },
  allergyText: {
    color: Colors.redDark,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
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
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.xl,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.white,
    lineHeight: 30,
  },
});

export default HealthProfileListScreen;
