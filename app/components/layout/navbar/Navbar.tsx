import { NavLinks } from "~/components/layout/navbar/NavLinks";
import { useNavbarVisibility } from "~/components/layout/navbar/useNavbarVisibility";

export function Navbar() {
  const isVisible = useNavbarVisibility();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-5">
        <div className="flex items-center justify-between">
          <button className="text-sm font-medium text-stone-700 hover:text-stone-900">Ara</button>

          <div className="text-center">
            <p className="text-4xl font-semibold tracking-tight text-stone-800">GÜL</p>
            <p className="text-xs tracking-[0.2em] text-stone-500">NATURAL FURNITURE</p>
          </div>

          <div className="flex items-center gap-5 text-sm font-medium text-stone-700">
            <button className="hover:text-stone-900">Hesabım</button>
            <button className="hover:text-stone-900">Sepet</button>
          </div>
        </div>

        <NavLinks />
      </div>
    </header>
  );
}
