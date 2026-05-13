import { Link } from 'react-router';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import cartStylesHref from './cart.css?url';
import type { Route } from './+types/checkout.cancel';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: cartStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Checkout Canceled | Online Shopping' },
    { name: 'description', content: 'Your Stripe Checkout payment was canceled.' },
  ];
}

export default function CheckoutCancel() {
  return (
    <>
      <NavBar />
      <main className="cart-page">
        <section className="cart-page__empty" aria-label="Checkout canceled">
          <h1>Checkout canceled</h1>
          <p>Your cart was not charged. Return to your cart when you are ready to try again.</p>
          <Link className="cart-page__empty-link" to="/cart">
            Return to cart
          </Link>
        </section>
      </main>
    </>
  );
}
