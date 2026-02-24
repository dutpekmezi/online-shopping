export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-stone-600 lg:flex-row lg:items-center lg:justify-between">
      <p>© {new Date().getFullYear()} Gül Natural. Tüm hakları saklıdır.</p>
      <p>Instagram • Etsy • WhatsApp</p>
    </footer>
  );
}
