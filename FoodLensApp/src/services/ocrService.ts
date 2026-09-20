/**
 * OCR Service — Frontend
 *
 * Calls POST /api/scoring/ocr-extract/ with a multipart image upload.
 * Returns extracted raw_text and a real confidence score from Tesseract.
 */

import apiClient from './apiClient';

export interface OCRResult {
  raw_text: string;
  confidence: number;   // 0–100, genuine Tesseract per-word average
  warning?: string;     // present when no text could be extracted
}

/**
 * Upload a photo of an ingredient label to the backend OCR endpoint.
 *
 * @param imageUri  Local file URI from react-native-camera-kit capture()
 *                  or react-native-image-picker launchImageLibrary()
 *                  e.g. "file:///data/user/0/.../photo.jpg"
 */
export const extractTextFromImage = async (imageUri: string): Promise<OCRResult> => {
  const form = new FormData();

  // React Native's FormData accepts the { uri, type, name } object for files
  form.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'label.jpg',
  } as any);

  const response = await apiClient.post<OCRResult>(
    '/scoring/ocr-extract/',
    form,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Increase timeout for OCR — preprocessing + Tesseract can take 3–8s
      timeout: 30000,
    },
  );

  return response.data;
};
