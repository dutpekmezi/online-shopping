import { defaultHomeContent, type HomeCategoryContent } from '../../lib/home-content';
import { Category } from '../Category/Category';

type CategorySectionProps = {
  categories?: HomeCategoryContent[];
  isLoading?: boolean;
};

export function CategorySection({ categories = defaultHomeContent.categories, isLoading = false }: CategorySectionProps) {
  return (
    <section className="category-section" aria-busy={isLoading}>
      <div className="category-section__container">
        <h2 className="category-section__title">Shop by Category</h2>
        {isLoading ? <p className="category-section__status">Loading category images…</p> : null}
        <div className="category-section__grid">
          {categories.map((category, index) => (
            <Category key={category.id} imageUrl={category.imageUrl} title={category.title} fallbackImageUrl={defaultHomeContent.categories[index]?.imageUrl} />
          ))}
        </div>
      </div>
    </section>
  );
}
