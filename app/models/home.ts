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
