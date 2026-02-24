import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { CollectionsSection } from "~/components/home/CollectionsSection";
import { SiteFooter } from "~/components/home/SiteFooter";
import { Navbar } from "~/components/layout/navbar/Navbar";
import { collectionProducts, type CollectionGroup } from "~/models/home";
import type { Route } from "./+types/collections";

const validFilters: CollectionGroup[] = ["dining", "living"];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Koleksiyonlar | Gül Natural" },
    {
      name: "description",
      content: "Dining ve living koleksiyonlarımızı filtreleyerek tüm ürünleri inceleyin.",
    },
  ];
}

export default function Collections() {
  const [searchParams] = useSearchParams();

  const initialFilter = useMemo(() => {
    const filterParam = searchParams.get("group");

    return validFilters.includes(filterParam as CollectionGroup)
      ? (filterParam as CollectionGroup)
      : "all";
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-[#f6f3ef] pt-44 text-stone-800 lg:pt-48">
      <Navbar />
      <CollectionsSection products={collectionProducts} initialFilter={initialFilter} />
      <SiteFooter />
    </main>
  );
}
