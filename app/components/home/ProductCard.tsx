import type { FeaturedProduct } from "~/models/home";

type ProductCardProps = {
  product: FeaturedProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 h-40 rounded-xl bg-stone-200" aria-hidden />
      <h4 className="text-lg font-semibold">{product.name}</h4>
      <p className="mt-1 text-sm text-stone-600">{product.material}</p>
      <p className="text-sm text-stone-600">{product.size}</p>
      <p className="mt-3 text-xl font-bold text-amber-900">{product.price}</p>
    </article>
  );
}
