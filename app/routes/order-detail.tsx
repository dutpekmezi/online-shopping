import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { doc, getDoc } from "firebase/firestore";
import type { Route } from "./+types/order-detail";
import { AuthGuard } from "~/components/auth/AuthGuard";
import { NavBar } from "~/components/NavBar/NavBar";
import { useAuth } from "~/hooks/useAuth";
import { db } from "~/lib/firebase.client";
import { fetchProductsByIds, type Product } from "~/lib/products";
import {
  formatAddress,
  getDeliveryAddressRows,
  formatItemOptions,
  formatOrderCurrency,
  formatOrderDate,
  getOrderItemImage,
  getOrderItemProduct,
  getOrderItemTitle,
  getUniqueOrderProductIds,
  buildOrderProductMap,
  normalizeOrder,
  type OrderItem,
  type OrderRecord,
} from "~/lib/orders";
import navBarStylesHref from "~/components/NavBar/NavBar.css?url";
import ordersStylesHref from "./orders.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: navBarStylesHref },
  { rel: "stylesheet", href: ordersStylesHref },
];

export default function OrderDetailPage() {
  return (
    <AuthGuard requireAdmin>
      <OrderDetailContent />
    </AuthGuard>
  );
}

function OrderDetailContent() {
  const { orderId } = useParams();
  const { user, isAdmin } = useAuth();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [productsById, setProductsById] = useState<Map<string, Product>>(new Map());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsErrorMessage, setProductsErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadOrder() {
      if (!orderId || !user) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const snapshot = await getDoc(doc(db, "orders", orderId));

        if (!snapshot.exists()) {
          throw new Error("Order not found.");
        }

        const nextOrder = normalizeOrder(snapshot.data(), snapshot.id);

        if (!isAdmin && nextOrder.userId !== user.uid) {
          throw new Error("You do not have access to this order.");
        }

        if (isSubscribed) {
          setOrder(nextOrder);
        }
      } catch (error) {
        console.error("Order could not be loaded.", error);

        if (isSubscribed) {
          setErrorMessage("Order could not be loaded. It may not exist or you may not have access.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      isSubscribed = false;
    };
  }, [isAdmin, orderId, user]);

  useEffect(() => {
    let isSubscribed = true;

    async function loadProducts() {
      const productIds = order ? getUniqueOrderProductIds([order]) : [];

      if (productIds.length === 0) {
        setProductsById(new Map());
        setProductsErrorMessage(null);
        setIsLoadingProducts(false);
        return;
      }

      setIsLoadingProducts(true);
      setProductsErrorMessage(null);

      try {
        const products = await fetchProductsByIds(productIds);

        if (isSubscribed) {
          setProductsById(buildOrderProductMap(products));
        }
      } catch (error) {
        console.error("Order detail product images could not be loaded.", error);

        if (isSubscribed) {
          setProductsById(new Map());
          setProductsErrorMessage("Some product images could not be loaded. Placeholder images are shown instead.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      isSubscribed = false;
    };
  }, [order]);

  return (
    <div className="orders-page">
      <NavBar />
      <main className="orders-shell">
        <Link to="/orders" className="order-back-link">
          ← Back to orders
        </Link>

        {isLoading ? <div className="orders-state">Loading order details...</div> : null}
        {errorMessage ? <div className="orders-state">{errorMessage}</div> : null}
        {isLoadingProducts && !errorMessage ? <div className="orders-state orders-state--inline">Loading product images...</div> : null}
        {productsErrorMessage && !errorMessage ? <div className="orders-state orders-state--inline">{productsErrorMessage}</div> : null}
        {!isLoading && !errorMessage && order ? <OrderDetail order={order} productsById={productsById} /> : null}
      </main>
    </div>
  );
}

function OrderDetail({ order, productsById }: { order: OrderRecord; productsById: Map<string, Product> }) {
  const currency = order.currency || "usd";

  return (
    <>
      <header className="orders-header">
        <div>
          <p className="orders-kicker">Order detail</p>
          <h1 className="orders-title">Order {order.id}</h1>
          <p className="orders-subtitle">Created {formatOrderDate(order.createdAt)}</p>
        </div>
        <span className={`status-pill status-pill--${order.paymentStatus || "unknown"}`}>
          {order.paymentStatus || "Unknown"}
        </span>
      </header>

      <div className="order-detail-grid">
        <div>
          <section className="order-section" aria-labelledby="products-heading">
            <h2 id="products-heading">Products</h2>
            <div className="order-products">
              {order.items?.length ? (
                order.items.map((item, index) => <OrderProduct item={item} productsById={productsById} currency={currency} key={`${item.productId}-${index}`} />)
              ) : (
                <p className="order-muted">No product line items were stored for this order.</p>
              )}
            </div>
          </section>

          <section className="order-section" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading">Delivery address</h2>
            <DefinitionList rows={getDeliveryAddressRows(order)} />
          </section>

          <section className="order-section" aria-labelledby="billing-heading">
            <h2 id="billing-heading">Billing address</h2>
            <DefinitionList rows={[["Billing address", formatAddress(order.billingAddress)]]} />
          </section>
        </div>

        <aside>
          <section className="order-section" aria-labelledby="summary-heading">
            <h2 id="summary-heading">Order summary</h2>
            <DefinitionList
              rows={[
                ["Order ID", order.id],
                ["Payment status", order.paymentStatus || "Unknown"],
                ["Subtotal", formatOrderCurrency(order.subtotal, currency)],
                ["Shipping", formatOrderCurrency(order.shippingCost, currency)],
                ["Total", formatOrderCurrency(order.total, currency)],
                ["Currency", currency.toUpperCase()],
                ["Created", formatOrderDate(order.createdAt)],
              ]}
            />
          </section>

          <section className="order-section" aria-labelledby="customer-heading">
            <h2 id="customer-heading">Customer contact</h2>
            <DefinitionList
              rows={[
                ["Name", order.customerName || "Not available"],
                ["Email", order.customerEmail || "Not available"],
                ["Phone", order.customerPhone || "Not available"],
              ]}
            />
          </section>

          <section className="order-section" aria-labelledby="metadata-heading">
            <h2 id="metadata-heading">Stripe/payment metadata</h2>
            <DefinitionList
              rows={[
                ["Stripe session ID", order.stripeSessionId || "Not available"],
                ["Payment intent ID", order.stripePaymentIntentId || "Not available"],
                ["Firebase user ID", order.userId || "Not available"],
              ]}
            />
          </section>
        </aside>
      </div>
    </>
  );
}

function OrderProduct({ item, productsById, currency }: { item: OrderItem; productsById: Map<string, Product>; currency: string }) {
  const quantity = item.quantity ?? 0;
  const unitAmount = item.unitAmount ?? item.unit_amount ?? 0;
  const product = getOrderItemProduct(item, productsById);

  return (
    <article className="order-product">
      <img
        src={getOrderItemImage(product)}
        alt={product?.title || getOrderItemTitle(item)}
        className="order-product__image"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = getOrderItemImage(null);
        }}
      />
      <div>
        <p className="order-product__title">{getOrderItemTitle(item)}</p>
        <div className="order-product__meta">
          <span>Quantity: {quantity}</span>
          <span>Unit amount: {formatOrderCurrency(unitAmount, currency)}</span>
          <span>Subtotal: {formatOrderCurrency(item.subtotal, currency)}</span>
          <span>Total: {formatOrderCurrency(item.total ?? item.subtotal, currency)}</span>
          <span>Product ID: {item.productId || "Not available"}</span>
        </div>
        <div className="order-product__options">
          <strong>Selected options:</strong> {formatItemOptions(item)}
        </div>
      </div>
    </article>
  );
}

function DefinitionList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="order-definition-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
