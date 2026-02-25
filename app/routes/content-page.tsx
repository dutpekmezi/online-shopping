import { Link, useLocation } from "react-router";
import { NavBar } from "../components/NavBar/NavBar";
import navBarStylesHref from "../components/NavBar/NavBar.css?url";

export const links = () => [{ rel: "stylesheet", href: navBarStylesHref }];

function formatTitle(pathname: string) {
  const slug = pathname.replace(/^\//, "");

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ContentPage() {
  const { pathname } = useLocation();

  return (
    <>
      <NavBar />
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <h1>{formatTitle(pathname)}</h1>
        <p>Current route: {pathname}</p>
        <Link to="/home">Go to Home</Link>
      </main>
    </>
  );
}
