import Stripe from 'stripe';
import { FieldValue, getAdminFirestore } from './firebase-admin.server';
import { generateCombinationKey } from './pricing/utils';
import type { ProductPricingState } from './pricing/types';

const CURRENCY = 'usd';
const MAX_CHECKOUT_QUANTITY = 99;

type FirestoreTimestamp = { toMillis: () => number };

type CheckoutCartItemInput = {
  productId: string;
  quantity: number;
  selectedOptionIds: string[];
};

type ValidatedCheckoutItem = {
  productId: string;
  title: string;
  description: string;
  imageUrl: string;
  quantity: number;
  unitAmount: number;
  subtotal: number;
  optionSummary?: string;
  selectedOptionIds: string[];
};

type ProductDocument = {
  productId?: unknown;
  title?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  basePrice?: unknown;
  pricingState?: unknown;
  isArchived?: unknown;
};

export class CheckoutError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CheckoutError';
    this.status = status;
  }
}

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new CheckoutError('Stripe is not configured. Add STRIPE_SECRET_KEY to the server environment.', 500);
  }

  return secretKey;
}

export function getStripeClient() {
  return new Stripe(getStripeSecretKey());
}

function getApplicationOrigin(request: Request) {
  const configuredOrigin = process.env.APP_URL || process.env.VITE_APP_URL;

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '');
  }

  const requestUrl = new URL(request.url);
  return requestUrl.origin;
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function parsePrice(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedPrice = Number.parseFloat(value.replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(parsedPrice) ? parsedPrice : 0;
  }

  return 0;
}

function toUnitAmount(price: number, productTitle: string) {
  if (!Number.isFinite(price) || price <= 0) {
    throw new CheckoutError(`Invalid price for ${productTitle}.`, 422);
  }

  return Math.round(price * 100);
}

function normalizeCartItems(value: unknown): CheckoutCartItemInput[] {
  if (!Array.isArray(value)) {
    throw new CheckoutError('Cart items could not be read.', 400);
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const productId = toString(record.productId).trim();
      const quantity = typeof record.quantity === 'number' && Number.isFinite(record.quantity) ? Math.floor(record.quantity) : 0;
      const selectedOptionIds = Array.isArray(record.selectedOptionIds)
        ? record.selectedOptionIds.map((optionId) => toString(optionId).trim()).filter(Boolean)
        : [];

      if (!productId || quantity < 1) {
        return null;
      }

      return {
        productId,
        quantity: Math.min(quantity, MAX_CHECKOUT_QUANTITY),
        selectedOptionIds,
      } satisfies CheckoutCartItemInput;
    })
    .filter((item): item is CheckoutCartItemInput => item !== null);
}

function getPricingState(product: ProductDocument): ProductPricingState {
  const rawPricingState = product.pricingState as Partial<ProductPricingState> | undefined;
  const basePrice = parsePrice(rawPricingState?.basePrice ?? product.basePrice);
  const variationGroups = Array.isArray(rawPricingState?.variationGroups) ? rawPricingState.variationGroups : [];
  const combinations = Array.isArray(rawPricingState?.combinations) ? rawPricingState.combinations : [];

  return { basePrice, variationGroups, combinations };
}

function resolveOptionSummary(pricingState: ProductPricingState, selectedOptionIds: string[]) {
  return pricingState.variationGroups
    .map((group, groupIndex) => {
      const option = group.options.find((candidate) => candidate.id === selectedOptionIds[groupIndex]);
      return option ? `${group.name}: ${option.label}` : '';
    })
    .filter(Boolean)
    .join(' / ');
}

async function fetchProductDocument(productId: string) {
  const db = await getAdminFirestore();
  const directDocument = await db.collection('products').doc(productId).get();

  if (directDocument.exists) {
    return directDocument.data() as ProductDocument;
  }

  const productQuery = await db.collection('products').where('productId', '==', productId).limit(1).get();
  const matchingDocument = productQuery.docs[0];

  return matchingDocument?.exists ? (matchingDocument.data() as ProductDocument) : null;
}

