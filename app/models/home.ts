export type Category = {
  name: string;
  desc: string;
};

export type FeaturedProduct = {
  name: string;
  material: string;
  size: string;
  price: string;
};

export type CollectionGroup = "dining" | "living";

export type CollectionProduct = {
  name: string;
  material: string;
  size: string;
  price: string;
  group: CollectionGroup;
};

export const categories: Category[] = [
  { name: "Masalar", desc: "Ceviz ve kestaneden doğal yemek ve çalışma masaları." },
  { name: "Bazalar", desc: "Masif ahşap gövdeli, depolama alanlı dayanıklı bazalar." },
  { name: "Konsollar", desc: "El işçiliğiyle üretilmiş modern ve rustik konsollar." },
  { name: "TV Üniteleri", desc: "Doğal dokuyu koruyan, sade ve zarif üniteler." },
];

export const featuredProducts: FeaturedProduct[] = [
  {
    name: "Anatolia Ceviz Yemek Masası",
    material: "Masif ceviz",
    size: "200 x 95 cm",
    price: "₺34.900",
  },
  {
    name: "Toros Kestane Baza",
    material: "Kestane + keten başlık",
    size: "160 x 200 cm",
    price: "₺42.500",
  },
  {
    name: "Lina Ahşap Konsol",
    material: "Doğal meşe",
    size: "180 x 45 cm",
    price: "₺27.800",
  },
];

export const collectionProducts: CollectionProduct[] = [
  {
    name: "Epoxy Resin Dining Table",
    material: "Masif ceviz + epoxy",
    size: "220 x 100 cm",
    price: "₺58.000",
    group: "dining",
  },
  {
    name: "Live Edge Walnut Table",
    material: "Doğal ceviz",
    size: "200 x 95 cm",
    price: "₺49.500",
    group: "dining",
  },
  {
    name: "Solid Wood Dining Set",
    material: "Meşe + doğal yağ",
    size: "190 x 90 cm",
    price: "₺44.900",
    group: "dining",
  },
  {
    name: "Modern TV Console",
    material: "Meşe kaplama",
    size: "220 x 50 cm",
    price: "₺29.900",
    group: "living",
  },
  {
    name: "Rustic Coffee Table",
    material: "Masif kestane",
    size: "120 x 70 cm",
    price: "₺19.500",
    group: "living",
  },
  {
    name: "Wooden Sideboard",
    material: "Masif meşe",
    size: "180 x 45 cm",
    price: "₺33.000",
    group: "living",
  },
];
