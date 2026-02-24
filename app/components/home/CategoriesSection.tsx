import { CategoryCard } from "~/components/home/CategoryCard";
import type { Category } from "~/models/home";

type CategoriesSectionProps = {
  categories: Category[];
};

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16">
      <h3 className="mb-6 text-2xl font-semibold">Kategoriler</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((item) => (
          <CategoryCard key={item.name} category={item} />
        ))}
      </div>
    </section>
  );
}
