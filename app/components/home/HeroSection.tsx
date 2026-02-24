export function HeroSection() {
  return (
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
          Masa, baza ve yaşam alanı mobilyalarında masif ceviz ve kestanenin sıcaklığını modern
          çizgilerle buluşturuyoruz.
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
  );
}
