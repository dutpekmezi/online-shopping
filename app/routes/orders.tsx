import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Route } from "./+types/orders";
import { AuthGuard } from "~/components/auth/AuthGuard";
import { NavBar } from "~/components/NavBar/NavBar";
import { useAuth } from "~/hooks/useAuth";
import { db } from "~/lib/firebase.client";
import { fetchProductsByIds, type Product } from "~/lib/products";
import {
  formatOrderCurrency,
  formatOrderDate,
  getOrderItemImage,
  getOrderItemProduct,
  getUniqueOrderProductIds,
  buildOrderProductMap,
  normalizeOrder,
  sortOrdersByCreatedAtDesc,
  type OrderRecord,
} from "~/lib/orders";
import navBarStylesHref from "~/components/NavBar/NavBar.css?url";
import ordersStylesHref from "./orders.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: navBarStylesHref },
  { rel: "stylesheet", href: ordersStylesHref },
];

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}

function OrdersContent() {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [productsById, setProductsById] = useState<Map<string, Product>>(new Map());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsErrorMessage, setProductsErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadOrders() {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const ordersQuery = isAdmin
          ? query(collection(db, "orders"))
          : query(collection(db, "orders"), where("userId", "==", user.uid));
        const snapshot = await getDocs(ordersQuery);
        const nextOrders = snapshot.docs.map((orderDocument) => normalizeOrder(orderDocument.data(), orderDocument.id));

        if (isSubscribed) {
          setOrders(sortOrdersByCreatedAtDesc(nextOrders));
        }
      } catch (error) {
        console.error("Orders could not be loaded.", error);

        if (isSubscribed) {
          setErrorMessage("Orders could not be loaded. Please check your account access and try again.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isSubscribed = false;
    };
  }, [isAdmin, user]);

  const visibleProductIds = useMemo(() => getUniqueOrderProductIds(orders), [orders]);

  useEffect(() => {
    let isSubscribed = true;

    async function loadProducts() {
      if (visibleProductIds.length === 0) {
        setProductsById(new Map());
        setProductsErrorMessage(null);
        setIsLoadingProducts(false);
        return;
      }

      setIsLoadingProducts(true);
      setProductsErrorMessage(null);

      try {
        const products = await fetchProductsByIds(visibleProductIds);

        if (isSubscribed) {
          setProductsById(buildOrderProductMap(products));
        }
      } catch (error) {
        console.error("Order product images could not be loaded.", error);

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
  }, [visibleProductIds]);

  return (
    <div className="orders-page">
      <NavBar />
      <main className="orders-shell">
        <header className="orders-header">
          <div>
            <p className="orders-kicker">{isAdmin ? "Admin" : "Account"}</p>
            <h1 className="orders-title">{isAdmin ? "Orders" : "My Orders"}</h1>
            <p className="orders-subtitle">
              {isAdmin
                ? "Review completed Stripe orders created by the webhook."
                : "Review your completed checkout orders."}
            </p>
          </div>
        </header>

        {isLoading ? <div className="orders-state">Loading orders...</div> : null}
        {errorMessage ? <div className="orders-state">{errorMessage}</div> : null}
        {isLoadingProducts && !errorMessage ? <div className="orders-state orders-state--inline">Loading product images...</div> : null}
        {productsErrorMessage && !errorMessage ? <div className="orders-state orders-state--inline">{productsErrorMessage}</div> : null}
        {!isLoading && !errorMessage && orders.length === 0 ? (
          <div className="orders-state">No completed orders were found.</div>
        ) : null}
        {!isLoading && !errorMessage && orders.length > 0 ? (
          <div className="orders-grid">
            {orders.map((order) => (
              <OrderCard order={order} productsById={productsById} key={order.id} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function OrderCard({ order, productsById }: { order: OrderRecord; productsById: Map<string, Product> }) {
  const items = order.items?.length ? order.items : [{}];
  const visibleItems = items.slice(0, 4);
  const currency = order.currency || "usd";

  return (
    <Link to={`/orders/${order.id}`} className="order-card" aria-label={`View order ${order.id}`}>
      <div className={`order-card__images${visibleItems.length === 1 ? " order-card__images--single" : ""}`}>
        {visibleItems.map((item, index) => {
          const product = getOrderItemProduct(item, productsById);

          return (
            <img
              src={getOrderItemImage(product)}
              alt={product?.title || "Ordered product"}
              className="order-card__image"
              key={`${order.id}-${item.productId || index}`}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = getOrderItemImage(null);
              }}
            />
          );
        })}
      </div>
      <div className="order-card__body">
        <div>
          <p className="order-card__id">Order {order.id}</p>
          <p className="order-card__total">{formatOrderCurrency(order.total, currency)}</p>
        </div>
        <div className="order-card__meta">
          <span className={`status-pill status-pill--${order.paymentStatus || "unknown"}`}>
            {order.paymentStatus || "Unknown"}
          </span>
          <span className="order-card__date">{formatOrderDate(order.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
