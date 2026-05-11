export const HOME_CONTENT_COLLECTION = 'siteContent';
export const HOME_CONTENT_DOCUMENT_ID = 'home';

export type HomeCategoryContent = {
  id: string;
  title: string;
  imageUrl: string;
};

export type HomeContent = {
  heroImageUrl: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  categories: HomeCategoryContent[];
  sectionImages: string[];
  updatedAt?: unknown;
};

const defaultHomeCategories: HomeCategoryContent[] = [
  {
    id: 'table-slabs',
    title: 'Table Slabs',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'custom-table-tops',
    title: 'Custom Table Tops',
    imageUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'coffee-table-slabs',
    title: 'Coffee Table Slabs',
    imageUrl: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'charcuterie-slabs',
    title: 'Charcuterie Slabs',
    imageUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'shelves',
    title: 'Shelves',
    imageUrl: 'https://images.unsplash.com/photo-1582582429416-3db17ed01e6e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'mantles',
    title: 'Mantles',
    imageUrl: 'https://images.unsplash.com/photo-1616627457405-45b0cfdac0d0?auto=format&fit=crop&w=900&q=80',
  },
];

export const defaultHomeContent: HomeContent = {
  heroImageUrl: 'App/Images/MainSectionImage.JPG',
  heroEyebrow: 'ONE-OF-A-KIND LIVE EDGE SLABS FOR ANY PROJECT',
  heroTitle: 'Providing Live Edge Wood Slabs & Furniture',
  heroDescription:
    'Find a unique live edge wood slab perfect for your live edge table, bar top, mantle, charcuterie board, or any other live edge project.',
  categories: defaultHomeCategories,
  sectionImages: defaultHomeCategories.map((category) => category.imageUrl),
};

const localHomeImageUrls = import.meta.glob('../Images/*', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>;

export function resolveHomeImageUrl(imageUrl: string) {
  const normalizedImageUrl = imageUrl.trim();
  const localImagePrefix = 'App/Images/';

  if (normalizedImageUrl.startsWith(localImagePrefix)) {
    const fileName = normalizedImageUrl.slice(localImagePrefix.length);
    const localImageUrl = localHomeImageUrls[`../Images/${fileName}`];

    return localImageUrl ?? normalizedImageUrl;
  }

  return normalizedImageUrl;
}

function toStringField(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function getLegacyStringField(value: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const fieldValue = value[key];

    if (typeof fieldValue === 'string' && fieldValue.trim()) {
      return fieldValue;
    }
  }

  return fallback;
}

export function normalizeHomeContent(value: unknown): HomeContent {
  if (!value || typeof value !== 'object') {
    return defaultHomeContent;
  }

  const data = value as Record<string, unknown>;
  const hasSavedCategories = Array.isArray(data.categories);
  const rawCategories = hasSavedCategories ? (data.categories as unknown[]) : [];
  const sectionImages = Array.isArray(data.sectionImages) ? data.sectionImages : [];
  const categories: HomeCategoryContent[] = hasSavedCategories
    ? rawCategories.map((rawCategory, index) => {
        const category = rawCategory && typeof rawCategory === 'object' ? (rawCategory as Record<string, unknown>) : {};
        const fallback = defaultHomeContent.categories[index] ?? defaultHomeContent.categories[0];
        const sectionImage = sectionImages[index];

        return {
          id: getLegacyStringField(category, ['id'], fallback.id),
          title: getLegacyStringField(category, ['title'], fallback.title),
          imageUrl: getLegacyStringField(
            category,
            ['imageUrl', 'image'],
            typeof sectionImage === 'string' && sectionImage.trim() ? sectionImage : fallback.imageUrl,
          ),
        } satisfies HomeCategoryContent;
      })
    : defaultHomeContent.categories.map((category, index) => ({
        ...category,
        imageUrl: typeof sectionImages[index] === 'string' && sectionImages[index].trim() ? sectionImages[index] : category.imageUrl,
      }));

  return {
    heroImageUrl: getLegacyStringField(data, ['heroImageUrl', 'heroImage'], defaultHomeContent.heroImageUrl),
    heroEyebrow: toStringField(data.heroEyebrow, defaultHomeContent.heroEyebrow),
    heroTitle: toStringField(data.heroTitle, defaultHomeContent.heroTitle),
    heroDescription: toStringField(data.heroDescription, defaultHomeContent.heroDescription),
    categories,
    sectionImages: categories.map((category) => category.imageUrl),
    updatedAt: data.updatedAt,
  };
}

export function serializeHomeContent(content: HomeContent) {
  return {
    heroImageUrl: content.heroImageUrl,
    heroEyebrow: content.heroEyebrow,
    heroTitle: content.heroTitle,
    heroDescription: content.heroDescription,
    sectionImages: content.categories.map((category) => category.imageUrl),
    categories: content.categories.map((category) => ({
      id: category.id,
      title: category.title,
      imageUrl: category.imageUrl,
    })),
  };
}
