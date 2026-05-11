import type { CSSProperties } from 'react';
import { defaultHomeContent, resolveHomeImageUrl, type HomeContent } from '../../lib/home-content';
import style from './MainDataSection.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

type MainDataSectionProps = {
  content?: Pick<HomeContent, 'heroImage' | 'heroEyebrow' | 'heroTitle' | 'heroDescription'>;
};

export function MainDataSection({ content = defaultHomeContent }: MainDataSectionProps) {
  const heroImageUrl = resolveHomeImageUrl(content.heroImage);

  return (
    <div className="main-data-container">
      <section
        className="main-data-section"
        style={{ '--hero-image-url': `url(${heroImageUrl})` } as CSSProperties}
      >
        <div className="main-data-section__overlay">
          <p className="main-data-section__eyebrow">{content.heroEyebrow}</p>
          <h1 className="main-data-section__title">{content.heroTitle}</h1>
          <p className="main-data-section__description">{content.heroDescription}</p>
          <div className="main-data-section__buttons">
            <a href="#" className="main-data-section__button">DIY LIVE EDGE SLABS</a>
            <a href="#" className="main-data-section__button main-data-section__button--ghost">SOLID WOOD TABLES</a>
          </div>
        </div>
      </section>
    </div>
  );
}
