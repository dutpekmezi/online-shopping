import { Link } from "react-router";
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
        <p>This page is only for users with the admin=true custom claim.</p>
        <p>
          <Link to="/orders">View all orders</Link>
        </p>
      </main>
    </AuthGuard>
  );
}
