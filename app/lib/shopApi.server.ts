import type { BlogPost, Collection, Product } from "./types";

const collections: Collection[] = [
  { handle: "hoodies", title: "Hoodies", description: "Yumuşak kumaşlı günlük hoodie koleksiyonu.", image: "https://placehold.co/600x400" },
  { handle: "accessories", title: "Accessories", description: "Günlük kullanım için tamamlayıcı ürünler.", image: "https://placehold.co/600x400" },
];

const products: Product[] = [
  { handle: "classic-hoodie", title: "Classic Hoodie", description: "Unisex kalıp, pamuklu kumaş.", image: "https://placehold.co/600x600", price: { amount: 899, currencyCode: "TRY" }, collectionHandle: "hoodies" },
  { handle: "urban-cap", title: "Urban Cap", description: "Ayarlanabilir şapka.", image: "https://placehold.co/600x600", price: { amount: 349, currencyCode: "TRY" }, collectionHandle: "accessories" },
];

const posts: BlogPost[] = [
  { slug: "new-season", title: "Yeni Sezon Başladı", excerpt: "Yeni sezon ürünleri mağazada.", content: "Yeni sezon ürünlerimizle tarzınızı güncelleyin.", publishedAt: "2026-01-10" },
  { slug: "care-guide", title: "Ürün Bakım Rehberi", excerpt: "Ürünlerinizi uzun ömürlü kullanın.", content: "Yıkama talimatları ve bakım önerileri.", publishedAt: "2026-01-02" },
];

export async function getCollections() { return collections; }
export async function getCollectionByHandle(handle: string) { return collections.find((item) => item.handle === handle) ?? null; }
export async function getProducts(collectionHandle?: string) {
  return collectionHandle ? products.filter((p) => p.collectionHandle === collectionHandle) : products;
}
export async function getProductByHandle(handle: string) { return products.find((item) => item.handle === handle) ?? null; }
export async function getBlogPosts() { return posts; }
export async function getBlogPostBySlug(slug: string) { return posts.find((item) => item.slug === slug) ?? null; }
