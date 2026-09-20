/**
 * AdminUsersScreen — Admin user management.
 *
 * Shows all registered users with details (username, email, role, join date,
 * scan count) and allows staff users to delete non-staff accounts.
 *
 * Safety: cannot delete yourself or other staff users (enforced by backend too).
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import apiClient from '../services/apiClient';
import {useAuth} from '../context/AuthContext';

interface UserData {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  scan_count: number;
}

const AdminUsersScreen: React.FC = () => {
  const {user: currentUser} = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<UserData[]>('/admin/users/');
      setUsers(res.data);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('Admin access required.');
      } else {
        setError('Could not load users.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, []),
  );

  const handleDeleteUser = (targetUser: UserData) => {
    if (targetUser.id === currentUser?.id) {
      Alert.alert('Cannot Delete', 'You cannot delete your own account.');
      return;
    }
    if (targetUser.is_staff) {
      Alert.alert('Cannot Delete', 'Cannot delete another admin/staff user.');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to permanently delete "${targetUser.username}" (${targetUser.email})?\n\nThis will remove all their data including health profiles, scan history, and scores.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/admin/users/${targetUser.id}/`);
              // Remove from local state
              setUsers(prev => prev.filter(u => u.id !== targetUser.id));
              Alert.alert('Deleted', `User "${targetUser.username}" has been deleted.`);
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.detail ?? 'Failed to delete user.',
              );
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>ADMIN</Text>
        </View>
        <Text style={styles.headerTitle}>👥 User Management</Text>
        <Text style={styles.headerSubtitle}>
          {users.length} registered user{users.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading users…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>🔒</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchUsers(true)}
              tintColor={Colors.primaryGreen}
              colors={[Colors.primaryGreen]}
            />
          }>
          {users.map(u => {
            const isSelf = u.id === currentUser?.id;
            const canDelete = !isSelf && !u.is_staff;

            return (
              <View key={u.id} style={styles.userCard}>
                {/* Top Row: Avatar + Name */}
                <View style={styles.userTopRow}>
                  <View style={[styles.avatar, u.is_staff && styles.avatarStaff]}>
                    <Text style={styles.avatarText}>
                      {u.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.username}>{u.username}</Text>
                      {u.is_staff && (
                        <View style={styles.staffBadge}>
                          <Text style={styles.staffBadgeText}>ADMIN</Text>
                        </View>
                      )}
                      {isSelf && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>YOU</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.email}>{u.email}</Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>📦</Text>
                    <Text style={styles.statValue}>{u.scan_count}</Text>
                    <Text style={styles.statLabel}>Scans</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>📅</Text>
                    <Text style={styles.statValue}>{formatDate(u.date_joined)}</Text>
                    <Text style={styles.statLabel}>Joined</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>🔑</Text>
                    <Text style={styles.statValue}>
                      {u.last_login ? formatDate(u.last_login) : 'Never'}
                    </Text>
                    <Text style={styles.statLabel}>Last Login</Text>
                  </View>
                </View>

                {/* Delete Button */}
                {canDelete && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteUser(u)}
                    activeOpacity={0.7}>
                    <Text style={styles.deleteBtnText}>🗑️ Delete User</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <View style={{height: Spacing.xl}} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl},

  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6366F1',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: Spacing.sm,
  },
  headerBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
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

  scroll: {paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl']},
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: Spacing.sm,
  },
  errorIcon: {fontSize: 48, marginBottom: Spacing.md},
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },

  // User Card
  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  userTopRow: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryGreen + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarStaff: {backgroundColor: '#6366F1' + '20'},
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.primaryGreen,
  },
  userInfo: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  username: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  staffBadge: {
    backgroundColor: '#6366F1',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  staffBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  youBadge: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  youBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {fontSize: 16, marginBottom: 2},
  statValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    color: Colors.darkText,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondaryText,
    marginTop: 1,
  },

  // Delete
  deleteBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: '#EF4444',
  },
});

export default AdminUsersScreen;
