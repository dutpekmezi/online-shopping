import { useMemo, useState } from 'react';
import { ProductCard, type Product } from '../ProductCard/ProductCard';
import productsText from '../../data/products.txt?raw';
import style from './ProductCardList.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

function resolveImageUrl(imageUrl: string) {
  if (imageUrl === 'App/Images/MainSectionImage.JPG') {
    return new URL('../../Images/MainSectionImage.JPG', import.meta.url).href;
  }

  return imageUrl;
}

function parseProductsFromText(text: string): Product[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Product)
    .map((product) => ({
      ...product,
      imageUrl: resolveImageUrl(product.imageUrl),
    }));
}

const products = parseProductsFromText(productsText);

export function ProductCardList() {
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const searchValue = query.trim().toLowerCase();

    if (!searchValue) {
      return products;
    }

    return products.filter((product) => {
      const normalizedText = `${product.title} ${product.description}`.toLowerCase();
      return normalizedText.includes(searchValue);
    });
  }, [query]);

  return (
    <section className="product-card-list" aria-label="Product list">
      <div className="product-card-list__toolbar">
        <label htmlFor="product-search" className="product-card-list__label">
          Ürün Filtrele
        </label>
        <input
          id="product-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Başlık veya açıklama ile ara"
          className="product-card-list__search"
        />
      </div>

      <div className="product-card-list__grid">
        {filteredProducts.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>
    </section>
  );
}
