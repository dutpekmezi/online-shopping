import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { getCartSubtotal, readCartItems, writeCartItems, type CartItem } from '../lib/cart';
import type { Route } from './+types/cart';
import cartStylesHref from './cart.css?url';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: cartStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Sepetiniz | Online Shopping' },
    { name: 'description', content: 'Alışveriş sepetinizi görüntüleyin ve düzenleyin.' },
  ];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCartItems());
  }, []);

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);

  const syncItems = (nextItems: CartItem[]) => {
    setItems(nextItems);
    writeCartItems(nextItems);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    syncItems(items.map((item) => (item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item)));
  };

  const removeItem = (itemId: string) => {
    syncItems(items.filter((item) => item.id !== itemId));
  };

  return (
    <>
      <NavBar />
      <main className="cart-page">
        <nav className="cart-page__breadcrumbs" aria-label="Breadcrumb">
          <Link to="/home">Home</Link>
          <span aria-hidden="true">›</span>
          <span>Alışveriş Sepetiniz</span>
        </nav>

        <div className="cart-page__header">
          <h1 className="cart-page__title">Sepetiniz</h1>
          <Link className="cart-page__continue" to="/collections">
            Alışverişe devam et
          </Link>
        </div>

        {items.length === 0 ? (
          <section className="cart-page__empty" aria-label="Boş sepet">
            <h2>Sepetiniz boş.</h2>
            <p>Beğendiğiniz ürünleri sepetinize ekleyerek bu sayfada görebilirsiniz.</p>
            <Link className="cart-page__empty-link" to="/collections">
              Koleksiyonlara git
            </Link>
          </section>
        ) : (
          <>
            <div className="cart-page__table-heading" aria-hidden="true">
              <span>Ürün</span>
              <span>Adet</span>
              <span>Toplam</span>
            </div>

            <div className="cart-page__items">
              {items.map((item) => (
                <article className="cart-page__item" key={item.id}>
                  <div className="cart-page__product">
                    <Link className="cart-page__image-link" to={`/products/${item.productId}`} aria-label={`${item.title} detayına git`}>
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : null}
                    </Link>
                    <div>
                      <Link className="cart-page__product-title" to={`/products/${item.productId}`}>
                        {item.title}
                      </Link>
                      <p className="cart-page__unit-price">{formatCurrency(item.price)}</p>
                      {item.optionSummary ? <p className="cart-page__option">{item.optionSummary}</p> : null}
                      <Link className="cart-page__edit" to={`/products/${item.productId}`}>
                        Edit options
                      </Link>
                    </div>
                  </div>

                  <div className="cart-page__quantity-area">
                    <div className="cart-page__quantity" aria-label={`${item.title} adedi`}>
                      <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Adedi azalt">
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Adedi artır">
                        +
                      </button>
                    </div>
                    <button type="button" className="cart-page__remove" onClick={() => removeItem(item.id)} aria-label={`${item.title} ürününü kaldır`}>
                      🗑
                    </button>
                  </div>

                  <div className="cart-page__line-total">{formatCurrency(item.price * item.quantity)}</div>
                </article>
              ))}
            </div>

            <section className="cart-page__summary" aria-label="Sepet özeti">
              <p className="cart-page__subtotal">
                <strong>Tahmini toplam</strong>
                <span>{formatCurrency(subtotal)}</span>
              </p>
              <p className="cart-page__note">Vergiler, indirimler ve kargo, ödeme sayfasında hesaplanır.</p>
              <button className="cart-page__checkout" type="button">
                Ödemeye geç
              </button>
            </section>
          </>
        )}
      </main>
    </>
  );
}
