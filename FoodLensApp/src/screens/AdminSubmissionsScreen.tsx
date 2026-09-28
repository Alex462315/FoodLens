/**
 * AdminSubmissionsScreen — Admin-only screen to review, approve, or reject
 * community-submitted products.
 *
 * Endpoint: GET  /api/admin/submissions/?status=pending
 *           POST /api/admin/submissions/<id>/approve/
 *           POST /api/admin/submissions/<id>/reject/
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import apiClient from '../services/apiClient';

type Submission = {
  id: number;
  submitted_by: string;
  product_name: string;
  brand: string;
  barcode: string;
  ingredients_text: string;
  nutrition_data: any;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const AdminSubmissionsScreen: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const url = filter === 'all'
        ? '/admin/submissions/'
        : `/admin/submissions/?status=${filter}`;
      const res = await apiClient.get(url);
      setSubmissions(res.data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to load submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchSubmissions();
  }, [fetchSubmissions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissions();
  };

  const handleApprove = async (id: number) => {
    Alert.alert(
      'Approve Submission',
      'Are you sure you want to approve this product submission?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading(id);
            try {
              await apiClient.post(`/admin/submissions/${id}/approve/`);
              Alert.alert('✅ Approved', 'Product submission has been approved.');
              fetchSubmissions();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to approve');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for rejection.');
      return;
    }
    setActionLoading(id);
    try {
      await apiClient.post(`/admin/submissions/${id}/reject/`, {
        admin_notes: rejectReason.trim(),
      });
      Alert.alert('❌ Rejected', 'Product submission has been rejected.');
      setRejectReason('');
      setExpandedId(null);
      fetchSubmissions();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '⏳';
    }
  };

  const filters: FilterStatus[] = ['pending', 'approved', 'rejected', 'all'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Community Submissions</Text>
        <Text style={styles.headerSubtitle}>
          Review and manage user-submitted products
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}>
            <Text
              style={[
                styles.filterTabText,
                filter === f && styles.filterTabTextActive,
              ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading submissions...</Text>
        </View>
      ) : submissions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Submissions</Text>
          <Text style={styles.emptyText}>
            No {filter !== 'all' ? filter : ''} submissions found.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {submissions.map(sub => {
            const isExpanded = expandedId === sub.id;
            const isPending = sub.status === 'pending';

            return (
              <TouchableOpacity
                key={sub.id}
                style={styles.card}
                onPress={() => setExpandedId(isExpanded ? null : sub.id)}
                activeOpacity={0.7}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.productName}>{sub.product_name}</Text>
                    {sub.brand ? (
                      <Text style={styles.brandText}>{sub.brand}</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {backgroundColor: getStatusColor(sub.status) + '20'},
                    ]}>
                    <Text style={styles.statusIcon}>
                      {getStatusIcon(sub.status)}
                    </Text>
                    <Text
                      style={[
                        styles.statusText,
                        {color: getStatusColor(sub.status)},
                      ]}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Meta Info */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    👤 {sub.submitted_by} · 📅 {formatDate(sub.created_at)}
                  </Text>
                </View>

                {sub.barcode ? (
                  <Text style={styles.barcodeText}>
                    🔢 Barcode: {sub.barcode}
                  </Text>
                ) : null}

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <Text style={styles.sectionLabel}>Ingredients:</Text>
                    <Text style={styles.ingredientsText}>
                      {sub.ingredients_text}
                    </Text>

                    {sub.nutrition_data &&
                      Object.keys(sub.nutrition_data).length > 0 && (
                        <View>
                          <Text style={styles.sectionLabel}>Nutrition:</Text>
                          {sub.nutrition_data.energy_kcal && (
                            <Text style={styles.nutritionItem}>
                              🔥 Calories: {sub.nutrition_data.energy_kcal} kcal
                            </Text>
                          )}
                          {sub.nutrition_data.fat && (
                            <Text style={styles.nutritionItem}>
                              🧈 Fat: {sub.nutrition_data.fat}g
                            </Text>
                          )}
                          {sub.nutrition_data.sugars && (
                            <Text style={styles.nutritionItem}>
                              🍬 Sugar: {sub.nutrition_data.sugars}g
                            </Text>
                          )}
                          {sub.nutrition_data.salt && (
                            <Text style={styles.nutritionItem}>
                              🧂 Salt: {sub.nutrition_data.salt}g
                            </Text>
                          )}
                        </View>
                      )}

                    {sub.notes ? (
                      <View>
                        <Text style={styles.sectionLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{sub.notes}</Text>
                      </View>
                    ) : null}

                    {sub.admin_notes ? (
                      <View style={styles.adminNotesBox}>
                        <Text style={styles.sectionLabel}>Admin Notes:</Text>
                        <Text style={styles.adminNotesText}>
                          {sub.admin_notes}
                        </Text>
                        {sub.reviewed_by && (
                          <Text style={styles.reviewedByText}>
                            Reviewed by {sub.reviewed_by} ·{' '}
                            {sub.reviewed_at ? formatDate(sub.reviewed_at) : ''}
                          </Text>
                        )}
                      </View>
                    ) : null}

                    {/* Action Buttons (only for pending) */}
                    {isPending && (
                      <View style={styles.actionSection}>
                        {actionLoading === sub.id ? (
                          <ActivityIndicator
                            size="small"
                            color={Colors.primaryGreen}
                          />
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.approveButton}
                              onPress={() => handleApprove(sub.id)}>
                              <Text style={styles.approveButtonText}>
                                ✅ Approve
                              </Text>
                            </TouchableOpacity>

                            <TextInput
                              style={styles.rejectInput}
                              placeholder="Reason for rejection..."
                              placeholderTextColor={Colors.lightText}
                              value={expandedId === sub.id ? rejectReason : ''}
                              onChangeText={setRejectReason}
                            />

                            <TouchableOpacity
                              style={styles.rejectButton}
                              onPress={() => handleReject(sub.id)}>
                              <Text style={styles.rejectButtonText}>
                                ❌ Reject
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Expand Indicator */}
                <Text style={styles.expandIndicator}>
                  {isExpanded ? '▲ Collapse' : '▼ Tap to review'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
    padding: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
  },
  filterTabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: Spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  listContainer: {
    padding: Spacing.base,
    paddingTop: Spacing.xs,
  },
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
    marginBottom: Spacing.xs,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  productName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
  },
  brandText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
  },
  metaRow: {
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
  },
  barcodeText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginBottom: Spacing.xs,
  },
  expandedSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: Colors.darkText,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  ingredientsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    lineHeight: 22,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  nutritionItem: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    marginLeft: Spacing.sm,
    marginBottom: 2,
  },
  notesText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    fontStyle: 'italic',
  },
  adminNotesBox: {
    backgroundColor: '#FFF3E0',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  adminNotesText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: '#E65100',
  },
  reviewedByText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    marginTop: 4,
  },
  actionSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  approveButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: '#FFFFFF',
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    backgroundColor: Colors.background,
  },
  rejectButton: {
    backgroundColor: '#F44336',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: '#FFFFFF',
  },
  expandIndicator: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default AdminSubmissionsScreen;
