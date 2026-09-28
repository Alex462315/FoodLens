/**
 * FoodLens Services — Speech Service (Text-to-Speech)
 * 
 * High-performance on-device speech synthesis using @mhpdev/react-native-speech
 * (Built for React Native New Architecture / TurboModules).
 * 
 * Provides:
 * - speakText: Synthesizes text with rate & pitch controls.
 * - stopSpeaking: Halts active speech immediately.
 * - buildProductHealthSummary: Assembles an engaging, spoken summary of the product analysis.
 */

import Speech from '@mhpdev/react-native-speech';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  language?: string;
  onFinish?: () => void;
  onError?: (err: any) => void;
}

let activeListener: any = null;

/**
 * Stop any ongoing speech playback.
 */
export const stopSpeaking = async (): Promise<void> => {
  try {
    if (activeListener && typeof activeListener.remove === 'function') {
      activeListener.remove();
      activeListener = null;
    }
    await Speech.stop();
  } catch (err) {
    console.warn('[SpeechService] stop error:', err);
  }
};

/**
 * Check if the engine is currently speaking.
 */
export const isSpeaking = async (): Promise<boolean> => {
  try {
    return await Speech.isSpeaking();
  } catch {
    return false;
  }
};

/**
 * Speak the provided text aloud.
 */
export const speakText = async (
  text: string,
  options?: SpeakOptions,
): Promise<boolean> => {
  if (!text || !text.trim()) return false;

  try {
    // Stop any existing speech first
    await stopSpeaking();

    // Clean markdown/bullet points for clear speech
    const cleanedText = cleanTextForSpeech(text);

    // Setup finish and error listeners if provided
    if (options?.onFinish) {
      activeListener = Speech.onFinish(() => {
        if (options.onFinish) options.onFinish();
        if (activeListener && typeof activeListener.remove === 'function') {
          activeListener.remove();
          activeListener = null;
        }
      });
    }

    if (options?.onError) {
      Speech.onError(err => {
        if (options.onError) options.onError(err);
      });
    }

    await Speech.speak(cleanedText, {
      rate: options?.rate ?? 0.9,
      pitch: options?.pitch ?? 1.0,
      language: options?.language ?? 'en-US',
    });

    return true;
  } catch (err: any) {
    console.warn('[SpeechService] speakText error:', err);
    if (options?.onError) {
      options.onError(err);
    }
    return false;
  }
};

/**
 * Strip markdown asterisks, hashes, and formatting characters so TTS reads smoothly.
 */
export const cleanTextForSpeech = (raw: string): string => {
  return raw
    .replace(/[#*_~`]/g, '') // remove markdown symbols
    .replace(/\s+/g, ' ')     // collapse extra spaces
    .replace(/\bpos\b/gi, 'position')
    .replace(/\bOFF\b/g, 'Open Food Facts')
    .trim();
};

/**
 * Build a concise, natural-sounding audio script from the scan and health analysis.
 */
export const buildProductHealthSummary = (params: {
  productName: string;
  brand?: string;
  riskLabel?: string;
  score?: number;
  hasAllergens?: boolean;
  allergenDetails?: string[];
  userConditions?: string[];
  aiExplanation?: string;
}): string => {
  const parts: string[] = [];

  // 1. Introduction & Risk
  const name = params.productName || 'This product';
  const brand = params.brand ? `by ${params.brand}` : '';
  const risk = params.riskLabel ? `${params.riskLabel} Risk` : 'Analyzed';
  const score = params.score !== undefined ? `${Math.round(params.score)} out of 100` : '';

  parts.push(`Health analysis for ${name} ${brand}.`);
  parts.push(`Personalized risk level: ${risk}, scoring ${score}.`);

  // 2. Allergen Warning (High Priority)
  if (params.hasAllergens && params.allergenDetails && params.allergenDetails.length > 0) {
    const list = params.allergenDetails.join(', ');
    parts.push(`Allergen warning: Contains ${list}, which triggers your allergy profile.`);
  }

  // 3. User Condition impact
  if (params.userConditions && params.userConditions.length > 0) {
    const condList = params.userConditions.join(' and ');
    if (params.riskLabel?.toLowerCase() === 'high') {
      parts.push(`This product is not recommended due to your ${condList}.`);
    } else if (params.riskLabel?.toLowerCase() === 'moderate') {
      parts.push(`Consume in moderation with your ${condList}.`);
    } else {
      parts.push(`This product appears generally safe for your ${condList}.`);
    }
  }

  // 4. Brief AI explanation snippet
  if (params.aiExplanation) {
    const cleanAi = cleanTextForSpeech(params.aiExplanation);
    // Take first 1-2 sentences
    const sentences = cleanAi.split(/(?<=[.!?])\s+/);
    const shortAi = sentences.slice(0, 2).join(' ');
    if (shortAi) {
      parts.push(shortAi);
    }
  }

  return parts.join(' ');
};
