import { useEffect, useState } from "react";

type NavigationItem = {
  label: string;
  href: string;
};

const navigationItems: NavigationItem[] = [
  { label: "Anasayfa", href: "#" },
  { label: "Dining", href: "#" },
  { label: "Living", href: "#" },
  { label: "Happy Customers", href: "#" },
  { label: "İletişim", href: "#" },
];

function useNavbarVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      const shouldHide = scrollingDown && currentScrollY > 80;

      setIsVisible(!shouldHide);
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return isVisible;
}

function NavLinks() {
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-center gap-8 text-lg text-stone-700">
      {navigationItems.map((item, index) => (
        <a
          key={item.label}
          href={item.href}
          className={`transition-colors hover:text-stone-900 ${
            index === 0 ? "border-b-2 border-stone-800 pb-1 font-medium" : ""
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

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
