export const HOME_CONTENT_COLLECTION = 'siteContent';
export const HOME_CONTENT_DOCUMENT_ID = 'home';

export type HomeCategoryContent = {
  id: string;
  title: string;
  image: string;
};

export type HomeContent = {
  heroImage: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  categories: HomeCategoryContent[];
};

export const defaultHomeContent: HomeContent = {
  heroImage: 'App/Images/MainSectionImage.JPG',
  heroEyebrow: 'ONE-OF-A-KIND LIVE EDGE SLABS FOR ANY PROJECT',
  heroTitle: 'Providing Live Edge Wood Slabs & Furniture',
  heroDescription:
    'Find a unique live edge wood slab perfect for your live edge table, bar top, mantle, charcuterie board, or any other live edge project.',
  categories: [
    {
      id: 'table-slabs',
      title: 'Table Slabs',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'custom-table-tops',
      title: 'Custom Table Tops',
      image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'coffee-table-slabs',
      title: 'Coffee Table Slabs',
      image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'charcuterie-slabs',
      title: 'Charcuterie Slabs',
      image: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'shelves',
      title: 'Shelves',
      image: 'https://images.unsplash.com/photo-1582582429416-3db17ed01e6e?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'mantles',
      title: 'Mantles',
      image: 'https://images.unsplash.com/photo-1616627457405-45b0cfdac0d0?auto=format&fit=crop&w=900&q=80',
    },
  ],
};

export function resolveHomeImageUrl(imageUrl: string) {
  if (imageUrl.startsWith('App/Images/')) {
    const fileName = imageUrl.replace('App/Images/', '');
    return new URL(`../Images/${fileName}`, import.meta.url).href;
  }

  return imageUrl;
}

function toStringField(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function normalizeHomeContent(value: unknown): HomeContent {
  if (!value || typeof value !== 'object') {
    return defaultHomeContent;
  }

  const data = value as Partial<HomeContent>;
  const categories = Array.isArray(data.categories)
    ? data.categories.map((category, index) => {
        const fallback = defaultHomeContent.categories[index] ?? defaultHomeContent.categories[0];

        return {
          id: toStringField(category?.id, fallback.id),
          title: toStringField(category?.title, fallback.title),
          image: toStringField(category?.image, fallback.image),
        } satisfies HomeCategoryContent;
      })
    : defaultHomeContent.categories;

  return {
    heroImage: toStringField(data.heroImage, defaultHomeContent.heroImage),
    heroEyebrow: toStringField(data.heroEyebrow, defaultHomeContent.heroEyebrow),
    heroTitle: toStringField(data.heroTitle, defaultHomeContent.heroTitle),
    heroDescription: toStringField(data.heroDescription, defaultHomeContent.heroDescription),
    categories: categories.length ? categories : defaultHomeContent.categories,
  };
}
