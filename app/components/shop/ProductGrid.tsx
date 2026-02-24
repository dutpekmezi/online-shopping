import type { Lang, Product } from "~/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ lang, products }: { lang: Lang; products: Product[] }) {
  return <section className="grid gap-2">{products.map((product) => <ProductCard key={product.handle} lang={lang} product={product} />)}</section>;
}
