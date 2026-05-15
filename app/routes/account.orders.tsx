import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Route } from "./+types/account.orders";
import { AuthGuard } from "~/components/auth/AuthGuard";
import { NavBar } from "~/components/NavBar/NavBar";
import { useAuth } from "~/hooks/useAuth";
import { db } from "~/lib/firebase.client";
import { fetchProductsByIds, type Product } from "~/lib/products";
import {
  buildOrderProductMap,
  formatOrderCurrency,
  formatOrderDate,
  getOrderItemImage,
  getOrderItemProduct,
  getUniqueOrderProductIds,
  normalizeOrder,
  sortOrdersByCreatedAtDesc,
  type OrderRecord,
} from "~/lib/orders";
import navBarStylesHref from "~/components/NavBar/NavBar.css?url";
import ordersStylesHref from "./orders.css?url";
import accountStylesHref from "./account.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: navBarStylesHref },
  { rel: "stylesheet", href: ordersStylesHref },
  { rel: "stylesheet", href: accountStylesHref },
];

export default function AccountOrdersPage() {
  return (
    <AuthGuard>
      <AccountOrdersContent />
    </AuthGuard>
  );
}

function AccountTabs() {
  return (
    <nav className="account-tabs" aria-label="Account sections">
      <NavLink to="/account/orders" className={({ isActive }) => `account-tab${isActive ? " account-tab--active" : ""}`}>
        Siparişler
      </NavLink>
      <NavLink to="/account/profile" className={({ isActive }) => `account-tab${isActive ? " account-tab--active" : ""}`}>
        Profil
      </NavLink>
    </nav>
  );
}

function AccountOrdersContent() {
  const { user } = useAuth();
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
        const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
        const snapshot = await getDocs(ordersQuery);
        const nextOrders = snapshot.docs.map((orderDocument) => normalizeOrder(orderDocument.data(), orderDocument.id));

        if (isSubscribed) {
          setOrders(sortOrdersByCreatedAtDesc(nextOrders));
        }
      } catch (error) {
        console.error("Customer orders could not be loaded.", error);

        if (isSubscribed) {
          setErrorMessage("Siparişler yüklenemedi. Lütfen tekrar deneyin.");
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
  }, [user]);

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
          setProductsErrorMessage("Bazı ürün görselleri yüklenemedi.");
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
    <div className="account-page">
      <NavBar />
      <main className="account-shell">
        <header className="account-header">
          <div>
            <p className="account-kicker">Online Shopping</p>
            <h1 className="account-title">Hesabım</h1>
            <p className="account-subtitle">Geçmiş siparişlerinizi görüntüleyin.</p>
          </div>
        </header>
        <AccountTabs />

        {isLoading ? <div className="orders-state">Siparişler yükleniyor...</div> : null}
        {errorMessage ? <div className="orders-state">{errorMessage}</div> : null}
        {isLoadingProducts && !errorMessage ? <div className="orders-state orders-state--inline">Ürün görselleri yükleniyor...</div> : null}
        {productsErrorMessage && !errorMessage ? <div className="orders-state orders-state--inline">{productsErrorMessage}</div> : null}
        {!isLoading && !errorMessage && orders.length === 0 ? (
          <div className="orders-state">No orders yet. Visit the shop to place an order.</div>
        ) : null}
        {!isLoading && !errorMessage && orders.length > 0 ? (
          <div className="orders-grid">
            {orders.map((order) => (
              <CustomerOrderCard order={order} productsById={productsById} key={order.id} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function CustomerOrderCard({ order, productsById }: { order: OrderRecord; productsById: Map<string, Product> }) {
  const items = order.items?.length ? order.items : [{}];
  const visibleItems = items.slice(0, 4);
  const currency = order.currency || "usd";

  return (
    <Link to={`/account/orders/${order.id}`} className="order-card" aria-label={`View order ${order.id}`}>
      <div className={`order-card__images${visibleItems.length === 1 ? " order-card__images--single" : ""}`}>
        {visibleItems.map((item, index) => {
          const product = getOrderItemProduct(item, productsById);
          return (
            <img
              src={getOrderItemImage(product)}
              alt={product?.title || "Purchased product"}
              className="order-card__image"
              loading="lazy"
              key={`${item.productId ?? "item"}-${index}`}
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
          <span className={`status-pill status-pill--${order.paymentStatus || "unknown"}`}>{order.paymentStatus || "Unknown"}</span>
          <span className="order-card__date">{formatOrderDate(order.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
