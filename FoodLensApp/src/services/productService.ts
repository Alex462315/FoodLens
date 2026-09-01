/**
 * FoodLens Services — Product API calls
 * Barcode lookup via Open Food Facts API (proxied through backend).
 */

import apiClient from './apiClient';

export interface NutritionData {
  energy_kcal: number | null;
  fat: number | null;
  saturated_fat: number | null;
  sugars: number | null;
  proteins: number | null;
  salt: number | null;
  fiber: number | null;
  carbohydrates: number | null;
}

export interface ProductLookupResult {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string;
  image_url?: string | null;
  ingredients_text?: string;
  nutriscore_grade?: string | null;
  allergens?: string;
  categories?: string;
  nutrition?: NutritionData;
  serving_size?: string | null;
  error?: string;
}

/**
 * Look up a product by its barcode string.
 */
export const lookupProductByBarcode = async (
  barcode: string,
): Promise<ProductLookupResult> => {
  const response = await apiClient.get<ProductLookupResult>(
    '/products/lookup/',
    {
      params: {barcode},
    },
  );
  return response.data;
};
