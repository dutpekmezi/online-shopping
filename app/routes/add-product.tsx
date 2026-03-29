import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Form, useActionData, useLoaderData } from 'react-router';
import { AdminCombinationPricingTable } from '../components/pricing/AdminCombinationPricingTable';
import { StorefrontVariationSelector } from '../components/pricing/StorefrontVariationSelector';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const currentFilePath = fileURLToPath(import.meta.url);
const appDirectory = path.resolve(path.dirname(currentFilePath), '..');
const productsTextFilePath = path.join(appDirectory, 'data', 'products.txt');
const productImagesDirectoryPath = path.join(appDirectory, 'Images');

type ActionData = {
  success?: boolean;
  message: string;
};

type LoaderData = {
  categories: string[];
};

function toSafeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

type StoredProduct = {
  productId: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  basePrice?: string;
  pricingState?: ProductPricingState;
};

function parseProductsText(text: string): StoredProduct[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StoredProduct);
}

export async function loader() {
  const productsText = await readFile(productsTextFilePath, 'utf8');
  const products = parseProductsText(productsText);
  const categories = Array.from(new Set(products.map((product) => product.category.trim()).filter(Boolean))).sort();

  return { categories } satisfies LoaderData;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const basePrice = String(formData.get('basePrice') ?? '').trim();
  const serializedPricingState = String(formData.get('pricingState') ?? '{}');
  const selectedCategory = String(formData.get('category') ?? '').trim();
  const newCategory = String(formData.get('newCategory') ?? '').trim();
  const photo = formData.get('photos');

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

  const productsText = await readFile(productsTextFilePath, 'utf8');
  const products = parseProductsText(productsText);
  const nextProductId = String(
    products.reduce((maxId, product) => {
      const parsedId = Number.parseInt(product.productId.trim(), 10);
      return Number.isNaN(parsedId) ? maxId : Math.max(maxId, parsedId);
    }, 0) + 1,
  );

  let imageUrl = 'App/Images/MainSectionImage.JPG';

  if (photo instanceof File && photo.size > 0) {
    await mkdir(productImagesDirectoryPath, { recursive: true });
    const extension = path.extname(photo.name) || '.jpg';
    const imageFileName = `${nextProductId}-${Date.now()}-${toSafeFileName(path.basename(photo.name, extension))}${extension}`;
    const imagePath = path.join(productImagesDirectoryPath, imageFileName);
    const imageBuffer = Buffer.from(await photo.arrayBuffer());
    await writeFile(imagePath, imageBuffer);
    imageUrl = `App/Images/${imageFileName}`;
  }

  const draftProduct: StoredProduct = {
    productId: nextProductId,
    title,
    description,
    imageUrl,
    category,
    basePrice,
    pricingState,
  };

  await writeFile(productsTextFilePath, `${productsText.trimEnd()}\n${JSON.stringify(draftProduct)}\n`, 'utf8');

  return { message: `Taslak ürün #${nextProductId} kaydedildi.`, success: true } satisfies ActionData;
}

const initialPricingState: ProductPricingState = {
  basePrice: 0,
  variationGroups: [],
  combinations: [],
};

export default function AddProduct() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [photos, setPhotos] = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? '');
  const [newCategory, setNewCategory] = useState('');

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

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }

    setPhotos(Array.from(event.target.files));
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

  return (
    <>
      <NavBar />
      <main className="add-product-page">
        <section className="add-product-page__header">
          <p className="add-product-page__eyebrow">Admin Tools</p>
          <h1>Add product with Etsy-style combination pricing</h1>
          <p>Pricing is resolved only by combination matrix lookup. Max 2 pricing dimensions are supported.</p>
        </section>

        <Form className="add-product-form" method="post" encType="multipart/form-data">
          {actionData?.message && <p className="hint">{actionData.message}</p>}

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

            <label>
              Photos
              <input type="file" accept="image/*" multiple name="photos" onChange={handlePhotoChange} />
            </label>

            {photos.length > 0 && (
              <ul className="photo-list">
                {photos.map((photo) => (
                  <li key={photo.name}>{photo.name}</li>
                ))}
              </ul>
            )}

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