async function validateCartItem(item: CheckoutCartItemInput): Promise<ValidatedCheckoutItem> {
  const product = await fetchProductDocument(item.productId);

  if (!product || product.isArchived === true) {
    throw new CheckoutError('One of the products in your cart is no longer available.', 404);
  }

  const productId = toString(product.productId, item.productId);
  const title = toString(product.title, 'Untitled item');
  const description = toString(product.description);
  const imageUrl = toString(product.imageUrl);
  const pricingState = getPricingState(product);
  const hasVariations = pricingState.variationGroups.length > 0;
  let finalPrice = pricingState.basePrice;
  let selectedOptionIds: string[] = [];
  let optionSummary: string | undefined;

  if (hasVariations) {
    selectedOptionIds = item.selectedOptionIds.map((optionId) => optionId.trim()).filter(Boolean);

    if (selectedOptionIds.length !== pricingState.variationGroups.length) {
      throw new CheckoutError(`Choose valid options for ${title}.`, 422);
    }

    const hasInvalidOption = pricingState.variationGroups.some(
      (group, groupIndex) => !group.options.some((option) => option.id === selectedOptionIds[groupIndex]),
    );

    if (hasInvalidOption) {
      throw new CheckoutError(`Invalid variation selected for ${title}.`, 422);
    }

    const selectedCombinationKey = generateCombinationKey(selectedOptionIds);
    const selectedCombination = pricingState.combinations.find((combination) => combination.key === selectedCombinationKey);

    if (!selectedCombination || !selectedCombination.enabled || selectedCombination.stock < item.quantity) {
      throw new CheckoutError(`The selected options for ${title} are unavailable.`, 409);
    }

    finalPrice = selectedCombination.price;
    optionSummary = resolveOptionSummary(pricingState, selectedOptionIds) || undefined;
  } else if (item.selectedOptionIds.length > 0) {
    throw new CheckoutError(`Invalid variation selected for ${title}.`, 422);
  }

  const unitAmount = toUnitAmount(finalPrice, title);

  return {
    productId,
    title,
    description,
    imageUrl,
    quantity: item.quantity,
    unitAmount,
    subtotal: unitAmount * item.quantity,
    optionSummary,
    selectedOptionIds,
  };
}

function toStripeImage(imageUrl: string) {
  return imageUrl.startsWith('http://') || imageUrl.startsWith('https://') ? [imageUrl] : undefined;
}

function buildLineItems(items: ValidatedCheckoutItem[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: CURRENCY,
      unit_amount: item.unitAmount,
      product_data: {
        name: item.title,
        description: item.optionSummary || item.description || undefined,
        images: toStripeImage(item.imageUrl),
        metadata: {
          productId: item.productId,
          selectedOptionIds: item.selectedOptionIds.join('|'),
          optionSummary: item.optionSummary ?? '',
        },
      },
    },
  }));
}

function getSessionEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email ?? session.customer_email ?? null;
}

function timestampFromStripe(created: number | null | undefined) {
  return created ? new Date(created * 1000) : FieldValue.serverTimestamp();
}

export async function createCheckoutSession(request: Request, rawPayload: unknown, userId: string | null) {
  const cartItems = normalizeCartItems((rawPayload as { items?: unknown })?.items);

  if (cartItems.length === 0) {
    throw new CheckoutError('Your cart is empty.', 400);
  }

  const validatedItems = await Promise.all(cartItems.map(validateCartItem));
  const subtotal = validatedItems.reduce((total, item) => total + item.subtotal, 0);
  const origin = getApplicationOrigin(request);
  const stripe = getStripeClient();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: buildLineItems(validatedItems),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      client_reference_id: userId ?? undefined,
      metadata: {
        userId: userId ?? '',
        source: 'online-shopping-cart',
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
      subtotal,
      currency: CURRENCY,
    };
  } catch (error) {
    console.error('Stripe Checkout Session creation failed.', error);
    throw new CheckoutError('Stripe session creation failed. Please try again.', 502);
  }
}

async function lineItemToOrderItem(lineItem: Stripe.LineItem) {
  const price = lineItem.price;
  const product = typeof price?.product === 'object' && price.product && !('deleted' in price.product) ? price.product : null;
  const metadata = product?.metadata ?? {};

  return {
    productId: metadata.productId ?? '',
    title: lineItem.description ?? product?.name ?? 'Purchased item',
    quantity: lineItem.quantity ?? 0,
    unitAmount: price?.unit_amount ?? 0,
    subtotal: lineItem.amount_subtotal ?? 0,
    total: lineItem.amount_total ?? 0,
    optionSummary: metadata.optionSummary || undefined,
    selectedOptionIds: metadata.selectedOptionIds ? String(metadata.selectedOptionIds).split('|').filter(Boolean) : [],
  };
}

export async function createOrderFromCheckoutSession(session: Stripe.Checkout.Session) {
  if (!session.id) {
    throw new Error('Stripe session id is required to create an order.');
  }

  const db = await getAdminFirestore();
  const existingOrder = await db.collection('orders').where('stripeSessionId', '==', session.id).limit(1).get();

  if (!existingOrder.empty) {
    return { created: false, orderId: existingOrder.docs[0].id };
  }

  const stripe = getStripeClient();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  });
  const items = await Promise.all(lineItems.data.map(lineItemToOrderItem));
  const orderRef = db.collection('orders').doc();
  const createdAt = timestampFromStripe(session.created) as FieldValue | Date | FirestoreTimestamp;

  await orderRef.create({
    userId: session.client_reference_id || session.metadata?.userId || null,
    customerEmail: getSessionEmail(session),
    items,
    subtotal: session.amount_subtotal ?? items.reduce((total, item) => total + item.subtotal, 0),
    total: session.amount_total ?? items.reduce((total, item) => total + item.total, 0),
    currency: session.currency ?? CURRENCY,
    paymentStatus: session.payment_status,
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    createdAt,
  });

  return { created: true, orderId: orderRef.id };
}
