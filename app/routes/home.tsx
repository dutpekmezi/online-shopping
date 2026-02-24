import type { Route } from "./+types/home";

const categories = [
  { name: "Masalar", desc: "Ceviz ve kestaneden doğal yemek ve çalışma masaları." },
  { name: "Bazalar", desc: "Masif ahşap gövdeli, depolama alanlı dayanıklı bazalar." },
  { name: "Konsollar", desc: "El işçiliğiyle üretilmiş modern ve rustik konsollar." },
  { name: "TV Üniteleri", desc: "Doğal dokuyu koruyan, sade ve zarif üniteler." },
];

const featuredProducts = [
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
    <main className="min-h-screen bg-[#f6f3ef] text-stone-800">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-sm tracking-[0.2em] text-stone-500">GULNATURAL</p>
          <h1 className="text-xl font-semibold">Doğal Ahşap Mobilya</h1>
        </div>
        <button className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700">
          Etsy Mağazasına Git
        </button>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 pt-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <p className="inline-block rounded-full bg-stone-200 px-4 py-2 text-xs font-semibold tracking-wide text-stone-700">
            Özel Üretim • El İşçiliği • Türkiye
          </p>
          <h2 className="text-4xl font-semibold leading-tight lg:text-5xl">
            Evinize karakter katan
            <span className="block text-amber-800">doğal ahşap tasarımlar</span>
          </h2>
          <p className="max-w-xl text-lg text-stone-600">
            Masa, baza ve yaşam alanı mobilyalarında masif ceviz ve kestanenin sıcaklığını
            modern çizgilerle buluşturuyoruz.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-amber-800 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-700">
              Koleksiyonu İncele
            </button>
            <button className="rounded-full border border-stone-400 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100">
              Özel Sipariş Oluştur
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-stone-300 to-stone-100 p-8 shadow-lg">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">Bu ay öne çıkan</p>
            <h3 className="mt-2 text-2xl font-semibold">Kestane Yatak Odası Serisi</h3>
            <p className="mt-3 text-stone-600">
              Tamamı doğal yağ ile korunan, 20 yıl kullanım hedefiyle üretilmiş zamansız parçalar.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl bg-white p-3">
                <p className="font-semibold">120+</p>
                <p className="text-xs text-stone-500">Ürün</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="font-semibold">4.9/5</p>
                <p className="text-xs text-stone-500">Etsy Puanı</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="font-semibold">15 Gün</p>
                <p className="text-xs text-stone-500">Ortalama Üretim</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <h3 className="mb-6 text-2xl font-semibold">Kategoriler</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((item) => (
            <article key={item.name} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h4 className="text-lg font-semibold">{item.name}</h4>
              <p className="mt-2 text-sm text-stone-600">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h3 className="text-2xl font-semibold">Öne Çıkan Ürünler</h3>
          <a className="text-sm font-semibold text-amber-800 hover:text-amber-700" href="#">
            Tüm Ürünler →
          </a>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <article key={product.name} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 h-40 rounded-xl bg-stone-200" aria-hidden />
              <h4 className="text-lg font-semibold">{product.name}</h4>
              <p className="mt-1 text-sm text-stone-600">{product.material}</p>
              <p className="text-sm text-stone-600">{product.size}</p>
              <p className="mt-3 text-xl font-bold text-amber-900">{product.price}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-200 bg-stone-100 py-14">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-2xl font-semibold">Mimarlar ve oteller için toplu üretim</h3>
            <p className="mt-2 max-w-2xl text-stone-600">
              Proje bazlı ölçü, ağaç türü ve renk seçenekleriyle mekanınıza özel çözümler sunuyoruz.
            </p>
          </div>
          <button className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700">
            Teklif Al
          </button>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-stone-600 lg:flex-row lg:items-center lg:justify-between">
        <p>© {new Date().getFullYear()} Gül Natural. Tüm hakları saklıdır.</p>
        <p>Instagram • Etsy • WhatsApp</p>
      </footer>
    </main>
  );
}
