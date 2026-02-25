import style from './MainDataSection.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

export function MainDataSection() {
  return (
    <div className="main-data-container">
      <section className="main-data-section">
        <div className="main-data-section__overlay">
          <p className="main-data-section__eyebrow">ONE-OF-A-KIND LIVE EDGE SLABS FOR ANY PROJECT</p>
          <h1 className="main-data-section__title">Providing Live Edge Wood Slabs &amp; Furniture</h1>
          <p className="main-data-section__description">
            Find a unique live edge wood slab perfect for your live edge table, bar top, mantle,
            charcuterie board, or any other live edge project.
          </p>
            <div className="main-data-section__buttons">
              <a href="#" className="main-data-section__button">DIY LIVE EDGE SLABS</a>
              <a href="#" className="main-data-section__button main-data-section__button--ghost">SOLID WOOD TABLES</a>
            </div>
        </div>
      </section>
    </div>
    
  );
}
