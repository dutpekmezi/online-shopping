import { useEffect, useState } from 'react';
import { defaultHomeContent, resolveHomeImageUrl, type HomeContent } from '../../lib/home-content';
import style from './MainDataSection.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

type MainDataSectionProps = {
  content?: Pick<HomeContent, 'heroImageUrl' | 'heroEyebrow' | 'heroTitle' | 'heroDescription'>;
  isLoading?: boolean;
};

export function MainDataSection({ content = defaultHomeContent, isLoading = false }: MainDataSectionProps) {
  const fallbackHeroImageUrl = resolveHomeImageUrl(defaultHomeContent.heroImageUrl);
  const heroImageUrl = resolveHomeImageUrl(content.heroImageUrl);
  const [resolvedHeroImageUrl, setResolvedHeroImageUrl] = useState(heroImageUrl);

  useEffect(() => {
    setResolvedHeroImageUrl(heroImageUrl);
  }, [heroImageUrl]);

  return (
    <div className="main-data-container">
      <section className={`main-data-section ${isLoading ? 'main-data-section--loading' : ''}`} aria-busy={isLoading}>
        <img
          className="main-data-section__image"
          src={resolvedHeroImageUrl}
          alt="Live edge wood slab furniture"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={() => setResolvedHeroImageUrl(fallbackHeroImageUrl)}
        />
        <div className="main-data-section__overlay">
          {isLoading ? <span className="main-data-section__loading">Loading homepage content…</span> : null}
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
