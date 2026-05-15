import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { getCartSubtotal, readCartItems, writeCartItems, type CartItem } from '../lib/cart';
import { fetchCustomerAddresses, formatCustomerAddress, type CustomerAddress } from '../lib/addresses';
import { useAuth } from '../hooks/useAuth';
import type { Route } from './+types/cart';
import cartStylesHref from './cart.css?url';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: cartStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Your Cart | Online Shopping' },
    { name: 'description', content: 'View and edit your shopping cart.' },
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const { user, loading: isAuthLoading } = useAuth();

  useEffect(() => {
    setItems(readCartItems());
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    async function loadAddresses() {
      if (isAuthLoading) {
        return;
      }

      if (!user) {
        setAddresses([]);
        setSelectedAddressId('new');
        setIsLoadingAddresses(false);
        return;
      }

      setIsLoadingAddresses(true);

      try {
        const savedAddresses = await fetchCustomerAddresses(user.uid);

        if (isSubscribed) {
          setAddresses(savedAddresses);
          setSelectedAddressId(savedAddresses.find((address) => address.isDefault)?.id ?? savedAddresses[0]?.id ?? 'new');
        }
      } catch (error) {
        console.error('Saved addresses could not be loaded for checkout.', error);

        if (isSubscribed) {
          setAddresses([]);
          setSelectedAddressId('new');
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingAddresses(false);
        }
      }
    }

    loadAddresses();

    return () => {
      isSubscribed = false;
    };
  }, [isAuthLoading, user]);

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

  const startCheckout = async () => {
    setCheckoutError(null);

    if (items.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    setIsCheckingOut(true);

    try {
      const authToken = user ? await user.getIdToken() : null;
      const response = await fetch('/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedOptionIds: item.selectedOptionIds ?? [],
          })),
          selectedAddressId: selectedAddressId !== 'new' ? selectedAddressId : null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Stripe Checkout could not be started.');
      }

      window.location.assign(payload.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Stripe Checkout could not be started.');
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="cart-page">
        <nav className="cart-page__breadcrumbs" aria-label="Breadcrumb">
          <Link to="/home">Home</Link>
          <span aria-hidden="true">›</span>
          <span>Your Shopping Cart</span>
        </nav>

        <div className="cart-page__header">
          <h1 className="cart-page__title">Your Cart</h1>
          <Link className="cart-page__continue" to="/collections">
            Keep shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <section className="cart-page__empty" aria-label="Empty cart">
            <h2>Your cart is empty.</h2>
            <p>Add items you like to your cart, and you will see them here.</p>
            <Link className="cart-page__empty-link" to="/collections">
              Go to Collections
            </Link>
          </section>
        ) : (
          <>
            <div className="cart-page__table-heading" aria-hidden="true">
              <span>Item</span>
              <span>Qty</span>
              <span>Total</span>
            </div>

            <div className="cart-page__items">
              {items.map((item) => (
                <article className="cart-page__item" key={item.id}>
                  <div className="cart-page__product">
                    <Link className="cart-page__image-link" to={`/products/${item.productId}`} aria-label={`${item.title} details`}>
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
                    <div className="cart-page__quantity" aria-label={`${item.title} quantity`}>
                      <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
                        +
                      </button>
                    </div>
                    <button type="button" className="cart-page__remove" onClick={() => removeItem(item.id)} aria-label={`${item.title} remove item`}>
                      🗑
                    </button>
                  </div>

                  <div className="cart-page__line-total">{formatCurrency(item.price * item.quantity)}</div>
                </article>
              ))}
            </div>

            <section className="cart-page__summary" aria-label="Cart summary">
              <p className="cart-page__subtotal">
                <strong>Estimated total</strong>
                <span>{formatCurrency(subtotal)}</span>
              </p>
              <CheckoutAddressSelector
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                isLoading={isLoadingAddresses}
                onSelect={setSelectedAddressId}
              />
              <p className="cart-page__note">Taxes, discounts, and shipping are calculated at checkout. Stripe will still require delivery details before payment.</p>
              {checkoutError ? <p className="cart-page__error">{checkoutError}</p> : null}
              <button className="cart-page__checkout" type="button" onClick={startCheckout} disabled={isCheckingOut}>
                {isCheckingOut ? 'Redirecting to Stripe...' : 'Checkout'}
              </button>
            </section>
          </>
        )}
      </main>
    </>
  );
}


function CheckoutAddressSelector({ addresses, selectedAddressId, isLoading, onSelect }: { addresses: CustomerAddress[]; selectedAddressId: string; isLoading: boolean; onSelect: (addressId: string) => void }) {
  if (isLoading) {
    return <div className="cart-page__addresses">Loading saved addresses...</div>;
  }

  if (addresses.length === 0) {
    return (
      <div className="cart-page__addresses">
        <h2>Delivery address</h2>
        <p>No saved addresses found. You can enter a new delivery address in Stripe Checkout.</p>
      </div>
    );
  }

  return (
    <section className="cart-page__addresses" aria-labelledby="checkout-address-heading">
      <h2 id="checkout-address-heading">Delivery address</h2>
      <div className="cart-page__address-options">
        {addresses.map((address) => (
          <label className="cart-page__address-option" key={address.id}>
            <input type="radio" name="checkout-address" value={address.id} checked={selectedAddressId === address.id} onChange={() => onSelect(address.id)} />
            <span>
              <strong>{address.isDefault ? 'Default address' : `${address.firstName} ${address.lastName}`}</strong>
              <small>{formatCustomerAddress(address)}</small>
            </span>
          </label>
        ))}
        <label className="cart-page__address-option">
          <input type="radio" name="checkout-address" value="new" checked={selectedAddressId === 'new'} onChange={() => onSelect('new')} />
          <span>
            <strong>Use a new address</strong>
            <small>Enter a different shipping address in Stripe Checkout.</small>
          </span>
        </label>
      </div>
    </section>
  );
}
