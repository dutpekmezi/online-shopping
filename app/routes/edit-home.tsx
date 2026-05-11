import { randomUUID } from 'node:crypto';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Firestore } from 'firebase-admin/firestore';
import { Form, redirect, useActionData, useSubmit } from 'react-router';
import { AuthGuard } from '../components/auth/AuthGuard';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { useAuth } from '../hooks/useAuth';
import {
  defaultHomeContent,
  HOME_CONTENT_COLLECTION,
  HOME_CONTENT_DOCUMENT_ID,
  normalizeHomeContent,
  resolveHomeImageUrl,
  serializeHomeContent,
  type HomeContent,
} from '../lib/home-content';
import { useHomeContent } from '../hooks/useHomeContent';
import { optimizeHomeImageFile } from '../lib/home-image-optimizer.client';
import { fetchProductCategories } from '../lib/products';
import editHomeStylesHref from './edit-home.css?url';
import type { Route } from './+types/edit-home';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: editHomeStylesHref },
];

type ActionData = {
  success?: boolean;
  message: string;
};

const HOME_STORAGE_FOLDER = 'home';
const PRODUCTS_COLLECTION = 'products';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toSafeFileName(fileName: string) {
  const safeFileName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

  return safeFileName || 'home-image';
}

function createStorageFileName(fileName: string) {
  return `${Date.now()}-${randomUUID()}-${toSafeFileName(fileName)}`;
}

function getHomeImages(content: HomeContent) {
  return [content.heroImageUrl, ...content.categories.map((category) => category.imageUrl)];
}

function getHomeStoragePathFromUrl(imageUrl: string, bucketName: string) {
  try {
    const url = new URL(imageUrl);
    const firebasePathMatch = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    const encodedPath = firebasePathMatch?.[2];
    const urlBucketName = firebasePathMatch?.[1];

    if (!encodedPath || urlBucketName !== bucketName) {
      return null;
    }

    const storagePath = decodeURIComponent(encodedPath);

    return storagePath.startsWith(`${HOME_STORAGE_FOLDER}/`) ? storagePath : null;
  } catch {
    return null;
  }
}

