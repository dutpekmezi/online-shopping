import { useEffect, useState } from 'react';
import type { LinksFunction, MetaFunction } from 'react-router';
import { doc, getDoc } from 'firebase/firestore';
import { MainDataSection } from '../components/MainDataSection/MainDataSection';
import mainDataSectionStylesHref from '../components/MainDataSection/MainDataSection.css?url';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { CategorySection } from '../components/CategorySection/CategorySection';
import categorySectionStylesHref from '../components/CategorySection/CategorySection.css?url';
import categoryStylesHref from '../components/Category/Category.css?url';
import { db } from '../lib/firebase.client';
import {
  defaultHomeContent,
  HOME_CONTENT_COLLECTION,
  HOME_CONTENT_DOCUMENT_ID,
  normalizeHomeContent,
  type HomeContent,
} from '../lib/home-content';

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
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);

  useEffect(() => {
    let isSubscribed = true;

    async function loadHomeContent() {
      try {
        const snapshot = await getDoc(doc(db, HOME_CONTENT_COLLECTION, HOME_CONTENT_DOCUMENT_ID));

        if (isSubscribed && snapshot.exists()) {
          setHomeContent(normalizeHomeContent(snapshot.data()));
        }
      } catch (error) {
        console.error('Home content could not be loaded.', error);
      }
    }

    loadHomeContent();

    return () => {
      isSubscribed = false;
    };
  }, []);

  return (
    <>
      <NavBar />
      <MainDataSection content={homeContent} />
      <CategorySection categories={homeContent.categories} />
    </>
  );
}
