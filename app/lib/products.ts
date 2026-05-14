import { collection, doc, documentId, getDoc, getDocs, limit, query, type Timestamp, where } from 'firebase/firestore';
import { db } from './firebase.client';
import type { ProductPricingState } from './pricing/types';

export const PRODUCTS_COLLECTION = 'products';

export type Product = {
  documentId: string;
  productId: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  basePrice?: string;
  pricingState?: ProductPricingState;
  imageUrls?: string[];
  images?: string[];
  compareAtPrice?: string | number;
  oldPrice?: string | number;
  saleText?: string;
  cartCount?: number;
  storeName?: string;
  rating?: string | number;
  shippingOrigin?: string;
  shippingInfo?: string;
  returnsInfo?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isArchived?: boolean;
  archivedAt?: Timestamp;
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


function toOptionalStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map(resolveProductImageUrl) : undefined;
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function toOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toOptionalPrice(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function mapProductDocument(docSnapshot: { id: string; data: () => Record<string, unknown> }): Product {
  const data = docSnapshot.data();
  const imageUrl = toProductField(data.imageUrl);

  return {
    documentId: docSnapshot.id,
    productId: toProductField(data.productId, docSnapshot.id),
    title: toProductField(data.title, 'Untitled item'),
    description: toProductField(data.description),
    imageUrl: resolveProductImageUrl(imageUrl),
    category: toProductField(data.category, 'General'),
    basePrice: typeof data.basePrice === 'string' ? data.basePrice : undefined,
    pricingState: data.pricingState as ProductPricingState | undefined,
    imageUrls: toOptionalStringArray(data.imageUrls),
    images: toOptionalStringArray(data.images),
    compareAtPrice: toOptionalPrice(data.compareAtPrice),
    oldPrice: toOptionalPrice(data.oldPrice),
    saleText: toOptionalString(data.saleText),
    cartCount: toOptionalNumber(data.cartCount),
    storeName: toOptionalString(data.storeName),
    rating: toOptionalPrice(data.rating),
    shippingOrigin: toOptionalString(data.shippingOrigin),
    shippingInfo: toOptionalString(data.shippingInfo),
    returnsInfo: toOptionalString(data.returnsInfo),
    createdAt: toOptionalTimestamp(data.createdAt),
    updatedAt: toOptionalTimestamp(data.updatedAt),
    isArchived: data.isArchived === true,
    archivedAt: toOptionalTimestamp(data.archivedAt),
  } satisfies Product;
}

function sortByCreatedAtDesc(products: Product[]) {
  return [...products].sort((firstProduct, secondProduct) => {
    const firstCreatedAt = firstProduct.createdAt?.toMillis() ?? 0;
    const secondCreatedAt = secondProduct.createdAt?.toMillis() ?? 0;

    return secondCreatedAt - firstCreatedAt;
  });
}

export async function fetchProducts(options: { archived?: boolean } = {}): Promise<Product[]> {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const products = snapshot.docs.map(mapProductDocument);
  const shouldShowArchived = options.archived === true;

  return sortByCreatedAtDesc(products.filter((product) => (product.isArchived === true) === shouldShowArchived));
}

export async function fetchArchivedProducts(): Promise<Product[]> {
  return fetchProducts({ archived: true });
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  const productsCollection = collection(db, PRODUCTS_COLLECTION);
  const directDocument = await getDoc(doc(db, PRODUCTS_COLLECTION, productId));

  if (directDocument.exists()) {
    return mapProductDocument(directDocument);
  }

  const productQuery = query(productsCollection, where('productId', '==', productId), limit(1));
  const snapshot = await getDocs(productQuery);
  const matchingDocument = snapshot.docs[0];

  return matchingDocument ? mapProductDocument(matchingDocument) : null;
}


function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export async function fetchProductsByIds(productIds: string[]): Promise<Product[]> {
  const uniqueProductIds = Array.from(new Set(productIds.map((productId) => productId.trim()).filter(Boolean)));

  if (uniqueProductIds.length === 0) {
    return [];
  }

  const productsCollection = collection(db, PRODUCTS_COLLECTION);
  const productMap = new Map<string, Product>();
  const productIdChunks = chunkValues(uniqueProductIds, 10);

  const documentSnapshots = await Promise.all(
    productIdChunks.map((productIdChunk) => getDocs(query(productsCollection, where(documentId(), 'in', productIdChunk)))),
  );

  documentSnapshots.flatMap((snapshot) => snapshot.docs).forEach((productDocument) => {
    const product = mapProductDocument(productDocument);
    productMap.set(product.productId, product);
    productMap.set(product.documentId, product);
  });

  const unmatchedProductIds = uniqueProductIds.filter((productId) => !productMap.has(productId));

  if (unmatchedProductIds.length > 0) {
    const fieldSnapshots = await Promise.all(
      chunkValues(unmatchedProductIds, 10).map((productIdChunk) =>
        getDocs(query(productsCollection, where('productId', 'in', productIdChunk))),
      ),
    );

    fieldSnapshots.flatMap((snapshot) => snapshot.docs).forEach((productDocument) => {
      const product = mapProductDocument(productDocument);
      productMap.set(product.productId, product);
      productMap.set(product.documentId, product);
    });
  }

  return uniqueProductIds.map((productId) => productMap.get(productId)).filter((product): product is Product => Boolean(product));
}

export async function fetchProductCategories(): Promise<string[]> {
  const products = await fetchProducts();

  return Array.from(new Set(products.map((product) => product.category.trim()).filter(Boolean))).sort((firstCategory, secondCategory) =>
    firstCategory.localeCompare(secondCategory),
  );
}
