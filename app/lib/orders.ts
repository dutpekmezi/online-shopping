import type { Timestamp } from "firebase/firestore";

export type OrderAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type OrderItem = {
  productId?: string | null;
  title?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  quantity?: number | null;
  unitAmount?: number | null;
  unit_amount?: number | null;
  subtotal?: number | null;
  total?: number | null;
  optionSummary?: string | null;
  selectedOptionIds?: string[] | null;
  selectedOptions?: Record<string, unknown> | Array<unknown> | string | null;
  variations?: Record<string, unknown> | Array<unknown> | string | null;
  options?: Record<string, unknown> | Array<unknown> | string | null;
};

export type OrderRecord = {
  id: string;
  userId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingAddress?: OrderAddress | string | null;
  billingAddress?: OrderAddress | string | null;
  shippingMethod?: string | null;
  shippingCost?: number | null;
  shippingDetails?: Record<string, unknown> | string | null;
  items?: OrderItem[] | null;
  subtotal?: number | null;
  total?: number | null;
  currency?: string | null;
  paymentStatus?: string | null;
  createdAt?: Timestamp | Date | string | number | null;
};

export const ORDER_FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23efe7df'/%3E%3Cpath d='M170 430 312 288l84 84 58-58 176 176H170z' fill='%23d1baa8'/%3E%3Ccircle cx='545' cy='178' r='54' fill='%23c79c78'/%3E%3Ctext x='400' y='535' text-anchor='middle' font-family='Arial, sans-serif' font-size='34' font-weight='700' fill='%23705a4c'%3EProduct image%3C/text%3E%3C/svg%3E";

export function formatOrderCurrency(amount: number | null | undefined, currency = "usd") {
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const safeCurrency = currency || "usd";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency.toUpperCase(),
  }).format(safeAmount / 100);
}

export function formatOrderDate(value: OrderRecord["createdAt"]) {
  const date = toOrderDate(value);

  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toOrderDate(value: OrderRecord["createdAt"]) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }

  return null;
}

export function getOrderItemImage(item: OrderItem | undefined) {
  const imageUrl = item?.imageUrl || item?.image;
  return typeof imageUrl === "string" && imageUrl.trim() ? imageUrl : ORDER_FALLBACK_IMAGE;
}

export function getOrderItemTitle(item: OrderItem) {
  return item.title || item.name || "Purchased item";
}

export function normalizeOrder(rawData: Record<string, unknown>, id: string): OrderRecord {
  return {
    ...(rawData as Omit<OrderRecord, "id">),
    id,
    items: Array.isArray(rawData.items) ? (rawData.items as OrderItem[]) : [],
  };
}

export function sortOrdersByCreatedAtDesc(orders: OrderRecord[]) {
  return [...orders].sort((firstOrder, secondOrder) => {
    const firstDate = toOrderDate(firstOrder.createdAt)?.getTime() ?? 0;
    const secondDate = toOrderDate(secondOrder.createdAt)?.getTime() ?? 0;
    return secondDate - firstDate;
  });
}

export function formatAddress(address: OrderRecord["shippingAddress"]) {
  if (!address) {
    return "Not available";
  }

  if (typeof address === "string") {
    return address;
  }

  const postalCode = address.postalCode || address.postal_code;
  const cityLine = [address.city, address.state, postalCode].filter(Boolean).join(", ");
  return [address.line1, address.line2, cityLine, address.country].filter(Boolean).join("\n") || "Not available";
}

export function formatStructuredValue(value: unknown): string {
  if (value == null || value === "") {
    return "Not available";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatStructuredValue).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue != null && entryValue !== "")
      .map(([key, entryValue]) => `${humanizeKey(key)}: ${formatStructuredValue(entryValue)}`)
      .join("\n") || "Not available";
  }

  return "Not available";
}

export function formatItemOptions(item: OrderItem) {
  if (item.optionSummary) {
    return item.optionSummary;
  }

  const selectedOptions = item.selectedOptions ?? item.variations ?? item.options;
  const formattedOptions = formatStructuredValue(selectedOptions);

  if (formattedOptions !== "Not available") {
    return formattedOptions;
  }

  return item.selectedOptionIds?.length ? item.selectedOptionIds.join(", ") : "None";
}

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (firstLetter) => firstLetter.toUpperCase());
}
