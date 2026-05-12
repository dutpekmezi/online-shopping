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
        <h1>My Account</h1>
        <p>Signed in as: {user?.email}</p>
        <p>Role: {isAdmin ? "Admin" : "User"}</p>
        {isAdmin ? <Link to="/admin">Go to admin panel</Link> : null}
      </main>
    </AuthGuard>
  );
}
