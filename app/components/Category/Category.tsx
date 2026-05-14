import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { defaultHomeContent, resolveHomeImageUrl } from '../../lib/home-content';

type CategoryPreviewImage = {
  imageUrl: string;
  title: string;
};

type CategoryProps = {
  imageUrl: string;
  title: string;
  fallbackImageUrl?: string;
  previewImages?: CategoryPreviewImage[];
  to?: string;
};

export const Category: FC<CategoryProps> = ({ imageUrl, title, fallbackImageUrl = defaultHomeContent.categories[0].imageUrl, previewImages = [], to }) => {
  const resolvedImageUrl = resolveHomeImageUrl(imageUrl);
  const resolvedFallbackImageUrl = resolveHomeImageUrl(fallbackImageUrl);
  const [displayImageUrl, setDisplayImageUrl] = useState(resolvedImageUrl);
  const visiblePreviewImages = useMemo(() => previewImages.slice(0, 9), [previewImages]);

  useEffect(() => {
    setDisplayImageUrl(resolvedImageUrl);
  }, [resolvedImageUrl]);

  const cardContent = (
    <>
      <div className="category-card__media">
        <img
          className="category-card__image"
          src={displayImageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setDisplayImageUrl(resolvedFallbackImageUrl)}
        />
        {visiblePreviewImages.length > 0 ? (
          <div
            className={`category-card__preview-grid category-card__preview-grid--count-${visiblePreviewImages.length}`}
            aria-label={`${title} product previews`}
          >
            {visiblePreviewImages.map((previewImage, index) => (
              <img
                key={`${previewImage.imageUrl}-${index}`}
                className="category-card__preview-image"
                src={previewImage.imageUrl}
                alt={previewImage.title}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="category-card__content">
        <h3 className="category-card__title">{title}</h3>
      </div>
    </>
  );

  return (
    <article className="category-card">
      {to ? (
        <Link className="category-card__link" to={to} aria-label={`View ${title} products`}>
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </article>
  );
};
