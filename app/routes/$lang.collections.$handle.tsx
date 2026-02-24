import { Breadcrumbs } from "~/components/shop/Breadcrumbs";
import { CollectionHeader } from "~/components/shop/CollectionHeader";
import { Facets } from "~/components/shop/Facets";
import { ProductGrid } from "~/components/shop/ProductGrid";
import { SortSelect } from "~/components/shop/SortSelect";
import { getCollectionByHandle, getProducts } from "~/lib/shopApi.server";
import type { Lang } from "~/lib/types";

export async function loader({ params }: { params: { lang?: string; handle?: string } }) {
  const lang = (params.lang ?? "tr") as Lang;
  const handle = params.handle ?? "";
  const [collection, products] = await Promise.all([getCollectionByHandle(handle), getProducts(handle)]);
  return { lang, collection, products };
}

export default function CollectionPage({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  if (!loaderData.collection) return <p>Collection not found.</p>;
  return <div className="space-y-4"><Breadcrumbs items={["Home", "Collections", loaderData.collection.title]} /><CollectionHeader title={loaderData.collection.title} description={loaderData.collection.description} /><Facets /><SortSelect /><ProductGrid lang={loaderData.lang} products={loaderData.products} /></div>;
}
