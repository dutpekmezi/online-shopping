import { collection, getDocs, orderBy, query, type Timestamp } from 'firebase/firestore';
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

export async function fetchProducts(): Promise<Product[]> {
  const productsQuery = query(collection(db, PRODUCTS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(productsQuery);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<Product, 'productId'> & { productId?: string };

    return {
      ...data,
      productId: data.productId ?? doc.id,
      imageUrl: resolveProductImageUrl(data.imageUrl ?? ''),
    };
  });
}
