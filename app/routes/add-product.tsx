import { randomUUID } from 'node:crypto';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Form, useActionData, useNavigation, useSearchParams, useSubmit } from 'react-router';
import { AuthGuard } from '../components/auth/AuthGuard';
import { AdminCombinationPricingTable } from '../components/pricing/AdminCombinationPricingTable';
import { StorefrontVariationSelector } from '../components/pricing/StorefrontVariationSelector';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { useAuth } from '../hooks/useAuth';
import { fetchProductById, fetchProducts } from '../lib/products';
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
    { title: 'Add / Edit Product | Online Shopping' },
    { name: 'description', content: 'Create and edit listing style products with variation matrix pricing.' },
  ];
}

const createId = () => Math.random().toString(36).slice(2, 10);
const MAX_PRODUCT_PHOTOS = 10;
type PhotoField = { id: string; file?: File; fileName: string; previewUrl: string };

const createEmptyPhotoField = (): PhotoField => ({ id: createId(), fileName: '', previewUrl: '' });

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
  const editProductId = String(formData.get('editProductId') ?? '').trim();
  const duplicateSourceProductId = String(formData.get('duplicateSourceProductId') ?? '').trim();
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
  const retainedImageUrls = formData
    .getAll('existingPhotoUrls')
    .map((imageUrl) => String(imageUrl).trim())
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_PHOTOS);

  const submittedCategory = newCategory || selectedCategory;

  let pricingState: ProductPricingState;

  try {
    pricingState = JSON.parse(serializedPricingState) as ProductPricingState;
  } catch {
    return { message: 'Pricing data could not be read.', success: false } satisfies ActionData;
  }

  const errors = validatePricingState(pricingState);
  if (errors.length > 0) {
    return { message: errors[0]?.message ?? 'Pricing check failed.', success: false } satisfies ActionData;
  }

  if (!authToken) {
    return { message: 'We could not confirm the admin session.', success: false } satisfies ActionData;
  }

  const { getAdminAuth, getAdminFirestore, getAdminStorageBucket, FieldValue } = await import('../lib/firebase-admin.server');
  const adminAuth = await getAdminAuth();
  const decodedToken = await adminAuth.verifyIdToken(authToken).catch(() => null);

  if (!decodedToken) {
    return { message: 'We could not confirm the admin session.', success: false } satisfies ActionData;
  }

  if (decodedToken.admin !== true) {
    return { message: 'Admin access is required for this action.', success: false } satisfies ActionData;
  }

  const db = await getAdminFirestore();
  const nextProductId = editProductId || randomUUID();
  const isEditing = editProductId.length > 0;
  const isDuplicating = !isEditing && duplicateSourceProductId.length > 0;
  const existingDocument = isEditing ? await db.collection('products').doc(editProductId).get() : null;
  const duplicateSourceDocument = isDuplicating ? await db.collection('products').doc(duplicateSourceProductId).get() : null;
  const existingProduct = existingDocument?.exists ? existingDocument.data() : null;
  const duplicateSourceProduct = duplicateSourceDocument?.exists ? duplicateSourceDocument.data() : null;
  const sourceProduct = existingProduct ?? duplicateSourceProduct;

  if (isEditing && !existingProduct) {
    return { message: 'We could not find the product to edit.', success: false } satisfies ActionData;
  }

  if (isDuplicating && !duplicateSourceProduct) {
    return { message: 'We could not find the product to duplicate.', success: false } satisfies ActionData;
  }

  const shouldUseSourceFallback = isEditing || isDuplicating;
  const resolvedTitle = title || (shouldUseSourceFallback && typeof sourceProduct?.title === 'string' ? sourceProduct.title.trim() : '');
  const resolvedDescription =
    description || (shouldUseSourceFallback && typeof sourceProduct?.description === 'string' ? sourceProduct.description.trim() : '');
  const resolvedCategory =
    submittedCategory || (shouldUseSourceFallback && typeof sourceProduct?.category === 'string' ? sourceProduct.category.trim() : '');

  if (!resolvedTitle || !resolvedDescription || !resolvedCategory) {
    return { message: 'Title, description, and category are required.', success: false } satisfies ActionData;
  }

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

  const existingImageUrls = Array.isArray(sourceProduct?.imageUrls)
    ? sourceProduct.imageUrls.filter((imageUrl): imageUrl is string => typeof imageUrl === 'string')
    : [];
  const fallbackExistingImageUrl = typeof sourceProduct?.imageUrl === 'string' ? sourceProduct.imageUrl : '';
  const defaultExistingImageUrls = existingImageUrls.length > 0 ? existingImageUrls : [fallbackExistingImageUrl].filter(Boolean);
  const retainedExistingImageUrls =
    isEditing || isDuplicating ? retainedImageUrls.filter((imageUrl) => defaultExistingImageUrls.includes(imageUrl)) : [];
  const imageUrls = [...retainedExistingImageUrls, ...uploadedImageUrls].slice(0, MAX_PRODUCT_PHOTOS);

  if (imageUrls.length === 0) {
    return { message: 'At least one product photo is required.', success: false } satisfies ActionData;
  }

  const imageUrl = imageUrls[0];

  const draftProduct: StoredProduct = {
    productId: nextProductId,
    title: resolvedTitle,
    description: resolvedDescription,
    imageUrl,
    imageUrls,
    category: resolvedCategory,
    basePrice,
    pricingState,
  };

  await db.collection('products').doc(nextProductId).set(
    {
      ...draftProduct,
      isArchived: isEditing && existingProduct?.isArchived === true,
      createdAt: isEditing ? existingProduct?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    message: editProductId
      ? `Product #${nextProductId} was updated and published.`
      : isDuplicating
        ? `Product #${nextProductId} was published as a copy.`
        : `Product #${nextProductId} was published.`,
    success: true,
  } satisfies ActionData;
}

