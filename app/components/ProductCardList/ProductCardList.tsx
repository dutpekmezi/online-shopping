import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '../ProductCard/ProductCard';
import { fetchProducts, type Product } from '../../lib/products';
import style from './ProductCardList.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

export function ProductCardList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextProducts = await fetchProducts();

        if (isSubscribed) {
          setProducts(nextProducts);
        }
      } catch (error) {
        if (isSubscribed) {
          setProducts([]);
          setErrorMessage(error instanceof Error ? error.message : 'Ürünler yüklenirken bir hata oluştu.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const allCategories = useMemo(
    () => ['Tümü', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const searchValue = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'Tümü' || product.category === selectedCategory;
      const normalizedText = `${product.title} ${product.description} ${product.category}`.toLowerCase();
      const matchesSearch = !searchValue || normalizedText.includes(searchValue);

      return matchesCategory && matchesSearch;
    });
  }, [products, query, selectedCategory]);

  return (
    <section className="product-card-list" aria-label="Product list">
      <div className="product-card-list__toolbar">
        <div className="product-card-list__field">
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

        <div className="product-card-list__field">
          <label htmlFor="product-category" className="product-card-list__label">
            Kategori
          </label>
          <select
            id="product-category"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="product-card-list__select"
          >
            {allCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="product-card-list__status">Ürünler yükleniyor...</p>}
      {errorMessage && <p className="product-card-list__status product-card-list__status--error">{errorMessage}</p>}

      {!isLoading && !errorMessage && filteredProducts.length === 0 && (
        <p className="product-card-list__status">Gösterilecek ürün bulunamadı.</p>
      )}

      {!isLoading && !errorMessage && filteredProducts.length > 0 && (
        <div className="product-card-list__grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
