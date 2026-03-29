import type { LinksFunction, MetaFunction } from 'react-router';
import { MainDataSection } from '../components/MainDataSection/MainDataSection';
import mainDataSectionStylesHref from '../components/MainDataSection/MainDataSection.css?url';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { CategorySection } from '../components/CategorySection/CategorySection';
import categorySectionStylesHref from '../components/CategorySection/CategorySection.css?url';
import categoryStylesHref from '../components/Category/Category.css?url';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: mainDataSectionStylesHref },
  { rel: 'stylesheet', href: categorySectionStylesHref },
  { rel: 'stylesheet', href: categoryStylesHref },
];

export const meta: MetaFunction = () => {
  return [
    { title: 'Online Shopping' },
    { name: 'description', content: 'Online shopping storefront' },
  ];
};

export default function Home() {
  return (
    <>
      <NavBar />
      <MainDataSection />
      <CategorySection />
      console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID);
    </>
  );
}
