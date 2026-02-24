import { useMemo, useState } from "react";
import type { CollectionGroup, CollectionProduct } from "~/models/home";

type CollectionsSectionProps = {
  products: CollectionProduct[];
  initialFilter?: CollectionGroup | "all";
};

const filterButtons: { label: string; value: CollectionGroup | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Dining", value: "dining" },
  { label: "Living", value: "living" },
];

export function CollectionsSection({ products, initialFilter = "all" }: CollectionsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<CollectionGroup | "all">(initialFilter);

  const filteredProducts = useMemo(() => {
    if (activeFilter === "all") {
      return products;
    }

    return products.filter((product) => product.group === activeFilter);
  }, [activeFilter, products]);

  return (
    <section id="collections" className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Collections</p>
          <h3 className="mt-2 text-3xl font-semibold text-stone-900">Tüm Ürünler</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {filterButtons.map((button) => (
            <button
              key={button.value}
              type="button"
              onClick={() => setActiveFilter(button.value)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${
                activeFilter === button.value
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <article key={product.name} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="h-52 bg-gradient-to-br from-stone-300 via-stone-200 to-stone-100" aria-hidden />
            <div className="space-y-1 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                {product.group}
              </p>
              <h4 className="text-lg font-semibold text-stone-900">{product.name}</h4>
              <p className="text-sm text-stone-600">{product.material}</p>
              <p className="text-sm text-stone-600">{product.size}</p>
              <p className="pt-1 text-lg font-bold text-stone-900">{product.price}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
