/**
 * ScanScreen — Real barcode scanner using react-native-camera-kit.
 *
 * Integrates with backend lookup endpoint (Step 3):
 * - On barcode detection: fetches product details from backend
 * - Shows loading state during fetch
 * - Navigates to ProductResultScreen with the result
 */

import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  StatusBar,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {Camera} from 'react-native-camera-kit';
import {launchImageLibrary} from 'react-native-image-picker';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Spacing, BorderRadius} from '../theme/spacing';
import {lookupProductByBarcode} from '../services/productService';

type ScanMode = 'barcode' | 'ocr';

interface ScanScreenProps {
  navigation: any;
}

const ScanScreen: React.FC<ScanScreenProps> = ({navigation}) => {
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const isProcessingRef = useRef(false);
  const cameraRef = useRef<any>(null);

  // Request camera permission
  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'FoodLens needs camera access to scan barcodes.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        setHasPermission(result === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.error('Permission error:', err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  }, []);

  // Check/request permission and activate camera on focus
  useFocusEffect(
    useCallback(() => {
      requestPermission();
      setIsActive(true);
      setIsFetching(false);
      isProcessingRef.current = false;

      return () => {
        setIsActive(false);
      };
    }, [requestPermission]),
  );

  // Handle barcode read — Step 3 integration
  const handleBarcodeScan = async (event: any) => {
    if (isProcessingRef.current) return;

    const code = event.nativeEvent?.codeStringValue;
    if (!code) return;

    // ── Validate: only numeric barcodes are food products ──────────────
    // Food barcodes (EAN-8, EAN-13, UPC-A, UPC-E) are always numeric.
    // QR codes (Google Pay, UPI, URLs, etc.) contain letters/symbols
    // and should be rejected before hitting the backend.
    const cleanCode = code.trim();
    if (!/^\d{8,14}$/.test(cleanCode)) {
      // Non-food barcode detected — show a one-time alert and reset
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;
        Alert.alert(
          'Not a Food Barcode',
          'This looks like a QR code or non-food barcode. FoodLens only supports food product barcodes (EAN/UPC).\n\nTry scanning the barcode on the product packaging.',
          [{text: 'OK', onPress: () => { isProcessingRef.current = false; }}],
        );
      }
      return;
    }

    isProcessingRef.current = true;
    setIsFetching(true);

    try {
      const result = await lookupProductByBarcode(cleanCode);
      setIsFetching(false);
      navigation.navigate('ProductResultScreen', {
        barcode: cleanCode,
        initialResult: result,
      });
    } catch (err: any) {
      console.error('Error looking up barcode:', err);
      setIsFetching(false);
      // Navigate to result screen with barcode so it can handle retry/error UI
      navigation.navigate('ProductResultScreen', {
        barcode: cleanCode,
      });
    }
  };

  // Handle OCR tab tap — now navigates to OCR capture mode (no alert)
  const handleOCRTap = () => {
    setMode('ocr');
  };

  // Capture photo using camera-kit and navigate to OCRReviewScreen
  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.capture();
      const uri = photo?.uri ?? photo?.path ?? photo;
      if (uri) {
        navigation.navigate('OCRReviewScreen', {imageUri: uri});
      } else {
        Alert.alert('Capture Failed', 'Could not capture image. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Capture Error', err?.message || 'Could not take photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Pick from gallery and navigate to OCRReviewScreen
  const handleGalleryPick = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
        selectionLimit: 1,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Gallery Error', result.errorMessage || 'Could not open gallery.');
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        navigation.navigate('OCRReviewScreen', {imageUri: uri});
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not open gallery.');
    }
  };

  // --- Permission denied state ---
  if (hasPermission === false) {
    return (
      <View style={styles.centeredContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          FoodLens needs camera access to scan barcodes. Please enable it in
          your device settings.
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Loading permission ---
  if (hasPermission === null) {
    return (
      <View style={styles.centeredContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primaryGreen} />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  // --- OCR mode: real camera capture for ingredient labels ---
  if (mode === 'ocr') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Full-screen camera in photo mode (no barcode scanning) */}
        {isActive && (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            scanBarcode={false}
          />
        )}

        {/* Overlay — flex column so controls land at bottom */}
        <View style={styles.ocrOverlay} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.overlayTop}>
            <Text style={styles.headerTitle}>Scan Ingredient Label</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={styles.modeTab}
              onPress={() => setMode('barcode')}>
              <Text style={[styles.modeTabText, styles.modeTabTextInactive]}>
                Barcode
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeTab, styles.modeTabActive]}>
              <Text style={[styles.modeTabText, styles.modeTabTextActive]}>
                Ingredient Label
              </Text>
            </TouchableOpacity>
          </View>

          {/* Guide rectangle — fills the middle space */}
          <View style={styles.ocrFrameContainer} pointerEvents="none">
            <View style={styles.ocrFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.ocrHint}>
              Frame the ingredient list so it fills the box
            </Text>
          </View>

          {/* Bottom controls: gallery — shutter — spacer (pinned to bottom) */}
          <View style={styles.ocrControls}>
            {/* Gallery button */}
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={handleGalleryPick}
              activeOpacity={0.8}>
              <Text style={styles.galleryIcon}>🖼️</Text>
              <Text style={styles.galleryLabel}>Gallery</Text>
            </TouchableOpacity>

            {/* Shutter button */}
            <TouchableOpacity
              style={[
                styles.shutterButton,
                isCapturing && styles.shutterButtonCapturing,
              ]}
              onPress={handleCapture}
              activeOpacity={0.85}
              disabled={isCapturing}>
              {isCapturing ? (
                <ActivityIndicator color={Colors.primaryGreen} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            {/* Spacer to balance the gallery button */}
            <View style={styles.galleryButton} />
          </View>
        </View>
      </View>
    );
  }

  // --- Camera viewfinder ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera with barcode scanning */}
      {isActive && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          scanBarcode={true}
          onReadCode={handleBarcodeScan}
          showFrame={false}
          scanThrottleDelay={1000}
        />
      )}

      {/* Custom overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top section */}
        <View style={styles.overlayTop}>
          <Text style={styles.headerTitle}>Scan Product</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, styles.modeTabActive]}>
            <Text style={[styles.modeTabText, styles.modeTabTextActive]}>
              Barcode
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeTab}
            onPress={handleOCRTap}>
            <Text style={[styles.modeTabText, styles.modeTabTextInactive]}>
              Ingredient Label
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scanning frame */}
        <View style={styles.frameContainer} pointerEvents="none">
          <View style={styles.scanFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            Align barcode within the frame
          </Text>
        </View>
      </View>

      {/* Loading Overlay while looking up barcode */}
      {isFetching && (
        <View style={styles.fetchingOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={styles.fetchingText}>Looking up product...</Text>
        </View>
      )}
    </View>
  );
};

