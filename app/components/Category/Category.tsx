import type { FC } from 'react';

type CategoryProps = {
  image: string;
  title: string;
};

export const Category: FC<CategoryProps> = ({ image, title }) => {
  return (
    <article className="category-card">
      <img className="category-card__image" src={image} alt={title} />
      <h3 className="category-card__title">{title}</h3>
    </article>
  );
};
