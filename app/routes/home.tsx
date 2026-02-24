import type { Route } from "./+types/home";
import { NavBar } from "../components/NavBar/NavBar";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Online Shopping" },
    { name: "description", content: "Online shopping storefront" },
  ];
}

export default function Home() {
  return <NavBar />;
}
