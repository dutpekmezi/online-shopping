import { Link } from "react-router";
import type { Collection } from "~/lib/types";

export function CollectionsGrid({ lang, collections }: { lang: string; collections: Collection[] }) {
  return <section className="grid gap-4">{collections.map((c) => <Link key={c.handle} to={`/${lang}/collections/${c.handle}`}>{c.title}</Link>)}</section>;
}
