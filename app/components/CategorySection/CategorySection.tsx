import { defaultHomeContent, type HomeCategoryContent } from '../../lib/home-content';
import { Category } from '../Category/Category';

type CategorySectionProps = {
  categories?: HomeCategoryContent[];
};

export function CategorySection({ categories = defaultHomeContent.categories }: CategorySectionProps) {
  return (
    <section className="category-section">
      <div className="category-section__container">
        <h2 className="category-section__title">Shop by Category</h2>
        <div className="category-section__grid">
          {categories.map((category) => (
            <Category key={category.id} image={category.image} title={category.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
