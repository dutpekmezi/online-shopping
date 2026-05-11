import { collection, getDocs, type Timestamp } from 'firebase/firestore';
import { db } from './firebase.client';
import type { ProductPricingState } from './pricing/types';

export const PRODUCTS_COLLECTION = 'products';

export type Product = {
  productId: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  basePrice?: string;
  pricingState?: ProductPricingState;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export function resolveProductImageUrl(imageUrl: string) {
  if (imageUrl.startsWith('App/Images/')) {
    const fileName = imageUrl.replace('App/Images/', '');
    return new URL(`../Images/${fileName}`, import.meta.url).href;
  }

  return imageUrl;
}

function toOptionalTimestamp(value: unknown): Timestamp | undefined {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value as Timestamp;
  }

  return undefined;
}

function toProductField(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function sortByCreatedAtDesc(products: Product[]) {
  return [...products].sort((firstProduct, secondProduct) => {
    const firstCreatedAt = firstProduct.createdAt?.toMillis() ?? 0;
    const secondCreatedAt = secondProduct.createdAt?.toMillis() ?? 0;

    return secondCreatedAt - firstCreatedAt;
  });
}

export async function fetchProducts(): Promise<Product[]> {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const products = snapshot.docs.map((doc) => {
    const data = doc.data();
    const imageUrl = toProductField(data.imageUrl);

    return {
      productId: toProductField(data.productId, doc.id),
      title: toProductField(data.title, 'İsimsiz ürün'),
      description: toProductField(data.description),
      imageUrl: resolveProductImageUrl(imageUrl),
      category: toProductField(data.category, 'Genel'),
      basePrice: typeof data.basePrice === 'string' ? data.basePrice : undefined,
      pricingState: data.pricingState as ProductPricingState | undefined,
      createdAt: toOptionalTimestamp(data.createdAt),
      updatedAt: toOptionalTimestamp(data.updatedAt),
    } satisfies Product;
  });

  return sortByCreatedAtDesc(products);
}

export async function fetchProductCategories(): Promise<string[]> {
  const products = await fetchProducts();

  return Array.from(new Set(products.map((product) => product.category.trim()).filter(Boolean))).sort((firstCategory, secondCategory) =>
    firstCategory.localeCompare(secondCategory),
  );
}
