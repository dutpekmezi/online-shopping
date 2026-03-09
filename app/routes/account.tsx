import { Link } from "react-router";
import type { Route } from "./+types/account";
import { NavBar } from "~/components/NavBar/NavBar";
import navBarStylesHref from "~/components/NavBar/NavBar.css?url";
import authStylesHref from "./auth.css?url";
import { AuthGuard } from "~/components/auth/AuthGuard";
import { useAuth } from "~/hooks/useAuth";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: navBarStylesHref },
  { rel: "stylesheet", href: authStylesHref },
];

export default function AccountPage() {
  const { user, isAdmin } = useAuth();

  return (
    <AuthGuard>
      <NavBar />
      <main className="panel-page">
        <h1>Hesabım</h1>
        <p>Giriş yapan kullanıcı: {user?.email}</p>
        <p>Rol: {isAdmin ? "Admin" : "User"}</p>
        {isAdmin ? <Link to="/admin">Admin paneline git</Link> : null}
      </main>
    </AuthGuard>
  );
}
