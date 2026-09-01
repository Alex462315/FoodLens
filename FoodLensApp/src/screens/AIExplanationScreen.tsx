/**
 * AIExplanationScreen — Displays the AI-generated plain-language explanation
 * of a scan's health risk score.
 *
 * Layout: Chat-bubble style card with explanation text, loading/error states,
 * and thumbs-up/thumbs-down feedback buttons.
 *
 * Architecture rule: The LLM only phrases pre-verified scoring data.
 * This screen only displays the result — no health claims are generated here.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius, Shadow} from '../theme/spacing';
import {
  generateExplanation,
  submitFeedback,
  ExplanationResponse,
} from '../services/explanationService';

const AIExplanationScreen = ({navigation, route}: any) => {
  const {scoredResultId, productName, riskLabel} = route.params as {
    scoredResultId: number;
    productName?: string;
    riskLabel?: string;
  };

  // State
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<
    'none' | 'helpful' | 'not_helpful'
  >('none');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Fetch explanation on mount
  const fetchExplanation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateExplanation(scoredResultId);
      setExplanation(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        "Couldn't generate an explanation right now. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [scoredResultId]);

  useEffect(() => {
    fetchExplanation();
  }, [fetchExplanation]);

  // Handle feedback submission
  const handleFeedback = async (isHelpful: boolean) => {
    if (!explanation) return;

    const newState = isHelpful ? 'helpful' : 'not_helpful';

    // If tapping the same button again, do nothing
    if (
      (feedbackState === 'helpful' && isHelpful) ||
      (feedbackState === 'not_helpful' && !isHelpful)
    ) {
      return;
    }

    setFeedbackLoading(true);
    try {
      await submitFeedback(explanation.id, isHelpful);
      setFeedbackState(newState);
    } catch (err) {
      // Silently fail — feedback is non-critical
      console.warn('Feedback submission failed:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.background}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🤖</Text>
          <Text style={styles.headerTitle}>AI Explanation</Text>
          {productName ? (
            <Text style={styles.headerSubtitle}>for {productName}</Text>
          ) : null}
        </View>

        {/* Main Content */}
        {loading ? (
          // Loading state
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primaryGreen} />
            <Text style={styles.loadingTitle}>Generating explanation...</Text>
            <Text style={styles.loadingSubtext}>
              Our AI is analyzing your scan results and writing a personalized
              summary. This may take a few seconds.
            </Text>
          </View>
        ) : error ? (
          // Error state
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchExplanation}
              activeOpacity={0.7}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : explanation ? (
          // Success state — Chat bubble
          <>
            <View style={styles.chatBubble}>
              <View style={styles.chatBubbleHeader}>
                <Text style={styles.chatBubbleAvatar}>✨</Text>
                <View>
                  <Text style={styles.chatBubbleName}>FoodLens AI</Text>
                  <Text style={styles.chatBubbleModel}>
                    Powered by {explanation.llm_model_used}
                  </Text>
                </View>
              </View>
              <Text style={styles.explanationText}>
                {explanation.explanation_text}
              </Text>
              <View style={styles.chatBubbleTail} />
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerContainer}>
              <Text style={styles.disclaimerText}>
                ℹ️ This explanation is based entirely on pre-computed scoring
                data. The AI does not make independent health claims.
              </Text>
            </View>

            {/* Feedback Section */}
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackQuestion}>
                Was this explanation helpful?
              </Text>
              <View style={styles.feedbackButtons}>
                <TouchableOpacity
                  style={[
                    styles.feedbackButton,
                    feedbackState === 'helpful' && styles.feedbackButtonActive,
                  ]}
                  onPress={() => handleFeedback(true)}
                  disabled={feedbackLoading}
                  activeOpacity={0.7}>
                  <Text style={styles.feedbackButtonIcon}>👍</Text>
                  <Text
                    style={[
                      styles.feedbackButtonLabel,
                      feedbackState === 'helpful' &&
                        styles.feedbackButtonLabelActive,
                    ]}>
                    Helpful
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.feedbackButton,
                    feedbackState === 'not_helpful' &&
                      styles.feedbackButtonActiveNeg,
                  ]}
                  onPress={() => handleFeedback(false)}
                  disabled={feedbackLoading}
                  activeOpacity={0.7}>
                  <Text style={styles.feedbackButtonIcon}>👎</Text>
                  <Text
                    style={[
                      styles.feedbackButtonLabel,
                      feedbackState === 'not_helpful' &&
                        styles.feedbackButtonLabelActiveNeg,
                    ]}>
                    Not Helpful
                  </Text>
                </TouchableOpacity>
              </View>

              {feedbackState !== 'none' && (
                <Text style={styles.feedbackConfirmation}>
                  {feedbackState === 'helpful'
                    ? '✅ Thanks for your feedback!'
                    : "📝 Thanks — we'll work on improving."}
                </Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------- Styles ----------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: Spacing.xs,
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

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.lg,
  },
  loadingTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
    marginTop: Spacing.md,
  },
  loadingSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },

  // Error
  errorContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadow.sm,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
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

  // Chat Bubble
  chatBubble: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGreen,
  },
  chatBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chatBubbleAvatar: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  chatBubbleName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
  },
  chatBubbleModel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.lightText,
    marginTop: 1,
  },
  explanationText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.darkText,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  chatBubbleTail: {
    position: 'absolute',
    left: 20,
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.surface,
  },

  // Disclaimer
  disclaimerContainer: {
    backgroundColor: Colors.lightGreenBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  disclaimerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.primaryGreenDark,
    lineHeight: 18,
  },

  // Feedback
  feedbackContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  feedbackQuestion: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.darkText,
    marginBottom: Spacing.md,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  feedbackButtonActive: {
    borderColor: Colors.primaryGreen,
    backgroundColor: Colors.lightGreenBg,
  },
  feedbackButtonActiveNeg: {
    borderColor: Colors.amberDark,
    backgroundColor: Colors.amberBg,
  },
  feedbackButtonIcon: {
    fontSize: 20,
  },
  feedbackButtonLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.caption,
    color: Colors.secondaryText,
  },
  feedbackButtonLabelActive: {
    color: Colors.primaryGreen,
  },
  feedbackButtonLabelActiveNeg: {
    color: Colors.amberDark,
  },
  feedbackConfirmation: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.primaryGreen,
    marginTop: Spacing.md,
  },
});

export default AIExplanationScreen;
