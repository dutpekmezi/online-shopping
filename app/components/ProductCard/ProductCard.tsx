import type { Product } from '../../lib/products';
import style from './ProductCard.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card">
      <img className="product-card__image" src={product.imageUrl} alt={product.title} loading="lazy" />
      <div className="product-card__content">
        <h2 className="product-card__title">{product.title}</h2>
        <p className="product-card__category">Kategori: {product.category}</p>
        <p className="product-card__description">{product.description}</p>
      </div>
    </article>
  );
}
