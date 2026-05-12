import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '../ProductCard/ProductCard';
import { fetchProducts, type Product } from '../../lib/products';
import style from './ProductCardList.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

function parsePrice(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getPreviewPrice(product: Product) {
  return product.pricingState?.basePrice ?? parsePrice(product.basePrice);
}

type ProductCardListProps = {
  archived?: boolean;
};

export function ProductCardList({ archived = false }: ProductCardListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [sortOrder, setSortOrder] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextProducts = await fetchProducts({ archived });

        if (isSubscribed) {
          setProducts(nextProducts);
        }
      } catch (error) {
        if (isSubscribed) {
          setProducts([]);
          const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;

          setErrorMessage(
            errorCode === 'permission-denied'
              ? 'Firestore ürün okuma izni kapalı. app/firestore.rules dosyasındaki products okuma kuralını Firebase Console veya Firebase CLI ile yayınlayın.'
              : error instanceof Error
                ? error.message
                : 'Ürünler yüklenirken bir hata oluştu.',
          );
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
  }, [archived]);

  const allCategories = useMemo(
    () => ['Tümü', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const searchValue = query.trim().toLowerCase();
    const nextProducts = products.filter((product) => {
      const matchesCategory = selectedCategory === 'Tümü' || product.category === selectedCategory;
      const normalizedText = `${product.title} ${product.description} ${product.category}`.toLowerCase();
      const matchesSearch = !searchValue || normalizedText.includes(searchValue);

      return matchesCategory && matchesSearch;
    });

    if (sortOrder === 'price-low') {
      return [...nextProducts].sort((first, second) => getPreviewPrice(first) - getPreviewPrice(second));
    }

    if (sortOrder === 'price-high') {
      return [...nextProducts].sort((first, second) => getPreviewPrice(second) - getPreviewPrice(first));
    }

    return nextProducts;
  }, [products, query, selectedCategory, sortOrder]);

  return (
    <section className="product-card-list" aria-label="Product list">
      <div className="product-card-list__toolbar">
        <div className="product-card-list__filters">
          <span className="product-card-list__label">Filtre:</span>

          <div className="product-card-list__field">
            <label htmlFor="product-category" className="product-card-list__label">
              Stok durumu
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

          <div className="product-card-list__field">
            <label htmlFor="product-search" className="product-card-list__label">
              Fiyat
            </label>
            <input
              id="product-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün ara"
              className="product-card-list__search"
            />
          </div>
        </div>

        <div className="product-card-list__sort">
          <label htmlFor="product-sort" className="product-card-list__sort-label">
            Sıralama ölçütü:
          </label>
          <select id="product-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="product-card-list__select">
            <option value="newest">En yeni</option>
            <option value="price-low">Fiyat, düşükten yükseğe</option>
            <option value="price-high">Fiyat, yüksekten düşüğe</option>
          </select>
          <span className="product-card-list__count">{filteredProducts.length} ürün</span>
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
            <ProductCard
              key={product.productId}
              product={product}
              onProductArchived={(productId) => setProducts((currentProducts) => currentProducts.filter((item) => item.productId !== productId))}
              onProductDeleted={(productId) => setProducts((currentProducts) => currentProducts.filter((item) => item.productId !== productId))}
            />
          ))}
        </div>
      )}
    </section>
  );
}
