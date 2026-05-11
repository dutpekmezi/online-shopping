import { useEffect, useState, type FormEvent } from 'react';
import { Form, Link, useActionData, useSubmit } from 'react-router';
import { doc, getDoc } from 'firebase/firestore';
import { AuthGuard } from '../components/auth/AuthGuard';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase.client';
import {
  defaultHomeContent,
  HOME_CONTENT_COLLECTION,
  HOME_CONTENT_DOCUMENT_ID,
  normalizeHomeContent,
  type HomeContent,
} from '../lib/home-content';
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

  const categories = defaultHomeContent.categories.map((category, index) => {
    const title = String(formData.get(`categoryTitle-${index}`) ?? category.title).trim() || category.title;
    const image = String(formData.get(`categoryImage-${index}`) ?? category.image).trim() || category.image;

    return {
      id: slugify(title) || category.id,
      title,
      image,
    };
  });

  const nextContent: HomeContent = {
    heroImage: String(formData.get('heroImage') ?? defaultHomeContent.heroImage).trim() || defaultHomeContent.heroImage,
    heroEyebrow: String(formData.get('heroEyebrow') ?? defaultHomeContent.heroEyebrow).trim() || defaultHomeContent.heroEyebrow,
    heroTitle: String(formData.get('heroTitle') ?? defaultHomeContent.heroTitle).trim() || defaultHomeContent.heroTitle,
    heroDescription:
      String(formData.get('heroDescription') ?? defaultHomeContent.heroDescription).trim() || defaultHomeContent.heroDescription,
    categories,
  };

  const adminDb = await getAdminFirestore();
  await adminDb.collection(HOME_CONTENT_COLLECTION).doc(HOME_CONTENT_DOCUMENT_ID).set(
    {
      ...nextContent,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { message: 'Home sayfası güncellendi.', success: true } satisfies ActionData;
}

function EditHomeContent() {
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();
  const { user } = useAuth();

  useEffect(() => {
    let isSubscribed = true;

    async function loadHomeContent() {
      try {
        const snapshot = await getDoc(doc(db, HOME_CONTENT_COLLECTION, HOME_CONTENT_DOCUMENT_ID));

        if (isSubscribed && snapshot.exists()) {
          setHomeContent(normalizeHomeContent(snapshot.data()));
        }
      } catch (error) {
        console.error('Home content could not be loaded for editing.', error);
      }
    }

    loadHomeContent();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!user) {
      setSubmitError('Kaydetmek için admin olarak giriş yapmalısınız.');
      return;
    }

    try {
      const tokenResult = await user.getIdTokenResult(true);

      if (tokenResult.claims.admin !== true) {
        setSubmitError('Admin yetkisi yenilenemedi. Lütfen çıkış yapıp tekrar giriş yapın.');
        return;
      }

      const formData = new FormData(event.currentTarget);
      formData.set('authToken', tokenResult.token || (await user.getIdToken(true)));
      submit(formData, { method: 'post' });
    } catch (error) {
      const detail = error instanceof Error ? ` (${error.message})` : '';
      setSubmitError(`Admin oturumu doğrulanamadı.${detail}`);
    }
  };

  return (
    <>
      <NavBar />
      <main className="edit-home-page">
        <h1>Edit Home</h1>
        <p>Sadece admin için sade home düzenleme ekranı.</p>

        <Form className="edit-home-form" method="post" onSubmit={handleSubmit}>
          <input type="hidden" name="authToken" value="" readOnly />
          {submitError ? <p className="edit-home-message edit-home-message--error">{submitError}</p> : null}
          {actionData?.message ? (
            <p className={`edit-home-message ${actionData.success ? 'edit-home-message--success' : 'edit-home-message--error'}`}>
              {actionData.message}
            </p>
          ) : null}

          <section className="edit-home-section">
            <h2>Büyük kaydırmalı alan</h2>
            <label>
              Resim URL
              <input
                name="heroImage"
                value={homeContent.heroImage}
                onChange={(event) => setHomeContent((content) => ({ ...content, heroImage: event.target.value }))}
              />
            </label>
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
            <h2>Kategoriler</h2>
            {homeContent.categories.map((category, index) => (
              <div className="edit-home-category" key={`${category.id}-${index}`}>
                <label>
                  Kategori adı {index + 1}
                  <input
                    name={`categoryTitle-${index}`}
                    value={category.title}
                    onChange={(event) => {
                      const nextCategories = [...homeContent.categories];
                      nextCategories[index] = { ...category, title: event.target.value };
                      setHomeContent((content) => ({ ...content, categories: nextCategories }));
                    }}
                  />
                </label>
                <label>
                  Kategori resim URL {index + 1}
                  <input
                    name={`categoryImage-${index}`}
                    value={category.image}
                    onChange={(event) => {
                      const nextCategories = [...homeContent.categories];
                      nextCategories[index] = { ...category, image: event.target.value };
                      setHomeContent((content) => ({ ...content, categories: nextCategories }));
                    }}
                  />
                </label>
              </div>
            ))}
          </section>

          <div className="edit-home-actions">
            <button className="edit-home-save" type="submit">Kaydet</button>
            <Link className="edit-home-link" to="/home">Home'a dön</Link>
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
