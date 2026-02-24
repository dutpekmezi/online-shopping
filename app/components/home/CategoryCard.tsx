import type { Category } from "~/models/home";

type CategoryCardProps = {
  category: Category;
};

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h4 className="text-lg font-semibold">{category.name}</h4>
      <p className="mt-2 text-sm text-stone-600">{category.desc}</p>
    </article>
  );
}
