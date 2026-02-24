import { Link } from "react-router";
import { formatMoney } from "~/lib/money";
import type { Lang, Product } from "~/lib/types";
import { Price } from "./Price";

export function ProductCard({ lang, product }: { lang: Lang; product: Product }) {
  return <article><Link to={`/${lang}/products/${product.handle}`}>{product.title}</Link> - <Price value={formatMoney(product.price, lang)} /></article>;
}
