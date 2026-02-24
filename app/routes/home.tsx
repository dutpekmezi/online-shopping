import { BulkProductionSection } from "~/components/home/BulkProductionSection";
import { CategoriesSection } from "~/components/home/CategoriesSection";
import { CollectionsSection } from "~/components/home/CollectionsSection";
import { FeaturedProductsSection } from "~/components/home/FeaturedProductsSection";
import { HeroSection } from "~/components/home/HeroSection";
import { SiteFooter } from "~/components/home/SiteFooter";
import { Navbar } from "~/components/layout/navbar/Navbar";
import { categories, collectionProducts, featuredProducts } from "~/models/home";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Gül Natural | Doğal Ahşap Mobilya" },
    {
      name: "description",
      content:
        "Masa, baza ve özel üretim doğal ahşap mobilyaları online keşfedin. Ceviz, kestane ve masif dokularla zamansız tasarımlar.",
    },
  ];
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f3ef] pt-44 text-stone-800 lg:pt-48">
      <Navbar />
      <HeroSection />
      <CategoriesSection categories={categories} />
      <FeaturedProductsSection featuredProducts={featuredProducts} />
      <CollectionsSection products={collectionProducts} />
      <BulkProductionSection />
      <SiteFooter />
    </main>
  );
}
