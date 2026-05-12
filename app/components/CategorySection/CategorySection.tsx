import { useEffect, useMemo, useState } from 'react';
import { defaultHomeContent, type HomeCategoryContent } from '../../lib/home-content';
import { fetchProducts, type Product } from '../../lib/products';
import { Category } from '../Category/Category';

type CategorySectionProps = {
  categories?: HomeCategoryContent[];
  isLoading?: boolean;
};

type CategoryPreviewImage = {
  imageUrl: string;
  title: string;
};

function normalizeCategoryName(categoryName: string) {
  return categoryName.trim().toLocaleLowerCase();
}

function getProductPreviewImage(product: Product) {
  return product.imageUrls?.[0] ?? product.images?.[0] ?? product.imageUrl;
}

function buildCategoryPreviewImages(products: Product[]) {
  return products.reduce<Record<string, CategoryPreviewImage[]>>((previewImagesByCategory, product) => {
    const normalizedCategory = normalizeCategoryName(product.category);
    const previewImageUrl = getProductPreviewImage(product);

    if (!normalizedCategory || !previewImageUrl || previewImagesByCategory[normalizedCategory]?.length >= 9) {
      return previewImagesByCategory;
    }

    previewImagesByCategory[normalizedCategory] = [
      ...(previewImagesByCategory[normalizedCategory] ?? []),
      {
        imageUrl: previewImageUrl,
        title: product.title,
      },
    ];

    return previewImagesByCategory;
  }, {});
}

export function CategorySection({ categories = defaultHomeContent.categories, isLoading = false }: CategorySectionProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;

    fetchProducts()
      .then((fetchedProducts) => {
        if (isMounted) {
          setProducts(fetchedProducts);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProducts([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryPreviewImages = useMemo(() => buildCategoryPreviewImages(products), [products]);

  return (
    <section className="category-section" aria-busy={isLoading}>
      <div className="category-section__container">
        <h2 className="category-section__title">Shop by Category</h2>
        {isLoading ? <p className="category-section__status">Loading category images…</p> : null}
        {!isLoading ? (
          <div className="category-section__grid">
            {categories.map((category, index) => (
              <Category
                key={category.id}
                imageUrl={category.imageUrl}
                title={category.title}
                fallbackImageUrl={defaultHomeContent.categories[index]?.imageUrl}
                previewImages={categoryPreviewImages[normalizeCategoryName(category.title)]}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
