import { Link } from 'react-router';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import cartStylesHref from './cart.css?url';
import type { Route } from './+types/checkout.success';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: cartStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Checkout Complete | Online Shopping' },
    { name: 'description', content: 'Your Stripe Checkout payment was completed.' },
  ];
}

export default function CheckoutSuccess() {
  return (
    <>
      <NavBar />
      <main className="cart-page">
        <section className="cart-page__empty" aria-label="Checkout success">
          <h1>Thank you for your order!</h1>
          <p>Your payment was completed with Stripe Checkout. We are preparing your order now.</p>
          <Link className="cart-page__empty-link" to="/collections">
            Continue shopping
          </Link>
        </section>
      </main>
    </>
  );
}
