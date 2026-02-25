import type { ReactNode } from 'react';
import { Link } from 'react-router';
import style from './NavBar.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

const topLinks = [
  { label: 'Shop', to: '/shop' },
  { label: 'Contact Us', to: '/contact-us' },
  { label: 'Shipping Info', to: '/shipping-info' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'About Us', to: '/about-us' },
  { label: 'Compare Products', to: '/compare-products' },
  { label: 'Collections', to: '/collections' },
];

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a href={href} aria-label={label} className="navbar__social-link" target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function NavBar() {
  return (
    <header className="navbar">
      <div className="navbar__contact-row">
        <div className="navbar__contact-content">
          <div className="navbar__contact-info">
            <span>E-mail us</span>
            <span className="navbar__divider">|</span>
            <span>(515) 832-8733</span>
          </div>

          <div className="navbar__socials" aria-label="Social media">
            <SocialIcon href="https://facebook.com" label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.5 22v-8h2.7l.4-3h-3.1V9c0-.9.3-1.5 1.6-1.5h1.7V4.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.3v2.4H7.5v3h2.7v8h3.3Z" />
              </svg>
            </SocialIcon>
            <SocialIcon href="https://instagram.com" label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.5 2h9C19.5 2 22 4.5 22 7.5v9c0 3-2.5 5.5-5.5 5.5h-9C4.5 22 2 19.5 2 16.5v-9C2 4.5 4.5 2 7.5 2Zm-.2 2.2A3.1 3.1 0 0 0 4.2 7.3v9.4c0 1.7 1.4 3.1 3.1 3.1h9.4c1.7 0 3.1-1.4 3.1-3.1V7.3c0-1.7-1.4-3.1-3.1-3.1H7.3ZM17.8 6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" />
              </svg>
            </SocialIcon>
            <SocialIcon href="https://pinterest.com" label="Pinterest">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.1 2C6.8 2 4 5.4 4 9.2c0 2.3 1.3 5.1 3.3 6 .3.1.4 0 .5-.2l.5-1.9c.1-.2 0-.3-.2-.6-.5-.7-.9-1.9-.9-3 0-2.9 2.2-5.8 6-5.8 3.3 0 5.5 2.3 5.5 5 0 3.3-1.7 5.7-3.9 5.7-1.2 0-2-1-1.8-2.2.3-1.4.9-2.9.9-3.9 0-.9-.5-1.7-1.6-1.7-1.3 0-2.3 1.3-2.3 3.1 0 1.1.4 1.9.4 1.9l-1.4 5.8c-.4 1.7 0 4.5 0 4.8 0 .2.2.3.3.1.1-.2 1.2-1.8 1.7-3.5.1-.5.8-3.1.8-3.1.4.7 1.6 1.3 2.9 1.3 3.8 0 6.5-3.5 6.5-7.9C20 5.3 16.7 2 12.1 2Z" />
              </svg>
            </SocialIcon>
          </div>
        </div>
      </div>

      <div className="navbar__main-row">
        <div className="navbar__brand">
          <Link to="/home" className="navbar__brand-name">EDACraftAtelier</Link>
        </div>

        <nav className="navbar__menu" aria-label="Main navigation">
          {topLinks.map((link) => (
            <Link to={link.to} key={link.to} className="navbar__menu-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="navbar__actions" aria-label="Quick actions">
          <button type="button" aria-label="Account" className="navbar__icon-button">👤</button>
          <button type="button" aria-label="Search" className="navbar__icon-button">🔍</button>
          <button type="button" aria-label="Cart" className="navbar__icon-button navbar__cart-button">
            🛒
            <span className="navbar__cart-count">0</span>
          </button>
        </div>
      </div>
    </header>
  );
}
