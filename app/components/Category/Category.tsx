import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { defaultHomeContent, resolveHomeImageUrl } from '../../lib/home-content';

type CategoryProps = {
  imageUrl: string;
  title: string;
  fallbackImageUrl?: string;
};

export const Category: FC<CategoryProps> = ({ imageUrl, title, fallbackImageUrl = defaultHomeContent.categories[0].imageUrl }) => {
  const resolvedImageUrl = resolveHomeImageUrl(imageUrl);
  const resolvedFallbackImageUrl = resolveHomeImageUrl(fallbackImageUrl);
  const [displayImageUrl, setDisplayImageUrl] = useState(resolvedImageUrl);

  useEffect(() => {
    setDisplayImageUrl(resolvedImageUrl);
  }, [resolvedImageUrl]);

  return (
    <article className="category-card">
      <img
        className="category-card__image"
        src={displayImageUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        onError={() => setDisplayImageUrl(resolvedFallbackImageUrl)}
      />
      <h3 className="category-card__title">{title}</h3>
    </article>
  );
};
