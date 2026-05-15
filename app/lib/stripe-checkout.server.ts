import Stripe from 'stripe';
import { FieldValue, getAdminFirestore } from './firebase-admin.server';
import { generateCombinationKey } from './pricing/utils';
import type { ProductPricingState } from './pricing/types';

const CURRENCY = 'usd';
const MAX_CHECKOUT_QUANTITY = 99;

type FirestoreTimestamp = { toMillis: () => number };

type SelectedCheckoutAddress = {
  id: string;
  country: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  stateOrProvince: string;
  phone: string;
  isDefault: boolean;
};

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

function toOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSelectedAddress(rawData: Record<string, unknown>, id: string): SelectedCheckoutAddress {
  return {
    id,
    country: toOptionalString(rawData.country),
    firstName: toOptionalString(rawData.firstName),
    lastName: toOptionalString(rawData.lastName),
    addressLine1: toOptionalString(rawData.addressLine1),
    addressLine2: toOptionalString(rawData.addressLine2),
    postalCode: toOptionalString(rawData.postalCode),
    city: toOptionalString(rawData.city),
    stateOrProvince: toOptionalString(rawData.stateOrProvince),
    phone: toOptionalString(rawData.phone),
    isDefault: rawData.isDefault === true,
  };
}

function hasRequiredSelectedAddressFields(address: SelectedCheckoutAddress) {
  return Boolean(address.country && address.firstName && address.lastName && address.addressLine1 && address.postalCode && address.city);
}

async function fetchSelectedCheckoutAddress(userId: string | null, addressId: unknown) {
  const selectedAddressId = toOptionalString(addressId);

  if (!selectedAddressId) {
    return null;
  }

  if (!userId) {
    throw new CheckoutError('Sign in again to use a saved delivery address.', 401);
  }

  const db = await getAdminFirestore();
  const snapshot = await db.collection('users').doc(userId).collection('addresses').doc(selectedAddressId).get();

  if (!snapshot.exists) {
    throw new CheckoutError('The selected delivery address could not be found.', 404);
  }

  const selectedAddress = normalizeSelectedAddress(snapshot.data() ?? {}, snapshot.id);

  if (!hasRequiredSelectedAddressFields(selectedAddress)) {
    throw new CheckoutError('The selected delivery address is incomplete. Please edit it or use a new address.', 422);
  }

  return selectedAddress;
}

async function fetchCheckoutEmail(userId: string | null) {
  if (!userId) {
    return null;
  }

  const { getAdminAuth } = await import('./firebase-admin.server');
  const adminAuth = await getAdminAuth();
  const user = await adminAuth.getUser(userId).catch(() => null);

  return user?.email ?? null;
}

function selectedAddressToOrderAddress(address: SelectedCheckoutAddress | null) {
  if (!address) {
    return null;
  }

  return {
    line1: address.addressLine1,
    line2: address.addressLine2 || null,
    city: address.city,
    state: address.stateOrProvince || null,
    postalCode: address.postalCode,
    country: address.country,
  };
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

function getStripePaymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
}

