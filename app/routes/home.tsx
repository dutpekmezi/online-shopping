import type { Route } from './+types/home';
import { MainDataSection } from '../components/MainDataSection/MainDataSection';
import mainDataSectionStylesHref from '../components/MainDataSection/MainDataSection.css?url';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { CategorySection } from '../components/CategorySection/CategorySection';
import categorySectionStylesHref from '../components/CategorySection/CategorySection.css?url';
import categoryStylesHref from '../components/Category/Category.css?url';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: mainDataSectionStylesHref },
  { rel: 'stylesheet', href: categorySectionStylesHref },
  { rel: 'stylesheet', href: categoryStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Online Shopping' },
    { name: 'description', content: 'Online shopping storefront' },
  ];
}

export default function Home() {
  return (
    <>
      <NavBar />
      <MainDataSection />
      <CategorySection />
    </>
  );
}
