import { useEffect, useState } from 'react';
import { defaultHomeContent, resolveHomeImageUrl, type HomeContent } from '../../lib/home-content';
import style from './MainDataSection.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

type MainDataSectionProps = {
  content?: Pick<HomeContent, 'heroImageUrl' | 'heroEyebrow' | 'heroTitle' | 'heroDescription'>;
};

export function MainDataSection({ content = defaultHomeContent }: MainDataSectionProps) {
  const fallbackHeroImageUrl = resolveHomeImageUrl(defaultHomeContent.heroImageUrl);
  const heroImageUrl = resolveHomeImageUrl(content.heroImageUrl);
  const [imageErrorBySrc, setImageErrorBySrc] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setImageErrorBySrc(new Set());
  }, [heroImageUrl]);

  const hasHeroImageError = imageErrorBySrc.has(heroImageUrl);
  const canUseFallback = heroImageUrl !== fallbackHeroImageUrl && !imageErrorBySrc.has(fallbackHeroImageUrl);
  const heroImageSrc = hasHeroImageError ? (canUseFallback ? fallbackHeroImageUrl : '') : heroImageUrl;

  return (
    <div className="main-data-container">
      <section className="main-data-section">
        {heroImageSrc ? (
          <img
            key={heroImageSrc}
            className="main-data-section__image"
            src={heroImageSrc}
            alt="Live edge wood slab furniture"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={() => {
              setImageErrorBySrc((currentImageErrorBySrc) => new Set(currentImageErrorBySrc).add(heroImageSrc));
            }}
          />
        ) : null}
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
