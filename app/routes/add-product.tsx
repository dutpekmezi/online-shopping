import { randomUUID } from 'node:crypto';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Form, useActionData, useSubmit } from 'react-router';
import { AuthGuard } from '../components/auth/AuthGuard';
import { AdminCombinationPricingTable } from '../components/pricing/AdminCombinationPricingTable';
import { StorefrontVariationSelector } from '../components/pricing/StorefrontVariationSelector';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { useAuth } from '../hooks/useAuth';
import { fetchProducts } from '../lib/products';
import { tableSeedPricingState } from '../lib/pricing/seed';
import type { ProductCombination, ProductPricingState, VariationGroup, VariationOption } from '../lib/pricing/types';
import { generateCombinations, validatePricingState } from '../lib/pricing/utils';
import addProductStylesHref from './add-product.css?url';
import type { Route } from './+types/add-product';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: addProductStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Add Product | Online Shopping' },
    { name: 'description', content: 'Create listing style products with variation matrix pricing.' },
  ];
}

const createId = () => Math.random().toString(36).slice(2, 10);
const MAX_PRODUCT_PHOTOS = 10;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

type ActionData = {
  success?: boolean;
  message: string;
};

function toSafeFileName(fileName: string) {
  const safeFileName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

  return safeFileName || 'product-image';
}

function createStorageFileName(fileName: string) {
  return `${Date.now()}-${randomUUID()}-${toSafeFileName(fileName)}`;
}

