export const CART_STORAGE_KEY = 'online-shopping-cart';
export const CART_UPDATED_EVENT = 'online-shopping-cart-updated';

export type CartItem = {
  id: string;
  productId: string;
  title: string;
  imageUrl: string;
  price: number;
  quantity: number;
  optionSummary?: string;
  selectedOptionIds?: string[];
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id : '';
  const productId = typeof item.productId === 'string' ? item.productId : '';
  const title = typeof item.title === 'string' ? item.title : '';
  const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl : '';
  const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0;
  const quantity = typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1;
  const optionSummary = typeof item.optionSummary === 'string' && item.optionSummary.trim() ? item.optionSummary : undefined;
  const selectedOptionIds = Array.isArray(item.selectedOptionIds)
    ? item.selectedOptionIds.filter((optionId): optionId is string => typeof optionId === 'string' && optionId.trim().length > 0)
    : id.startsWith(`${productId}:`)
      ? id
          .slice(`${productId}:`.length)
          .split('|')
          .filter((optionId) => optionId && optionId !== 'default')
      : [];

  if (!id || !productId || !title) {
    return null;
  }

  return { id, productId, title, imageUrl, price, quantity, optionSummary, selectedOptionIds };
}

export function readCartItems(): CartItem[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue) ? parsedValue.map(normalizeCartItem).filter((item): item is CartItem => item !== null) : [];
  } catch (error) {
    console.error('Cart could not be read from localStorage.', error);
    return [];
  }
}

export function writeCartItems(items: CartItem[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: items }));
}

export function addCartItem(nextItem: CartItem) {
  const items = readCartItems();
  const existingItemIndex = items.findIndex((item) => item.id === nextItem.id);

  if (existingItemIndex >= 0) {
    const existingItem = items[existingItemIndex];
    items[existingItemIndex] = {
      ...existingItem,
      quantity: existingItem.quantity + nextItem.quantity,
      price: nextItem.price,
      imageUrl: nextItem.imageUrl || existingItem.imageUrl,
    };
  } else {
    items.push(nextItem);
  }

  writeCartItems(items);
  return items;
}

export function getCartItemCount(items = readCartItems()) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotal(items = readCartItems()) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
