export function BulkProductionSection() {
  return (
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
  );
}
