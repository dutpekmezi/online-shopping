import { Link } from "react-router";

export function Header({ lang }: { lang: string }) {
  return (
    <header className="border-b p-4 flex gap-4">
      <Link to={`/${lang}`}>Home</Link>
      <Link to={`/${lang}/collections/hoodies`}>Collections</Link>
      <Link to={`/${lang}/blogs/news`}>Blog</Link>
    </header>
  );
}
