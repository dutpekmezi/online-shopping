import type { Route } from "./+types/home";
import { NavBar } from "../components/NavBar/NavBar";
import navBarStylesHref from "../components/NavBar/NavBar.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: navBarStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Online Shopping" },
    { name: "description", content: "Online shopping storefront" },
  ];
}

export default function Home() {
  return <NavBar />;
}
