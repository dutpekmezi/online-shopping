import { Link } from "react-router";
import type { BlogPost } from "~/lib/types";

export function BlogPreview({ lang, posts }: { lang: string; posts: BlogPost[] }) {
  return <section className="grid gap-2">{posts.map((p) => <Link key={p.slug} to={`/${lang}/blogs/news/${p.slug}`}>{p.title}</Link>)}</section>;
}
