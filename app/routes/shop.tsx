import type { Route } from './+types/shop';
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
    { title: 'Shop | Online Shopping' },
    { name: 'description', content: 'Firestore backed product catalog' },
  ];
}

export default function Shop() {
  return (
    <>
      <NavBar />
      <ProductCardList />
    </>
  );
}
