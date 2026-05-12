import type { Route } from './+types/archive';
import { AuthGuard } from '../components/auth/AuthGuard';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { ProductCardList, links as productCardListLinks } from '../components/ProductCardList/ProductCardList';
import { links as productCardLinks } from '../components/ProductCard/ProductCard';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  ...productCardListLinks(),
  ...productCardLinks(),
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Archive | Online Shopping' },
    { name: 'description', content: 'Archived product listings' },
  ];
}

export default function Archive() {
  return (
    <AuthGuard requireAdmin>
      <NavBar />
      <ProductCardList archived />
    </AuthGuard>
  );
}
