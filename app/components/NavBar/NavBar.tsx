import style from './NavBar.css?url';

export function links() {
    return [
        { rel: 'stylesheet', href: style },
    ];
}

const topLinks = ["Shop +", "Contact Us", "Shipping Info", "Gallery", "About Us", "Compare Products"];

export function NavBar() {
  return (
    <header className="navbar">
      <div className="navbar__contact-row">
        <div className="navbar__contact-content">
          <span>E-mail us</span>
          <span className="navbar__divider">|</span>
          <span>(515) 832-8733</span>
        </div>
      </div>

      <div className="navbar__promo-row">Customizable Tables At 30% Off!</div>

      <div className="navbar__main-row">
        <div className="navbar__brand">
          <span className="navbar__brand-name">EDACraftAtelier</span>
        </div>

        <nav className="navbar__menu" aria-label="Main navigation">
          {topLinks.map((link) => (
            <a href="#" key={link} className="navbar__menu-link">
              {link}
            </a>
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
