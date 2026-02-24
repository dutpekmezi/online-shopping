import { ProductCard } from "~/components/home/ProductCard";
import type { FeaturedProduct } from "~/models/home";

type FeaturedProductsSectionProps = {
  featuredProducts: FeaturedProduct[];
};

export function FeaturedProductsSection({ featuredProducts }: FeaturedProductsSectionProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div className="mb-6 flex items-end justify-between">
        <h3 className="text-2xl font-semibold">Öne Çıkan Ürünler</h3>
        <a className="text-sm font-semibold text-amber-800 hover:text-amber-700" href="#">
          Tüm Ürünler →
        </a>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {featuredProducts.map((product) => (
          <ProductCard key={product.name} product={product} />
        ))}
      </div>
    </section>
  );
}
