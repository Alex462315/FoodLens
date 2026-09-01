/**
 * ProductResultScreen — Displays real product data + personalized health risk score.
 *
 * End-to-end flow:
 *   1. Show product info (image, name, brand, barcode) from Open Food Facts
 *   2. Fetch user's health profiles
 *   3. Parse ingredients_text → matched ingredients
 *   4. Compute personalized score against selected profile
 *   5. Display HealthRiskScoreGauge + RiskBadge + allergen warning banner
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Share,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography, FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {PrimaryButton, HealthRiskScoreGauge, RiskBadge} from '../components';
import {getRiskLevel} from '../components/RiskBadge';
import {
  ProductLookupResult,
  lookupProductByBarcode,
} from '../services/productService';
import {
  HealthProfile,
  getHealthProfiles,
} from '../services/healthProfileService';
import {
  ComputeScoreResponse,
  scoreProduct,
} from '../services/scoringService';

const ProductResultScreen = ({navigation, route}: any) => {
  const {barcode, initialResult} = route.params as {
    barcode: string;
    initialResult?: ProductLookupResult;
  };

  // Product state
  const [result, setResult] = useState<ProductLookupResult | null>(
    initialResult || null,
  );
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState<string | null>(null);

  // Scoring state
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [scoreResult, setScoreResult] = useState<ComputeScoreResponse | null>(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);


  // Fetch product on mount
  useEffect(() => {
    if (!initialResult && barcode) {
      fetchProduct();
    }
  }, [barcode, initialResult]);

  // Fetch profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  // Auto-score when product + profile are both ready
  useEffect(() => {
    if (result?.found && result.ingredients_text && selectedProfileId) {
      computeProductScore(result.ingredients_text, selectedProfileId);
    }
  }, [result, selectedProfileId]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lookupProductByBarcode(barcode);
      setResult(data);
    } catch (err: any) {
      console.error('Failed to lookup product:', err);
      const msg =
        err.response?.data?.error ||
        'Could not lookup product. Please check your connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const data = await getHealthProfiles();
      setProfiles(data);
      // Auto-select first profile (usually "self")
      if (data.length > 0 && !selectedProfileId) {
        setSelectedProfileId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    }
  };

  const computeProductScore = async (ingredientsText: string, profileId: number) => {
    setScoringLoading(true);
    setScoringError(null);
    setScoreResult(null);
    try {
      const scoreData = await scoreProduct(ingredientsText, profileId, {
        barcode: barcode,
        product_name: result?.name || '',
        product_image_url: result?.image_url || '',
      });
      setScoreResult(scoreData);
    } catch (err: any) {
      console.error('Scoring failed:', err);
      setScoringError(
        err.response?.data?.error || 'Could not compute health score.',
      );
    } finally {
      setScoringLoading(false);
    }
  };

  const handleProfileSelect = (profileId: number) => {
    setSelectedProfileId(profileId);
    // Score will auto-recompute via useEffect
  };

  const handleScanAgain = () => {
    navigation.navigate('ScanScreen');
  };

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.primaryGreen} />
          <Text style={styles.loadingText}>
            Looking up barcode {barcode}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.centeredContainer}>
          <Text style={styles.iconEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Lookup Failed</Text>
          <Text style={styles.errorDescription}>{error}</Text>
          <PrimaryButton
            title="Try Again"
            onPress={fetchProduct}
            style={styles.actionButton}
          />
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={handleScanAgain}>
            <Text style={styles.secondaryLinkText}>Scan Different Barcode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Not Found State ---
  if (!result || !result.found) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ScrollView contentContainerStyle={styles.centeredContainer}>
          <Text style={styles.iconEmoji}>📦</Text>
          <Text style={styles.notFoundTitle}>Product Not Found</Text>
          <Text style={styles.notFoundDescription}>
            We couldn't find a product matching barcode{' '}
            <Text style={styles.boldBarcode}>{barcode}</Text> in our database
            yet.
          </Text>

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerIcon}>💡</Text>
            <Text style={styles.infoBannerText}>
              FoodLens connects to Open Food Facts. Regional or new products
              might not be registered yet.
            </Text>
          </View>

          <PrimaryButton
            title="Scan Again"
            onPress={handleScanAgain}
            style={styles.actionButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Found State ---
  const normalizedScore = scoreResult
    ? Math.round(parseFloat(scoreResult.normalized_score))
    : null;
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageCard}>
          {result.image_url ? (
            <Image
              source={{uri: result.image_url}}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>🥫</Text>
            </View>
          )}
        </View>

        {/* Product Name & Brand */}
        <View style={styles.detailsCard}>
          <Text style={styles.brandName}>{result.brand || 'Unknown Brand'}</Text>
          <Text style={styles.productName}>{result.name}</Text>
          <Text style={styles.barcodeText}>Barcode: {result.barcode}</Text>

          {/* Badges if available */}
          {(result.nutriscore_grade || result.allergens) ? (
            <View style={styles.badgeRow}>
              {result.nutriscore_grade ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>
                    Nutri-Score: {result.nutriscore_grade.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ============================================================ */}
        {/* HEALTH RISK SCORE SECTION — The core feature of FoodLens     */}
        {/* ============================================================ */}

        {/* Profile Selector */}
        {profiles.length > 0 && (
          <View style={styles.profileSelector}>
            <Text style={styles.profileSelectorLabel}>Scoring for:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.profileChipsContainer}>
              {profiles.map(profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.profileChip,
                    selectedProfileId === profile.id && styles.profileChipActive,
                  ]}
                  onPress={() => handleProfileSelect(profile.id)}>
                  <Text
                    style={[
                      styles.profileChipText,
                      selectedProfileId === profile.id &&
                        styles.profileChipTextActive,
                    ]}>
                    {profile.profile_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Score Display */}
        {result.ingredients_text ? (
          <View style={styles.scoreCard}>
            {scoringLoading ? (
              <View style={styles.scoreLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.primaryGreen} />
                <Text style={styles.scoreLoadingText}>
                  Analyzing ingredients...
                </Text>
              </View>
            ) : scoringError ? (
              <View style={styles.scoreErrorContainer}>
                <Text style={styles.scoreErrorIcon}>⚠️</Text>
                <Text style={styles.scoreErrorText}>{scoringError}</Text>
                <TouchableOpacity
                  onPress={() =>
                    selectedProfileId &&
                    computeProductScore(
                      result.ingredients_text!,
                      selectedProfileId,
                    )
                  }>
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : scoreResult && normalizedScore !== null ? (
              <>
                {/* Gauge + Risk Badge */}
                <Text style={styles.scoreCardTitle}>
                  Health Risk Score
                </Text>
                {selectedProfile && (
                  <Text style={styles.scoringForText}>
                    Personalized for {selectedProfile.profile_name}
                    {selectedProfile.conditions.length > 0
                      ? ` (${selectedProfile.conditions
                          .map(c => c.condition_name)
                          .join(', ')})`
                      : ''}
                  </Text>
                )}

                <View style={styles.gaugeContainer}>
                  <HealthRiskScoreGauge
                    score={normalizedScore}
                    size={160}
                    strokeWidth={14}
                    showLabel={true}
                    overrideRiskLevel={
                      scoreResult.has_allergen_warning
                        ? 'high'
                        : scoreResult.ingredient_breakdown.length > 0 &&
                          scoreResult.ingredient_breakdown.filter(i => i.matched_name !== null).length === 0
                        ? 'unknown'
                        : undefined
                    }
                  />
                </View>

                <View style={styles.riskBadgeContainer}>
                  <RiskBadge
                    level={
                      scoreResult.has_allergen_warning
                        ? 'high'
                        : scoreResult.ingredient_breakdown.length > 0 &&
                          scoreResult.ingredient_breakdown.filter(i => i.matched_name !== null).length === 0
                        ? 'unknown'
                        : getRiskLevel(normalizedScore)
                    }
                  />
                </View>

                {/* Match stats */}
                <Text style={styles.matchStatsText}>
                  {scoreResult.ingredient_breakdown.filter(
                    i => i.matched_name !== null,
                  ).length}{' '}
                  of {scoreResult.ingredient_breakdown.length} ingredients
                  recognized
                </Text>
              </>
            ) : profiles.length === 0 ? (
              <View style={styles.noProfileContainer}>
                <Text style={styles.noProfileIcon}>👤</Text>
                <Text style={styles.noProfileTitle}>No Health Profile</Text>
                <Text style={styles.noProfileText}>
                  Create a health profile to get personalized risk scoring.
                </Text>
                <PrimaryButton
                  title="Create Profile"
                  onPress={() => navigation.navigate('Profile')}
                  style={styles.createProfileButton}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.noIngredientsCard}>
            <Text style={styles.noIngredientsIcon}>🔍</Text>
            <Text style={styles.noIngredientsTitle}>
              No Ingredients Data
            </Text>
            <Text style={styles.noIngredientsText}>
              This product doesn't have ingredient information in Open Food
              Facts. Scoring is not available.
            </Text>
          </View>
        )}

        {/* Allergen Warning Banner */}
        {scoreResult?.has_allergen_warning && (
          <View style={styles.allergenBanner}>
            <Text style={styles.allergenBannerIcon}>🚨</Text>
            <View style={styles.allergenBannerContent}>
              <Text style={styles.allergenBannerTitle}>
                Allergen Warning
              </Text>
              <Text style={styles.allergenBannerText}>
                This product contains ingredients that match your allergen
                profile:{' '}
                <Text style={styles.allergenNames}>
                  {scoreResult.allergen_details.join(', ')}
                </Text>
              </Text>
            </View>
          </View>
        )}

        {/* Coverage / Unmatched Warning Banner */}
        {scoreResult &&
          scoreResult.ingredient_breakdown.length > 0 &&
          scoreResult.ingredient_breakdown.filter(i => i.matched_name !== null).length === 0 && (
            <View style={styles.coverageWarningBanner}>
              <Text style={styles.coverageWarningIcon}>⚠️</Text>
              <View style={styles.coverageWarningContent}>
                <Text style={styles.coverageWarningTitle}>
                  Unrecognized Ingredients
                </Text>
                <Text style={styles.coverageWarningText}>
                  The database text for this product ("{result.ingredients_text}") could not be matched to known food ingredients. Risk score cannot be calculated reliably.
                </Text>
              </View>
            </View>
          )}

        {/* Ingredients Breakdown List */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Ingredients Breakdown</Text>

          {scoreResult && scoreResult.ingredient_breakdown.length > 0 ? (
            <View style={styles.ingredientChipsContainer}>
              {scoreResult.ingredient_breakdown.map((item, index) => {
                const isMatched = item.matched_name !== null;
                return (
                  <View
                    key={index}
                    style={[
                      styles.ingredientChip,
                      isMatched ? styles.ingredientChipMatched : styles.ingredientChipUnmatched,
                    ]}>
                    <Text style={styles.ingredientChipIcon}>
                      {isMatched ? '✅' : '❓'}
                    </Text>
                    <View style={styles.ingredientChipContent}>
                      <Text style={styles.ingredientChipName}>
                        {isMatched ? item.matched_name : item.raw_token}
                      </Text>
                      <Text style={styles.ingredientChipSubtext}>
                        {isMatched
                          ? `${item.category || 'ingredient'} · Risk ${Math.round(parseFloat(item.adjusted_score))}/10`
                          : 'Not in database'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : result.ingredients_text ? (
            <Text style={styles.ingredientsText}>
              {result.ingredients_text}
            </Text>
          ) : (
            <Text style={styles.emptyIngredientsText}>
              No ingredient list available for this product in Open Food Facts.
            </Text>
          )}
        </View>

        {/* Nutrition Facts Card */}
        {result.nutrition && result.nutrition.energy_kcal != null && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>🔥 Nutrition Facts</Text>
            <Text style={styles.nutritionSubtitle}>Per 100g{result.serving_size ? ` · Serving: ${result.serving_size}` : ''}</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(result.nutrition.energy_kcal)}
                </Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              {result.nutrition.proteins != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.proteins).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
              )}
              {result.nutrition.carbohydrates != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.carbohydrates).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
              )}
              {result.nutrition.fat != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.fat).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              )}
              {result.nutrition.sugars != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.sugars).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Sugars</Text>
                </View>
              )}
              {result.nutrition.fiber != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.fiber).toFixed(1)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fiber</Text>
                </View>
              )}
              {result.nutrition.salt != null && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {Number(result.nutrition.salt).toFixed(2)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Salt</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* AI Explanation Button */}
        {scoreResult && scoreResult.scored_result_id && (
          <TouchableOpacity
            style={styles.aiExplanationButton}
            onPress={() =>
              navigation.navigate('AIExplanationScreen', {
                scoredResultId: scoreResult.scored_result_id,
                productName: result?.name || 'this product',
                riskLabel: scoreResult.risk_label,
              })
            }
            activeOpacity={0.7}>
            <Text style={styles.aiExplanationIcon}>🤖</Text>
            <View style={styles.aiExplanationTextContainer}>
              <Text style={styles.aiExplanationTitle}>
                View AI Explanation
              </Text>
              <Text style={styles.aiExplanationSubtitle}>
                Get a plain-language summary of this score
              </Text>
            </View>
            <Text style={styles.aiExplanationArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Share Button */}
        {scoreResult && result && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={async () => {
              const riskEmoji =
                scoreResult.risk_label === 'High' ? '🔴'
                : scoreResult.risk_label === 'Moderate' ? '🟡' : '🟢';
              const score = Math.round(scoreResult.normalized_score);
              const allergenNote = scoreResult.has_allergen_warning
                ? '\n🚨 Allergen Warning: ' + scoreResult.allergen_details.join(', ')
                : '';
              await Share.share({
                title: `FoodLens — ${result.name || 'Product'} Health Score`,
                message:
                  `${riskEmoji} FoodLens Health Score for "${result.name || 'Product'}"\n` +
                  `Score: ${score}/100 — ${scoreResult.risk_label} Risk${allergenNote}\n\n` +
                  `Scanned with FoodLens — AI-Powered Ingredient Safety Checker`,
              });
            }}
            activeOpacity={0.7}>
            <Text style={styles.shareIcon}>📤</Text>
            <View style={styles.shareTextContainer}>
              <Text style={styles.shareTitle}>Share This Result</Text>
              <Text style={styles.shareSubtitle}>Send score to family, doctor or dietitian</Text>
            </View>
            <Text style={styles.shareArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Action Button */}
        <PrimaryButton
          title="Scan Another Product"
          onPress={handleScanAgain}
          style={styles.actionButton}
        />

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
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },

  // Centered screens (loading / error / not found)
  centeredContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  iconEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  notFoundTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  notFoundDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  boldBarcode: {
    fontFamily: FontFamily.semiBold,
    color: Colors.darkText,
  },
  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: Colors.redDark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGreenBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: 'flex-start',
  },
  infoBannerIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
    lineHeight: 18,
  },

  // Product Image Card
  imageCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 64,
  },

  // Product Details Card
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  brandName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  barcodeText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.lightText,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.lightGreenBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  badgeLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
  },

  // ==========================================
  // Profile Selector
  // ==========================================
  profileSelector: {
    marginBottom: Spacing.md,
  },
  profileSelectorLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    marginBottom: Spacing.xs,
  },
  profileChipsContainer: {
    paddingVertical: Spacing.xs,
  },
  profileChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  profileChipActive: {
    borderColor: Colors.primaryGreen,
    backgroundColor: Colors.lightGreenBg,
  },
  profileChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  profileChipTextActive: {
    color: Colors.primaryGreen,
  },

  // ==========================================
  // Score Card
  // ==========================================
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  scoreCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: 4,
  },
  scoringForText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  gaugeContainer: {
    marginVertical: Spacing.md,
  },
  riskBadgeContainer: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  matchStatsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    textAlign: 'center',
  },

  // Score Loading
  scoreLoadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  scoreLoadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: Spacing.md,
  },

  // Score Error
  scoreErrorContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  scoreErrorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  scoreErrorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.redDark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  retryText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },

  // No Profile
  noProfileContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  noProfileIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  noProfileTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  noProfileText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  createProfileButton: {
    width: '80%',
  },

  // No Ingredients
  noIngredientsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  noIngredientsIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  noIngredientsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  noIngredientsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ==========================================
  // Allergen Warning Banner
  // ==========================================
  allergenBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.redBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.red,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  allergenBannerIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  allergenBannerContent: {
    flex: 1,
  },
  allergenBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.subtitle,
    color: Colors.redDark,
    marginBottom: 4,
  },
  allergenBannerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.redDark,
    lineHeight: 20,
  },
  allergenNames: {
    fontFamily: FontFamily.bold,
    color: Colors.redDark,
  },

  // Section Headers
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  ingredientsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    lineHeight: 22,
  },
  emptyIngredientsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    fontStyle: 'italic',
  },

  // Action Button & Links
  actionButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
  },

  // AI Explanation Button
  aiExplanationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGreen,
  },
  aiExplanationIcon: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  aiExplanationTextContainer: {
    flex: 1,
  },
  aiExplanationTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },
  aiExplanationSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  aiExplanationArrow: {
    fontSize: 28,
    color: Colors.primaryGreen,
    fontWeight: 'bold',
  },

  secondaryLink: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
  },
  secondaryLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.primaryGreen,
  },

  // Nutrition Facts
  nutritionSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    marginBottom: Spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  nutritionItem: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 80,
  },
  nutritionValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h2,
    color: Colors.primaryGreen,
  },
  nutritionLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },

  // Coverage Warning Banner
  coverageWarningBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.amberBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.amberDark,
  },
  coverageWarningIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  coverageWarningContent: {
    flex: 1,
  },
  coverageWarningTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.amberDark,
    marginBottom: 2,
  },
  coverageWarningText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.darkText,
    lineHeight: 18,
  },

  // Ingredient Chips Breakdown
  ingredientChipsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  ingredientChipMatched: {
    backgroundColor: Colors.lightGreenBg,
    borderColor: Colors.lightGreen,
  },
  ingredientChipUnmatched: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  ingredientChipIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  ingredientChipContent: {
    flex: 1,
  },
  ingredientChipName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  ingredientChipSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 1,
  },

  // Share Button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    ...Shadow.sm,
  },
  shareIcon: {fontSize: 24, marginRight: Spacing.md},
  shareTextContainer: {flex: 1},
  shareTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  shareSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  shareArrow: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.lightText,
  },
});

export default ProductResultScreen;
