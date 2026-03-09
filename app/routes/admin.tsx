import type { Route } from "./+types/admin";
import { AuthGuard } from "~/components/auth/AuthGuard";
import { NavBar } from "~/components/NavBar/NavBar";
import navBarStylesHref from "~/components/NavBar/NavBar.css?url";
import authStylesHref from "./auth.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: navBarStylesHref },
  { rel: "stylesheet", href: authStylesHref },
];

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <NavBar />
      <main className="panel-page">
        <h1>Admin Panel</h1>
        <p>Bu sayfa sadece custom claim (admin=true) alan kullanıcılar içindir.</p>
      </main>
    </AuthGuard>
  );
}