const FRAME_SIZE = 260;
const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Centered states (permission, loading, OCR placeholder)
  centeredContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    color: Colors.darkText,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  settingsButton: {
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  settingsButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    color: Colors.white,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.secondaryText,
    marginTop: Spacing.lg,
  },

  // Camera overlay — barcode mode (space-between keeps hint at bottom)
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  // OCR mode overlay — flex:1 fills full screen, flex column pins controls to bottom
  ocrOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'column',
    flex: 1,
  },
  // flex:1 fills the middle space so ocrControls is pushed to the screen bottom
  ocrFrameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTop: {
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.h1,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  modeToggleAbsolute: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    padding: 4,
    position: 'absolute',
    top: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  modeTabActive: {
    backgroundColor: Colors.primaryGreen,
  },
  modeTabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
  },
  modeTabTextActive: {
    color: '#fff',
    fontFamily: FontFamily.semiBold,
  },
  modeTabTextInactive: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Scanning frame
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },

  // Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: Colors.primaryGreen,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: Colors.primaryGreen,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: Colors.primaryGreen,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: Colors.primaryGreen,
    borderBottomRightRadius: 8,
  },

  // Caption
  captionContainer: {
    alignItems: 'center',
    paddingBottom: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
  },
  captionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.subtitle,
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },

  // Fetching Overlay
  fetchingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fetchingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    color: Colors.white,
    marginTop: Spacing.md,
  },

  // ── OCR Capture Mode ─────────────────────────────────────────────────────

  // Wider rectangular frame for ingredient label (portrait label on pack back)
  ocrFrame: {
    width: 320,
    height: 200,
    position: 'relative',
  },
  ocrHint: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing.md,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },

  // Bottom bar: gallery — shutter — (spacer)
  ocrControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
  },

  // Circular shutter button
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shutterButtonCapturing: {
    borderColor: Colors.primaryGreen,
    backgroundColor: 'rgba(0,200,100,0.15)',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
  },

  // Gallery side button
  galleryButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryIcon: {
    fontSize: 28,
  },
  galleryLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
});

export default ScanScreen;
