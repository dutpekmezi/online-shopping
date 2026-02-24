import { Outlet } from "react-router";
import { CartDrawer } from "./CartDrawer";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { LocaleCurrencyPicker } from "./LocaleCurrencyPicker";
import { MegaMenu } from "./MegaMenu";
import { SearchDrawer } from "./SearchDrawer";

export function SiteLayout({ lang }: { lang: string }) {
  return (
    <div>
      <Header lang={lang} />
      <div className="p-4"><LocaleCurrencyPicker lang={lang} /></div>
      <MegaMenu />
      <main className="p-4"><Outlet /></main>
      <Footer />
      <SearchDrawer />
      <CartDrawer />
    </div>
  );
}