type StoredProduct = {
  productId: string;
  title: string;
  description: string;
  imageUrl: string;
  imageUrls: string[];
  category: string;
  basePrice: string;
  pricingState: ProductPricingState;
};

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const authToken = String(formData.get('authToken') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const basePrice = String(formData.get('basePrice') ?? '').trim();
  const serializedPricingState = String(formData.get('pricingState') ?? '{}');
  const selectedCategory = String(formData.get('category') ?? '').trim();
  const newCategory = String(formData.get('newCategory') ?? '').trim();
  const photos = formData
    .getAll('photos')
    .filter((photo): photo is File => photo instanceof File && photo.size > 0)
    .slice(0, MAX_PRODUCT_PHOTOS);

  const category = newCategory || selectedCategory;

  if (!title || !description || !category) {
    return { message: 'Başlık, açıklama ve kategori zorunlu.', success: false } satisfies ActionData;
  }

  let pricingState: ProductPricingState;

  try {
    pricingState = JSON.parse(serializedPricingState) as ProductPricingState;
  } catch {
    return { message: 'Fiyatlandırma verisi okunamadı.', success: false } satisfies ActionData;
  }

  const errors = validatePricingState(pricingState);
  if (errors.length > 0) {
    return { message: errors[0]?.message ?? 'Fiyatlandırma doğrulaması başarısız.', success: false } satisfies ActionData;
  }

  if (!authToken) {
    return { message: 'Admin oturumu doğrulanamadı.', success: false } satisfies ActionData;
  }

  const { getAdminAuth, getAdminFirestore, getAdminStorageBucket, FieldValue } = await import('../lib/firebase-admin.server');
  const adminAuth = await getAdminAuth();
  const decodedToken = await adminAuth.verifyIdToken(authToken).catch(() => null);

  if (!decodedToken) {
    return { message: 'Admin oturumu doğrulanamadı.', success: false } satisfies ActionData;
  }

  if (decodedToken.admin !== true) {
    return { message: 'Bu işlem için admin yetkisi gerekli.', success: false } satisfies ActionData;
  }

  const db = await getAdminFirestore();
  const nextProductId = randomUUID();

  const uploadedImageUrls: string[] = [];

  if (photos.length > 0) {
    const bucket = await getAdminStorageBucket();

    for (const photo of photos) {
      const imageFileName = createStorageFileName(photo.name);
      const storagePath = `products/${nextProductId}/${imageFileName}`;
      const imageFile = bucket.file(storagePath);
      const downloadToken = randomUUID();
      const imageBuffer = Buffer.from(await photo.arrayBuffer());

      await imageFile.save(imageBuffer, {
        metadata: {
          contentType: photo.type || 'application/octet-stream',
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        resumable: false,
      });

      uploadedImageUrls.push(
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
          storagePath,
        )}?alt=media&token=${downloadToken}`,
      );
    }
  }

  const imageUrls = uploadedImageUrls.length > 0 ? uploadedImageUrls : ['App/Images/MainSectionImage.JPG'];
  const imageUrl = imageUrls[0];

  const draftProduct: StoredProduct = {
    productId: nextProductId,
    title,
    description,
    imageUrl,
    imageUrls,
    category,
    basePrice,
    pricingState,
  };

  await db.collection('products').doc(nextProductId).set({
    ...draftProduct,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { message: `Taslak ürün #${nextProductId} Firestore'a kaydedildi.`, success: true } satisfies ActionData;
}

const initialPricingState: ProductPricingState = {
  basePrice: 0,
  variationGroups: [],
  combinations: [],
};

function AddProductContent() {
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [photoFields, setPhotoFields] = useState([{ id: createId(), fileName: '' }]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesError(null);

      try {
        const products = await fetchProducts();
        const nextCategories = Array.from(
          new Set(products.map((product) => product.category.trim()).filter(Boolean)),
        ).sort();

        if (isSubscribed) {
          setCategories(nextCategories);
          setSelectedCategory((currentCategory) => currentCategory || nextCategories[0] || '');
        }
      } catch (error) {
        if (isSubscribed) {
          setCategories([]);
          setCategoriesError(error instanceof Error ? error.message : 'Kategoriler yüklenirken hata oluştu.');
        }
      } finally {
        if (isSubscribed) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const [pricingState, setPricingState] = useState<ProductPricingState>(initialPricingState);
  const [variationNameInput, setVariationNameInput] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [optionLabelInput, setOptionLabelInput] = useState('');
  const [optionIdInput, setOptionIdInput] = useState('');
  const [optionSkuFragmentInput, setOptionSkuFragmentInput] = useState('');
  const [optionStockInput, setOptionStockInput] = useState('0');

  const selectedGroup = useMemo(
    () => pricingState.variationGroups.find((group) => group.id === selectedGroupId),
    [pricingState.variationGroups, selectedGroupId],
  );

  const validationErrors = useMemo(() => validatePricingState(pricingState), [pricingState]);
  const canAddVariationGroup = variationNameInput.trim().length > 0 && pricingState.variationGroups.length < 2;

  const handlePhotoChange = (fieldId: string, event: ChangeEvent<HTMLInputElement>) => {
    const selectedPhoto = event.target.files?.[0] ?? null;

    setPhotoFields((currentFields) =>
      currentFields.map((field) => (field.id === fieldId ? { ...field, fileName: selectedPhoto?.name ?? '' } : field)),
    );
  };

  const addPhotoField = () => {
    setPhotoFields((currentFields) => {
      if (currentFields.length >= MAX_PRODUCT_PHOTOS) {
        return currentFields;
      }

      return [...currentFields, { id: createId(), fileName: '' }];
    });
  };

  const refreshCombinations = (groups: VariationGroup[]) => {
    setPricingState((prev) => ({
      ...prev,
      variationGroups: groups,
      combinations: generateCombinations(groups, prev.combinations),
    }));
  };

  const addVariationGroup = () => {
    if (!variationNameInput.trim() || pricingState.variationGroups.length >= 2) {
      return;
    }

    const id = slugify(variationNameInput) || createId();
    const nextGroups = [
      ...pricingState.variationGroups,
      {
        id,
        name: variationNameInput.trim(),
        options: [],
      },
    ];

    refreshCombinations(nextGroups);
    setSelectedGroupId(id);
    setVariationNameInput('');
  };

  const removeVariationGroup = (groupId: string) => {
    const nextGroups = pricingState.variationGroups.filter((group) => group.id !== groupId);
    refreshCombinations(nextGroups);
    setSelectedGroupId((prev) => (prev === groupId ? '' : prev));
  };

  const addOption = () => {
    if (!selectedGroup || !optionLabelInput.trim()) {
      return;
    }

    const candidateId = optionIdInput.trim() || `${selectedGroup.id}_${slugify(optionLabelInput)}`;
    const stockValue = Number(optionStockInput) || 0;

    const nextOption: VariationOption = {
      id: candidateId,
      label: optionLabelInput.trim(),
      skuFragment: optionSkuFragmentInput.trim() || undefined,
      stock: stockValue,
    };

    const nextGroups = pricingState.variationGroups.map((group) =>
      group.id === selectedGroup.id
        ? {
            ...group,
            options: [...group.options, nextOption],
          }
        : group,
    );

    refreshCombinations(nextGroups);
    setOptionLabelInput('');
    setOptionIdInput('');
    setOptionSkuFragmentInput('');
    setOptionStockInput('0');
  };

  const removeOption = (groupId: string, optionId: string) => {
    const nextGroups = pricingState.variationGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            options: group.options.filter((option) => option.id !== optionId),
          }
        : group,
    );

    refreshCombinations(nextGroups);
  };

  const updateCombination = (
    key: string,
    patch: Partial<Pick<ProductCombination, 'price' | 'stock' | 'sku' | 'enabled'>>,
  ) => {
    setPricingState((prev) => ({
      ...prev,
      combinations: prev.combinations.map((combination) =>
        combination.key === key ? { ...combination, ...patch } : combination,
      ),
    }));
  };

  const loadSeed = () => {
    setPricingState(tableSeedPricingState);
    setBasePrice(String(tableSeedPricingState.basePrice));
    setSelectedGroupId(tableSeedPricingState.variationGroups[0]?.id ?? '');
  };

  const serializedPricingState = JSON.stringify({
    ...pricingState,
    basePrice: Number(basePrice) || 0,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const currentUser = user;

    setSubmitError(null);

    if (!currentUser) {
      const message = 'Ürün kaydetmek için admin olarak giriş yapmalısınız.';
      setSubmitError(message);
      window.alert(message);
      return;
    }

    try {
      const tokenResult = await currentUser.getIdTokenResult(true);

      if (tokenResult.claims.admin !== true) {
        const message = 'Admin yetkisi yenilenemedi. Lütfen çıkış yapıp tekrar giriş yapın.';
        setSubmitError(message);
        window.alert(message);
        return;
      }

      const authToken = tokenResult.token || (await currentUser.getIdToken(true));
      const formData = new FormData(form);
      formData.set('authToken', authToken);
      submit(formData, { method: 'post', encType: 'multipart/form-data' });
    } catch (error) {
      const detail = error instanceof Error ? ` (${error.message})` : '';
      const message = `Admin oturumu doğrulanamadı. Lütfen tekrar giriş yapın.${detail}`;
      setSubmitError(message);
      window.alert(message);
    }
  };

  return (
    <>
      <NavBar />
      <main className="add-product-page">
        <section className="add-product-page__header">
          <p className="add-product-page__eyebrow">Admin Tools</p>
          <h1>Add product with Etsy-style combination pricing</h1>
          <p>Pricing is resolved only by combination matrix lookup. Max 2 pricing dimensions are supported.</p>
        </section>

        <Form className="add-product-form" method="post" encType="multipart/form-data" onSubmit={handleSubmit}>
          {submitError && <p className="hint danger-text">{submitError}</p>}
          {actionData?.message && <p className={actionData.success ? 'hint success-text' : 'hint danger-text'}>{actionData.message}</p>}
          {categoriesLoading && <p className="hint">Kategoriler Firestore'dan yükleniyor...</p>}
          {categoriesError && <p className="hint danger-text">{categoriesError}</p>}
          <input type="hidden" name="authToken" value="" readOnly />

          {validationErrors.length > 0 && (
            <div className="validation-errors">
              {validationErrors.map((error, index) => (
                <p key={`${error.field}-${index}`} className="hint danger-text">
                  {error.message}
                </p>
              ))}
            </div>
          )}

          <section className="add-product-section">
            <h2>About</h2>
            <label>
              Title
              <input
                type="text"
                placeholder="Örn: Handcrafted Ceramic Mug"
                maxLength={140}
                value={title}
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <span className="hint">{title.length}/140</span>
            </label>

            <div className="photo-fields">
              <span className="photo-fields__label">Photos</span>
              {photoFields.map((field, index) => (
                <label key={field.id} className="photo-field">
                  Fotoğraf {index + 1}
                  <input type="file" accept="image/*" name="photos" onChange={(event) => handlePhotoChange(field.id, event)} />
                  {field.fileName && <span className="hint">Seçilen dosya: {field.fileName}</span>}
                </label>
              ))}
              <button
                type="button"
                className="add-photo-button"
                onClick={addPhotoField}
                disabled={photoFields.length >= MAX_PRODUCT_PHOTOS}
                title={photoFields.length >= MAX_PRODUCT_PHOTOS ? 'En fazla 10 fotoğraf ekleyebilirsiniz.' : undefined}
              >
                + Add photo
              </button>
              <span className="hint">
                {photoFields.length}/{MAX_PRODUCT_PHOTOS} fotoğraf alanı açık. Her ürün Firestore'da en fazla 10 fotoğraf tutar.
              </span>
            </div>

            <label>
              Description
              <textarea
                rows={6}
                placeholder="Ürünü, malzemesini ve bakım bilgisini anlatın..."
                value={description}
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </label>

            <label>
              Category
              <select value={selectedCategory} name="category" onChange={(event) => setSelectedCategory(event.target.value)}>
                <option value="">Kategori seçin</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Yeni kategori (opsiyonel)
              <input
                type="text"
                name="newCategory"
                placeholder="Örn: Handmade Jewelry"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
              />
            </label>
          </section>

          <section className="add-product-section">
            <h2>Base Price</h2>
            <label>
              Base Price (₺)
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={basePrice}
                name="basePrice"
                onChange={(event) => {
                  const next = event.target.value;
                  setBasePrice(next);
                  setPricingState((prev) => ({ ...prev, basePrice: Number(next) || 0 }));
                }}
                required
              />
            </label>
            <button type="button" onClick={loadSeed}>
              Load table seed example
            </button>
          </section>

          <input type="hidden" name="pricingState" value={serializedPricingState} readOnly />

          <section className="add-product-section">
            <h2>Variation groups (max 2)</h2>
            <div className="variation-builder">
              <label>
                Variation group name
                <input
                  type="text"
                  placeholder="Örn: Size"
                  value={variationNameInput}
                  onChange={(event) => setVariationNameInput(event.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={addVariationGroup}
                disabled={!canAddVariationGroup}
                title={
                  !canAddVariationGroup
                    ? pricingState.variationGroups.length >= 2
                    ? 'En fazla 2 variation group ekleyebilirsiniz.'
                    : 'Önce variation group name girin.'
                    : undefined
                }
              >
                + Add Group
              </button>
            </div>

            {pricingState.variationGroups.length > 0 && (
              <div className="variation-list">
                {pricingState.variationGroups.map((group) => (
                  <article key={group.id} className={`variation-card ${selectedGroupId === group.id ? 'is-active' : ''}`}>
                    <button type="button" onClick={() => setSelectedGroupId(group.id)}>
                      {group.name}
                    </button>
                    <span>{group.options.length} options</span>
                    <button type="button" className="danger" onClick={() => removeVariationGroup(group.id)}>
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            )}

            <div className="option-builder">
              <h3>Option editor</h3>
              {!selectedGroup && <p>Select a variation group first.</p>}

              {selectedGroup && (
                <>
                  <p className="hint">Active group: {selectedGroup.name}</p>
                  <div className="option-inputs">
                    <input
                      type="text"
                      placeholder="Option label (e.g. 100x60)"
                      value={optionLabelInput}
                      onChange={(event) => setOptionLabelInput(event.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Option id (optional)"
                      value={optionIdInput}
                      onChange={(event) => setOptionIdInput(event.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="SKU fragment (optional)"
                      value={optionSkuFragmentInput}
                      onChange={(event) => setOptionSkuFragmentInput(event.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Stock"
                      value={optionStockInput}
                      onChange={(event) => setOptionStockInput(event.target.value)}
                    />

                    <button type="button" onClick={addOption}>
                      Add Option
                    </button>
                  </div>

                  {selectedGroup.options.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Option Label</th>
                          <th>Option Id</th>
                          <th>SKU Fragment</th>
                          <th>Stock</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGroup.options.map((option) => (
                          <tr key={option.id}>
                            <td>{option.label}</td>
                            <td>{option.id}</td>
                            <td>{option.skuFragment || '-'}</td>
                            <td>{option.stock ?? 0}</td>
                            <td>
                              <button type="button" className="danger" onClick={() => removeOption(selectedGroup.id, option.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No options in this group yet.</p>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="add-product-section">
            <h2>Combination matrix pricing</h2>
            <p className="hint">Price, stock, and SKU are set manually per combination row.</p>
            <AdminCombinationPricingTable
              groups={pricingState.variationGroups}
              combinations={pricingState.combinations}
              onUpdateCombination={updateCombination}
            />
          </section>

          <section className="add-product-section">
            <StorefrontVariationSelector
              basePrice={Number(basePrice) || 0}
              groups={pricingState.variationGroups}
              combinations={pricingState.combinations}
            />
          </section>

          <div className="add-product-actions">
            <button type="submit" disabled={validationErrors.length > 0}>
              Save as Draft
            </button>
          </div>
        </Form>
      </main>
    </>
  );
}

export default function AddProduct() {
  return (
    <AuthGuard requireAdmin>
      <AddProductContent />
    </AuthGuard>
  );
}
