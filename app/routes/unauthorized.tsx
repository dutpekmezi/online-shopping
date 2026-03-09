import { Link } from "react-router";
import type { Route } from "./+types/unauthorized";
import { NavBar } from "~/components/NavBar/NavBar";
import navBarStylesHref from "~/components/NavBar/NavBar.css?url";
import authStylesHref from "./auth.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: navBarStylesHref },
  { rel: "stylesheet", href: authStylesHref },
];

export default function UnauthorizedPage() {
  return (
    <>
      <NavBar />
      <main className="panel-page">
        <h1>Unauthorized</h1>
        <p>Bu alana erişim izniniz yok.</p>
        <Link to="/home">Ana sayfaya dön</Link>
      </main>
    </>
  );
}