function getAddressLineValue(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeAddress(address: Stripe.Address | null | undefined) {
  if (!address) {
    return null;
  }

  return {
    line1: getAddressLineValue(address.line1),
    line2: getAddressLineValue(address.line2),
    city: getAddressLineValue(address.city),
    state: getAddressLineValue(address.state),
    postalCode: getAddressLineValue(address.postal_code),
    country: getAddressLineValue(address.country),
  };
}

type NormalizedAddress = ReturnType<typeof normalizeAddress>;

function hasRequiredAddressFields(address: NormalizedAddress) {
  return Boolean(address?.line1 && address.city && address.postalCode && address.country);
}

function getRequiredCustomerDetails(session: Stripe.Checkout.Session) {
  const customerDetails = session.customer_details;
  const shippingDetails = session.collected_information?.shipping_details;
  const customerName = customerDetails?.name?.trim() || shippingDetails?.name?.trim() || null;
  const customerEmail = getSessionEmail(session)?.trim() || null;
  const customerPhone = customerDetails?.phone?.trim() || null;
  const shippingAddress = normalizeAddress(shippingDetails?.address);
  const billingAddress = normalizeAddress(customerDetails?.address);
  const missingFields: string[] = [];

  if (!customerName) {
    missingFields.push('customerName');
  }

  if (!customerEmail) {
    missingFields.push('customerEmail');
  }

  if (!customerPhone) {
    missingFields.push('customerPhone');
  }

  if (!shippingDetails?.name?.trim()) {
    missingFields.push('shippingDetails.name');
  }

  if (!hasRequiredAddressFields(shippingAddress)) {
    missingFields.push('shippingAddress');
  }

  if (!hasRequiredAddressFields(billingAddress)) {
    missingFields.push('billingAddress');
  }

  return {
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    billingAddress,
    shippingDetails: shippingDetails
      ? {
          name: shippingDetails.name?.trim() || null,
          phone: customerPhone,
          address: shippingAddress,
        }
      : null,
    missingFields,
  };
}

function timestampFromStripe(created: number | null | undefined) {
  return created ? new Date(created * 1000) : FieldValue.serverTimestamp();
}

export async function createCheckoutSession(request: Request, rawPayload: unknown, userId: string | null) {
  const cartItems = normalizeCartItems((rawPayload as { items?: unknown })?.items);

  if (cartItems.length === 0) {
    throw new CheckoutError('Your cart is empty.', 400);
  }

  const selectedAddress = await fetchSelectedCheckoutAddress(userId, (rawPayload as { selectedAddressId?: unknown })?.selectedAddressId);
  const customerEmail = await fetchCheckoutEmail(userId);
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
      customer_email: customerEmail ?? undefined,
      customer_creation: 'always',
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'TR', 'GB'],
      },
      custom_text: {
        shipping_address: {
          message: 'Enter the delivery address, phone number, and all shipment details for this order here.',
        },
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: CURRENCY,
            },
            display_name: 'Standard shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      metadata: {
        userId: userId ?? '',
        source: 'online-shopping-cart',
        selectedAddressId: selectedAddress?.id ?? '',
      },
    });

    if (selectedAddress) {
      const db = await getAdminFirestore();
      await db.collection('checkoutSessions').doc(session.id).set({
        userId,
        selectedAddressId: selectedAddress.id,
        selectedShippingAddress: selectedAddress,
        selectedShippingOrderAddress: selectedAddressToOrderAddress(selectedAddress),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

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

export async function createOrderFromCheckoutSession(sessionReference: Pick<Stripe.Checkout.Session, 'id'>) {
  if (!sessionReference.id) {
    throw new Error('Stripe session id is required to create an order.');
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionReference.id, {
    expand: ['payment_intent'],
  });
  const db = await getAdminFirestore();
  const existingOrder = await db.collection('orders').where('stripeSessionId', '==', session.id).limit(1).get();

  if (!existingOrder.empty) {
    return { created: false, orderId: existingOrder.docs[0].id };
  }

  const checkoutSessionSnapshot = await db.collection('checkoutSessions').doc(session.id).get();
  const checkoutSessionData = checkoutSessionSnapshot.exists ? checkoutSessionSnapshot.data() : null;
  const selectedShippingAddress = checkoutSessionData?.selectedShippingAddress ?? null;
  const selectedShippingOrderAddress = checkoutSessionData?.selectedShippingOrderAddress ?? null;
  const requiredCustomerDetails = getRequiredCustomerDetails(session);

  if (requiredCustomerDetails.missingFields.length > 0) {
    console.error('Stripe Checkout Session is missing required customer or shipping details; order was not created.', {
      stripeSessionId: session.id,
      missingFields: requiredCustomerDetails.missingFields,
    });

    return { created: false, orderId: null, skipped: true, reason: 'missing_required_customer_or_shipping_details' };
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  });
  const items = await Promise.all(lineItems.data.map(lineItemToOrderItem));
  const orderRef = db.collection('orders').doc();
  const createdAt = timestampFromStripe(session.created) as FieldValue | Date | FirestoreTimestamp;

  await orderRef.create({
    userId: session.client_reference_id || session.metadata?.userId || null,
    customerName: requiredCustomerDetails.customerName,
    customerEmail: requiredCustomerDetails.customerEmail,
    customerPhone: requiredCustomerDetails.customerPhone,
    shippingAddress: requiredCustomerDetails.shippingAddress,
    selectedShippingAddress,
    selectedShippingOrderAddress,
    selectedAddressId: session.metadata?.selectedAddressId || null,
    billingAddress: requiredCustomerDetails.billingAddress,
    shippingCost: session.total_details?.amount_shipping ?? 0,
    shippingDetails: requiredCustomerDetails.shippingDetails,
    items,
    subtotal: session.amount_subtotal ?? items.reduce((total, item) => total + item.subtotal, 0),
    total: session.amount_total ?? items.reduce((total, item) => total + item.total, 0),
    currency: session.currency ?? CURRENCY,
    paymentStatus: session.payment_status,
    stripeSessionId: session.id,
    stripePaymentIntentId: getStripePaymentIntentId(session),
    createdAt,
  });

  return { created: true, orderId: orderRef.id };
}