const initialPricingState: ProductPricingState = {
  basePrice: 0,
  variationGroups: [],
  combinations: [],
};

function AddProductContent() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  const editProductId = searchParams.get('productId')?.trim() ?? '';
  const duplicateProductId = searchParams.get('duplicateProductId')?.trim() ?? '';
  const isEditing = editProductId.length > 0;
  const isDuplicating = !isEditing && duplicateProductId.length > 0;
  const submit = useSubmit();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [photoFields, setPhotoFields] = useState<PhotoField[]>([]);
  const photoFieldsRef = useRef(photoFields);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPreparingPublish, setIsPreparingPublish] = useState(false);
  const [pricingState, setPricingState] = useState<ProductPricingState>(initialPricingState);
  const [variationNameInput, setVariationNameInput] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [optionLabelInput, setOptionLabelInput] = useState('');
  const [optionIdInput, setOptionIdInput] = useState('');
  const [optionSkuFragmentInput, setOptionSkuFragmentInput] = useState('');
  const [optionStockInput, setOptionStockInput] = useState('0');

  const resetNewProductForm = () => {
    photoFieldsRef.current.forEach((field) => {
      if (field.previewUrl) {
        URL.revokeObjectURL(field.previewUrl);
      }
    });

    setProductLoading(false);
    setProductError(null);
    setSubmitError(null);
    setExistingPhotoUrls([]);
    setTitle('');
    setDescription('');
    setBasePrice('');
    setPhotoFields([]);
    setSelectedCategory('');
    setNewCategory('');
    setPricingState(initialPricingState);
    setVariationNameInput('');
    setSelectedGroupId('');
    setOptionLabelInput('');
    setOptionIdInput('');
    setOptionSkuFragmentInput('');
    setOptionStockInput('0');
  };

  useEffect(() => {
    photoFieldsRef.current = photoFields;
  }, [photoFields]);

  useEffect(() => {
    return () => {
      photoFieldsRef.current.forEach((field) => {
        if (field.previewUrl) {
          URL.revokeObjectURL(field.previewUrl);
        }
      });
    };
  }, []);

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
        }
      } catch (error) {
        if (isSubscribed) {
          setCategories([]);
          setCategoriesError(error instanceof Error ? error.message : 'Categories could not be loaded.');
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

  useEffect(() => {
    let isSubscribed = true;

    async function loadEditableProduct() {
      const sourceProductId = editProductId || duplicateProductId;

      if (!sourceProductId) {
        resetNewProductForm();
        return;
      }

      setProductLoading(true);
      setProductError(null);

      try {
        const editableProduct = await fetchProductById(sourceProductId);

        if (!isSubscribed) {
          return;
        }

        if (!editableProduct) {
          setProductError(isDuplicating ? 'We could not find the product to duplicate.' : 'We could not find the product to edit.');
          return;
        }

        setTitle(editableProduct.title);
        setDescription(editableProduct.description);
        setBasePrice(String(editableProduct.basePrice ?? editableProduct.pricingState?.basePrice ?? 0));
        setSelectedCategory(editableProduct.category);
        setNewCategory('');
        setPricingState(editableProduct.pricingState ?? { ...initialPricingState, basePrice: Number(editableProduct.basePrice) || 0 });
        setSelectedGroupId(editableProduct.pricingState?.variationGroups[0]?.id ?? '');
        const editablePhotoUrls = editableProduct.imageUrls?.length ? editableProduct.imageUrls : [editableProduct.imageUrl].filter(Boolean);
        setExistingPhotoUrls(editablePhotoUrls);
        setPhotoFields(editablePhotoUrls.length >= MAX_PRODUCT_PHOTOS ? [] : [createEmptyPhotoField()]);
      } catch (error) {
        if (isSubscribed) {
          setProductError(error instanceof Error ? error.message : 'Product details could not be loaded.');
        }
      } finally {
        if (isSubscribed) {
          setProductLoading(false);
        }
      }
    }

    loadEditableProduct();

    return () => {
      isSubscribed = false;
    };
  }, [duplicateProductId, editProductId, isDuplicating]);

  const selectedGroup = useMemo(
    () => pricingState.variationGroups.find((group) => group.id === selectedGroupId),
    [pricingState.variationGroups, selectedGroupId],
  );

  const validationErrors = useMemo(() => validatePricingState(pricingState), [pricingState]);
  const canAddVariationGroup = variationNameInput.trim().length > 0 && pricingState.variationGroups.length < 2;

  const totalPhotoSlots = existingPhotoUrls.length + photoFields.length;
  const canAddPhotoField = totalPhotoSlots < MAX_PRODUCT_PHOTOS;

  const handlePhotoChange = (fieldId: string, event: ChangeEvent<HTMLInputElement>) => {
    const selectedPhotos = Array.from(event.target.files ?? []);
    const remainingPhotoSlots = Math.max(0, MAX_PRODUCT_PHOTOS - existingPhotoUrls.length);

    setPhotoFields((currentFields) => {
      const selectedFieldIndex = currentFields.findIndex((field) => field.id === fieldId);

      if (selectedFieldIndex === -1) {
        return currentFields;
      }

      const selectedField = currentFields[selectedFieldIndex];

      if (selectedPhotos.length === 0) {
        if (selectedField?.previewUrl) {
          URL.revokeObjectURL(selectedField.previewUrl);
        }

        return currentFields.map((field) =>
          field.id === fieldId
            ? {
                ...field,
                file: undefined,
                fileName: '',
                previewUrl: '',
              }
            : field,
        );
      }

      const fieldsBeforeSelectedField = currentFields.slice(0, selectedFieldIndex);
      const availableSlots = Math.max(0, remainingPhotoSlots - fieldsBeforeSelectedField.length);
      const replacementFields = selectedPhotos.slice(0, availableSlots).map((photo) => ({
        id: createId(),
        file: photo,
        fileName: photo.name,
        previewUrl: URL.createObjectURL(photo),
      }));

      const fieldsAfterSelectedField = currentFields
        .slice(selectedFieldIndex + 1)
        .filter((field) => replacementFields.length <= 1 || field.file);
      const nextFields = [...fieldsBeforeSelectedField, ...replacementFields, ...fieldsAfterSelectedField].slice(0, remainingPhotoSlots);
      const retainedFieldIds = new Set(nextFields.map((field) => field.id));

      currentFields.forEach((field) => {
        if ((field.id === fieldId || !retainedFieldIds.has(field.id)) && field.previewUrl) {
          URL.revokeObjectURL(field.previewUrl);
        }
      });

      return nextFields;
    });

    event.target.value = '';
  };

  const addPhotoField = () => {
    setPhotoFields((currentFields) => {
      if (existingPhotoUrls.length + currentFields.length >= MAX_PRODUCT_PHOTOS) {
        return currentFields;
      }

      return [...currentFields, createEmptyPhotoField()];
    });
  };

  const removeExistingPhoto = (photoUrl: string) => {
    setExistingPhotoUrls((currentUrls) => currentUrls.filter((currentUrl) => currentUrl !== photoUrl));
  };

  const removePhotoField = (fieldId: string) => {
    setPhotoFields((currentFields) => {
      const removedField = currentFields.find((field) => field.id === fieldId);
      if (removedField?.previewUrl) {
        URL.revokeObjectURL(removedField.previewUrl);
      }

      return currentFields.filter((field) => field.id !== fieldId);
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
  const isPublishing = isPreparingPublish || navigation.state === 'submitting' || navigation.state === 'loading';

  useEffect(() => {
    if (navigation.state === 'idle') {
      setIsPreparingPublish(false);
    }
  }, [navigation.state]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const currentUser = user;

    setSubmitError(null);
    setIsPreparingPublish(true);

    if (!currentUser) {
      const message = 'Please sign in as an admin to save a product.';
      setSubmitError(message);
      setIsPreparingPublish(false);
      window.alert(message);
      return;
    }

    try {
      const tokenResult = await currentUser.getIdTokenResult(true);

      if (tokenResult.claims.admin !== true) {
        const message = 'Admin access could not be refreshed. Please sign out and sign back in.';
        setSubmitError(message);
        setIsPreparingPublish(false);
        window.alert(message);
        return;
      }

      const authToken = tokenResult.token || (await currentUser.getIdToken(true));
      const formData = new FormData(form);
      formData.set('authToken', authToken);
      formData.delete('photos');
      photoFields
        .filter((field) => field.file)
        .slice(0, Math.max(0, MAX_PRODUCT_PHOTOS - existingPhotoUrls.length))
        .forEach((field) => {
          if (field.file) {
            formData.append('photos', field.file, field.file.name);
          }
        });
      submit(formData, { method: 'post', encType: 'multipart/form-data' });
    } catch (error) {
      const detail = error instanceof Error ? ` (${error.message})` : '';
      const message = `We could not confirm the admin session. Please sign in again.${detail}`;
      setSubmitError(message);
      setIsPreparingPublish(false);
      window.alert(message);
    }
  };

  return (
    <>
      <NavBar />
      <main className="add-product-page">
        <section className="add-product-page__header">
          <p className="add-product-page__eyebrow">Admin Tools</p>
          <h1>
            {isEditing
              ? 'Edit product with Etsy-style combination pricing'
              : isDuplicating
                ? 'Duplicate product with Etsy-style combination pricing'
                : 'Add product with Etsy-style combination pricing'}
          </h1>
          <p>Pricing is resolved only by combination matrix lookup. Max 2 pricing dimensions are supported.</p>
        </section>

        <Form className="add-product-form" method="post" encType="multipart/form-data" onSubmit={handleSubmit}>
          {submitError && <p className="hint danger-text">{submitError}</p>}
          {categoriesLoading && <p className="hint">Loading categories from Firestore...</p>}
          {categoriesError && <p className="hint danger-text">{categoriesError}</p>}
          {productLoading && <p className="hint">Loading product details...</p>}
          {productError && <p className="hint danger-text">{productError}</p>}
          <input type="hidden" name="authToken" value="" readOnly />
          <input type="hidden" name="editProductId" value={isEditing ? editProductId : ''} readOnly />
          <input type="hidden" name="duplicateSourceProductId" value={isDuplicating ? duplicateProductId : ''} readOnly />

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
                placeholder="Example: Handcrafted Ceramic Mug"
                maxLength={140}
                value={title}
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                required={!isEditing}
              />
              <span className="hint">{title.length}/140</span>
            </label>

            <div className="photo-fields">
              <span className="photo-fields__label">Photos</span>
              <div className="photo-tile-grid">
                {isEditing || isDuplicating
                  ? existingPhotoUrls.map((photoUrl, index) => {
                      const photoLabel = isDuplicating ? 'Copied product photo' : 'Current product photo';

                      return (
                        <div key={photoUrl} className="photo-tile photo-tile--filled">
                          <input type="hidden" name="existingPhotoUrls" value={photoUrl} />
                          <img src={photoUrl} alt={`${photoLabel} ${index + 1}`} />
                          <button
                            type="button"
                            className="photo-tile__delete"
                            aria-label={`${photoLabel} ${index + 1} delete`}
                            onClick={() => removeExistingPhoto(photoUrl)}
                          >
                            🗑
                          </button>
                        </div>
                      );
                    })
                  : null}
                {photoFields.map((field, index) => (
                  <label key={field.id} className={`photo-tile${field.previewUrl ? ' photo-tile--filled' : ''}`}>
                    <input type="file" accept="image/*" multiple onChange={(event) => handlePhotoChange(field.id, event)} />
                    {field.previewUrl ? (
                      <>
                        <img src={field.previewUrl} alt={field.fileName || `New product photo ${index + 1}`} />
                        <button
                          type="button"
                          className="photo-tile__delete"
                          aria-label={`New product photo ${index + 1} delete`}
                          onClick={(event) => {
                            event.preventDefault();
                            removePhotoField(field.id);
                          }}
                        >
                          🗑
                        </button>
                      </>
                    ) : (
                      <span className="photo-tile__empty" aria-hidden="true">
                        +
                      </span>
                    )}
                    <span className="photo-tile__label">{field.fileName || `Photo ${existingPhotoUrls.length + index + 1}`}</span>
                  </label>
                ))}
                <button
                  type="button"
                  className="photo-tile photo-tile--add"
                  onClick={addPhotoField}
                  disabled={!canAddPhotoField}
                  title={!canAddPhotoField ? 'You can add up to 10 photos.' : undefined}
                >
                  <span aria-hidden="true">+</span>
                  <span>Add photo</span>
                </button>
              </div>
              <span className="hint">
                {totalPhotoSlots}/{MAX_PRODUCT_PHOTOS} photo boxes are open. When editing, current photos stay if you do not choose new photos.
              </span>
            </div>

            <label>
              Description
              <textarea
                rows={6}
                placeholder="Describe the item, materials, and care steps..."
                value={description}
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                required={!isEditing}
              />
            </label>

            <label>
              Category
              <select value={selectedCategory} name="category" onChange={(event) => setSelectedCategory(event.target.value)}>
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              New category (optional)
              <input
                type="text"
                name="newCategory"
                placeholder="Example: Handmade Jewelry"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
              />
            </label>
          </section>

          <section className="add-product-section">
            <h2>Base Price</h2>
            <label>
              Base Price ($)
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
                  placeholder="Example: Size"
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
                    ? 'You can add up to 2 variation groups.'
                    : 'Enter a variation group name first.'
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
            <div className="add-product-publish-panel">
              <button type="submit" disabled={validationErrors.length > 0 || isPublishing}>
                {isPublishing ? (
                  <span className="add-product-publish-loading" aria-live="polite">
                    <span className="add-product-spinner" aria-hidden="true" />
                    Publishing...
                  </span>
                ) : isEditing ? (
                  'Save and Publish'
                ) : isDuplicating ? (
                  'Publish as Copy'
                ) : (
                  'Publish'
                )}
              </button>
              {isPublishing ? <p className="hint add-product-publish-status">Publishing, please wait...</p> : null}
              {actionData?.message ? (
                <p className={actionData.success ? 'hint success-text add-product-publish-status' : 'hint danger-text add-product-publish-status'}>
                  {actionData.success ? 'Succeeded.' : actionData.message}
                </p>
              ) : null}
            </div>
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