async function uploadHomeImage(file: File, slotName: string) {
  const { getAdminStorageBucket } = await import('../lib/firebase-admin.server');
  const bucket = await getAdminStorageBucket();
  const imageFileName = createStorageFileName(file.name);
  const storagePath = `${HOME_STORAGE_FOLDER}/${slotName}-${imageFileName}`;
  const imageFile = bucket.file(storagePath);
  const downloadToken = randomUUID();
  const imageBuffer = Buffer.from(await file.arrayBuffer());

  await imageFile.save(imageBuffer, {
    metadata: {
      contentType: file.type || 'application/octet-stream',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    storagePath,
  )}?alt=media&token=${downloadToken}`;
}

async function deleteUnusedHomeImages(previousContent: HomeContent, nextContent: HomeContent) {
  const { getAdminStorageBucket } = await import('../lib/firebase-admin.server');
  const bucket = await getAdminStorageBucket();
  const nextImageUrls = new Set(getHomeImages(nextContent));
  const unusedStoragePaths = Array.from(new Set(getHomeImages(previousContent)))
    .filter((imageUrl) => !nextImageUrls.has(imageUrl))
    .map((imageUrl) => getHomeStoragePathFromUrl(imageUrl, bucket.name))
    .filter((path): path is string => Boolean(path));

  await Promise.all(
    unusedStoragePaths.map((storagePath) =>
      bucket
        .file(storagePath)
        .delete({ ignoreNotFound: true })
        .catch((error) => {
          console.error(`Unused home image could not be deleted: ${storagePath}`, error);
        }),
    ),
  );
}

function getCategoryCount(formData: FormData) {
  const categoryCount = Number(formData.get('categoryCount'));

  return Number.isInteger(categoryCount) && categoryCount >= 0 ? Math.min(categoryCount, 50) : defaultHomeContent.categories.length;
}

async function fetchAvailableProductCategories(adminDb: Firestore) {
  const snapshot = await adminDb.collection(PRODUCTS_COLLECTION).get();
  const categories = snapshot.docs
    .map((doc) => doc.data().category)
    .filter((category): category is string => typeof category === 'string' && Boolean(category.trim()))
    .map((category) => category.trim());

  return new Set(categories);
}

function getSelectedFile(formData: FormData, fieldName: string) {
  const file = formData.get(fieldName);

  return file instanceof File && file.size > 0 ? file : null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const authToken = String(formData.get('authToken') ?? '').trim();

  if (!authToken) {
    return { message: 'Admin oturumu doğrulanamadı.', success: false } satisfies ActionData;
  }

  const { getAdminAuth, getAdminFirestore, FieldValue } = await import('../lib/firebase-admin.server');
  const adminAuth = await getAdminAuth();
  const decodedToken = await adminAuth.verifyIdToken(authToken).catch(() => null);

  if (!decodedToken || decodedToken.admin !== true) {
    return { message: 'Bu işlem için admin yetkisi gerekli.', success: false } satisfies ActionData;
  }

  try {
    const adminDb = await getAdminFirestore();
    const homeContentRef = adminDb.collection(HOME_CONTENT_COLLECTION).doc(HOME_CONTENT_DOCUMENT_ID);
    const previousSnapshot = await homeContentRef.get();
    const previousContent = previousSnapshot.exists ? normalizeHomeContent(previousSnapshot.data()) : defaultHomeContent;
    const selectedHeroImage = getSelectedFile(formData, 'heroImageFile');
    const heroImageUrl = selectedHeroImage
      ? await uploadHomeImage(selectedHeroImage, 'hero')
      : String(formData.get('heroImageUrl') ?? defaultHomeContent.heroImageUrl).trim() || defaultHomeContent.heroImageUrl;

    const categoryCount = getCategoryCount(formData);
    const availableProductCategories = categoryCount > 0 ? await fetchAvailableProductCategories(adminDb) : new Set<string>();

    if (categoryCount > 0 && availableProductCategories.size === 0) {
      return { message: 'Collections içinde kayıtlı bir kategori bulunamadı. Önce ürünlere kategori ekleyin.', success: false } satisfies ActionData;
    }

    const categories = await Promise.all(
      Array.from({ length: categoryCount }, async (_item, index) => {
        const fallbackCategory = previousContent.categories[index] ?? defaultHomeContent.categories[index] ?? defaultHomeContent.categories[0];
        const title = String(formData.get(`categoryTitle-${index}`) ?? '').trim();

        if (!title || !availableProductCategories.has(title)) {
          throw new Error(`Invalid home category: ${title || '(empty)'}`);
        }

        const selectedCategoryImage = getSelectedFile(formData, `categoryImageFile-${index}`);
        const imageUrl = selectedCategoryImage
          ? await uploadHomeImage(selectedCategoryImage, `category-${index + 1}`)
          : String(formData.get(`categoryImageUrl-${index}`) ?? fallbackCategory.imageUrl).trim() || fallbackCategory.imageUrl;

        return {
          id: slugify(title) || fallbackCategory.id,
          title,
          imageUrl,
        };
      }),
    );

    const nextContent: HomeContent = {
      heroImageUrl,
      heroEyebrow: String(formData.get('heroEyebrow') ?? defaultHomeContent.heroEyebrow).trim() || defaultHomeContent.heroEyebrow,
      heroTitle: String(formData.get('heroTitle') ?? defaultHomeContent.heroTitle).trim() || defaultHomeContent.heroTitle,
      heroDescription:
        String(formData.get('heroDescription') ?? defaultHomeContent.heroDescription).trim() || defaultHomeContent.heroDescription,
      categories,
      sectionImages: categories.map((category) => category.imageUrl),
    };

    await homeContentRef.set(
      {
        ...serializeHomeContent(nextContent),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await deleteUnusedHomeImages(previousContent, nextContent);
  } catch (error) {
    console.error('Home content could not be saved.', error);

    if (error instanceof Error && error.message.startsWith('Invalid home category:')) {
      return { message: 'Kategori adları sadece Collections içindeki kategorilerden seçilebilir.', success: false } satisfies ActionData;
    }

    return { message: 'Home içeriği kaydedilemedi. Lütfen tekrar deneyin.', success: false } satisfies ActionData;
  }

  return redirect('/home?refreshHome=1');
}

function EditHomeContent() {
  const { content: loadedHomeContent, isLoading, error } = useHomeContent();
  const [homeContent, setHomeContent] = useState<HomeContent>(loadedHomeContent);
  const [homeImagePreviews, setHomeImagePreviews] = useState<{ heroImageUrl?: string; categories: Record<number, string> }>({
    categories: {},
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [collectionCategories, setCollectionCategories] = useState<string[]>([]);
  const [isLoadingCollectionCategories, setIsLoadingCollectionCategories] = useState(true);
  const [collectionCategoriesError, setCollectionCategoriesError] = useState<string | null>(null);
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();
  const { user } = useAuth();

  useEffect(() => {
    setHomeContent(loadedHomeContent);
  }, [loadedHomeContent]);

  useEffect(() => {
    if (actionData) {
      setIsOptimizingImages(false);
    }
  }, [actionData]);

  useEffect(() => {
    let isSubscribed = true;

    setIsLoadingCollectionCategories(true);
    setCollectionCategoriesError(null);

    fetchProductCategories()
      .then((categories) => {
        if (isSubscribed) {
          setCollectionCategories(categories);
        }
      })
      .catch((error) => {
        console.error('Collection categories could not be loaded.', error);

        if (isSubscribed) {
          setCollectionCategories([]);
          setCollectionCategoriesError('Collections kategorileri yüklenemedi. Lütfen ürün okuma izinlerini kontrol edin.');
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingCollectionCategories(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleHeroImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setHomeImagePreviews((previews) => ({ ...previews, heroImageUrl: URL.createObjectURL(selectedFile) }));
    }
  };

  const handleCategoryImageChange = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setHomeImagePreviews((previews) => ({
        ...previews,
        categories: { ...previews.categories, [index]: URL.createObjectURL(selectedFile) },
      }));
    }
  };

  const removeCategoryCard = (indexToRemove: number) => {
    setHomeContent((content) => ({
      ...content,
      categories: content.categories.filter((_category, index) => index !== indexToRemove),
    }));
    setHomeImagePreviews((previews) => ({
      ...previews,
      categories: Object.fromEntries(
        Object.entries(previews.categories)
          .map(([index, previewUrl]) => [Number(index), previewUrl] as const)
          .filter(([index]) => index !== indexToRemove)
          .map(([index, previewUrl]) => [index > indexToRemove ? index - 1 : index, previewUrl]),
      ),
    }));
    setSubmitError(null);
  };

  const addCategoryCard = () => {
    const nextTitle = collectionCategories[0];

    if (!nextTitle) {
      setSubmitError('Yeni kart eklemek için önce Collections içinde en az bir kategori olmalı.');
      return;
    }

    const fallbackCategory = defaultHomeContent.categories[homeContent.categories.length % defaultHomeContent.categories.length];

    setHomeContent((content) => ({
      ...content,
      categories: [
        ...content.categories,
        {
          id: slugify(nextTitle),
          title: nextTitle,
          imageUrl: fallbackCategory.imageUrl,
        },
      ],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitError(null);

    if (!user) {
      setSubmitError('Kaydetmek için admin olarak giriş yapmalısınız.');
      return;
    }

    if (homeContent.categories.length > 0 && collectionCategories.length === 0) {
      setSubmitError('Kategori kartı kaydetmek için Collections içinde kayıtlı en az bir kategori olmalı.');
      return;
    }

    const invalidCategory = homeContent.categories.find((category) => !collectionCategories.includes(category.title));

    if (invalidCategory) {
      setSubmitError(`Kategori kartları sadece Collections kategorilerinden seçilebilir: ${invalidCategory.title}`);
      return;
    }

    try {
      const tokenResult = await user.getIdTokenResult(true);

      if (tokenResult.claims.admin !== true) {
        setSubmitError('Admin yetkisi yenilenemedi. Lütfen çıkış yapıp tekrar giriş yapın.');
        return;
      }

      const authToken = tokenResult.token || (await user.getIdToken(true));

      if (!authToken) {
        setSubmitError('Admin oturumu doğrulanamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      setIsOptimizingImages(true);

      const formData = new FormData(form);
      formData.set('authToken', authToken);

      const heroImageFile = formData.get('heroImageFile');

      if (heroImageFile instanceof File && heroImageFile.size > 0) {
        formData.set('heroImageFile', await optimizeHomeImageFile(heroImageFile, 'hero'));
      }

      await Promise.all(
        homeContent.categories.map(async (_category, index) => {
          const fieldName = `categoryImageFile-${index}`;
          const categoryImageFile = formData.get(fieldName);

          if (categoryImageFile instanceof File && categoryImageFile.size > 0) {
            formData.set(fieldName, await optimizeHomeImageFile(categoryImageFile, 'category'));
          }
        }),
      );

      submit(formData, { method: 'post', encType: 'multipart/form-data' });
    } catch (error) {
      const detail = error instanceof Error ? ` (${error.message})` : '';
      setSubmitError(`Admin oturumu doğrulanamadı veya resimler optimize edilemedi.${detail}`);
      setIsOptimizingImages(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="edit-home-page">
        <h1>Edit Home</h1>
        <p>Home resimlerini URL yazmadan seçin. Kaydedilen yeni resimler Firebase Storage'a yüklenir ve eski kullanılmayan home resimleri silinir.</p>

        <Form className="edit-home-form" method="post" encType="multipart/form-data" onSubmit={handleSubmit}>
          <input type="hidden" name="authToken" value="" readOnly />
          {isLoading ? <p className="edit-home-message">Home içeriği yükleniyor…</p> : null}
          {error ? <p className="edit-home-message edit-home-message--error">Home içeriği yüklenemedi; yedek içerik gösteriliyor.</p> : null}
          {submitError ? <p className="edit-home-message edit-home-message--error">{submitError}</p> : null}
          {isOptimizingImages ? <p className="edit-home-message">Resimler optimize ediliyor…</p> : null}
          {actionData?.message ? (
            <p className={`edit-home-message ${actionData.success ? 'edit-home-message--success' : 'edit-home-message--error'}`}>
              {actionData.message}
            </p>
          ) : null}

          <section className="edit-home-section">
            <h2>Büyük kaydırmalı alan</h2>
            <input type="hidden" name="heroImageUrl" value={homeContent.heroImageUrl} readOnly />
            <label>
              Resim seç
              <input type="file" accept="image/*" name="heroImageFile" onChange={handleHeroImageChange} />
            </label>
            <img className="edit-home-image-preview edit-home-image-preview--hero" src={homeImagePreviews.heroImageUrl ?? resolveHomeImageUrl(homeContent.heroImageUrl)} alt="Büyük alan önizleme" />
            <label>
              Üst yazı
              <textarea
                name="heroEyebrow"
                rows={2}
                value={homeContent.heroEyebrow}
                onChange={(event) => setHomeContent((content) => ({ ...content, heroEyebrow: event.target.value }))}
              />
            </label>
            <label>
              Başlık
              <textarea
                name="heroTitle"
                rows={2}
                value={homeContent.heroTitle}
                onChange={(event) => setHomeContent((content) => ({ ...content, heroTitle: event.target.value }))}
              />
            </label>
            <label>
              Açıklama
              <textarea
                name="heroDescription"
                rows={4}
                value={homeContent.heroDescription}
                onChange={(event) => setHomeContent((content) => ({ ...content, heroDescription: event.target.value }))}
              />
            </label>
          </section>

          <section className="edit-home-section">
            <div className="edit-home-section-heading">
              <div>
                <h2>Kategoriler</h2>
                <p className="edit-home-help-text">Kategori adları sadece Collections sayfasındaki ürün kategorilerinden seçilebilir; istemediğiniz kartları silebilirsiniz.</p>
              </div>
              <button
                className="edit-home-secondary-button"
                type="button"
                onClick={addCategoryCard}
                disabled={isLoadingCollectionCategories || collectionCategories.length === 0}
              >
                Yeni kategori kartı ekle
              </button>
            </div>
            <input type="hidden" name="categoryCount" value={homeContent.categories.length} readOnly />
            {isLoadingCollectionCategories ? <p className="edit-home-message">Collections kategorileri yükleniyor…</p> : null}
            {collectionCategoriesError ? <p className="edit-home-message edit-home-message--error">{collectionCategoriesError}</p> : null}
            {!isLoadingCollectionCategories && collectionCategories.length === 0 ? (
              <p className="edit-home-message edit-home-message--error">Collections içinde seçilebilir kategori bulunamadı.</p>
            ) : null}
            {homeContent.categories.length === 0 ? (
              <p className="edit-home-message">Home sayfasında gösterilecek kategori kartı yok. Yeni kart eklemek için yukarıdaki butonu kullanın.</p>
            ) : null}
            {homeContent.categories.map((category, index) => (
              <div className="edit-home-category" key={`${category.id}-${index}`}>
                <div className="edit-home-category-heading">
                  <h3>Kategori kartı {index + 1}</h3>
                  <button
                    className="edit-home-delete-button"
                    type="button"
                    onClick={() => removeCategoryCard(index)}
                    disabled={isOptimizingImages}
                    aria-label={`${category.title} kategori kartını sil`}
                  >
                    Sil
                  </button>
                </div>
                <label>
                  Kategori adı {index + 1}
                  <select
                    name={`categoryTitle-${index}`}
                    value={category.title}
                    onChange={(event) => {
                      const nextTitle = event.target.value;
                      const nextCategories = [...homeContent.categories];
                      nextCategories[index] = { ...category, id: slugify(nextTitle), title: nextTitle };
                      setHomeContent((content) => ({ ...content, categories: nextCategories }));
                    }}
                  >
                    {!collectionCategories.includes(category.title) ? (
                      <option value={category.title} disabled>
                        Seçilemez: {category.title}
                      </option>
                    ) : null}
                    {collectionCategories.map((collectionCategory) => (
                      <option key={collectionCategory} value={collectionCategory}>
                        {collectionCategory}
                      </option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name={`categoryImageUrl-${index}`} value={category.imageUrl} readOnly />
                <label>
                  Kategori resmi seç {index + 1}
                  <input type="file" accept="image/*" name={`categoryImageFile-${index}`} onChange={(event) => handleCategoryImageChange(event, index)} />
                </label>
                <img className="edit-home-image-preview" src={homeImagePreviews.categories[index] ?? resolveHomeImageUrl(category.imageUrl)} alt={`${category.title} önizleme`} />
              </div>
            ))}
          </section>

          <div className="edit-home-actions">
            <button className="edit-home-save" type="submit" disabled={isOptimizingImages}>
              {isOptimizingImages ? 'Optimize ediliyor…' : 'Kaydet'}
            </button>
          </div>
        </Form>
      </main>
    </>
  );
}

export default function EditHomePage() {
  return (
    <AuthGuard requireAdmin>
      <EditHomeContent />
    </AuthGuard>
  );
}
