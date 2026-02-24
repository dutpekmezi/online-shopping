import { navigationItems } from "~/components/layout/navbar/navigation";

export function NavLinks() {
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
