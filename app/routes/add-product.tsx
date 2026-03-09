import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Form, useActionData } from 'react-router';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import addProductStylesHref from './add-product.css?url';
import type { Route } from './+types/add-product';

type VariationOption = {
  id: string;
  title: string;
  price: string;
};

type Variation = {
  id: string;
  name: string;
  options: VariationOption[];
};

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: addProductStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Add Product | Online Shopping' },
    { name: 'description', content: 'Create listing style products with variations and optional pricing.' },
  ];
}

const createId = () => Math.random().toString(36).slice(2, 10);
const currentFilePath = fileURLToPath(import.meta.url);
const appDirectory = path.resolve(path.dirname(currentFilePath), '..');
const productsTextFilePath = path.join(appDirectory, 'data', 'products.txt');
const productImagesDirectoryPath = path.join(appDirectory, 'Images');

type ActionData = {
  success?: boolean;
  message: string;
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
  pricesVaryByOption?: boolean;
  variations?: Variation[];
};

function parseProductsText(text: string): StoredProduct[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StoredProduct);
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const basePrice = String(formData.get('basePrice') ?? '').trim();
  const pricesVaryByOption = formData.get('pricesVaryByOption') === 'on';
  const serializedVariations = String(formData.get('variations') ?? '[]');
  const photo = formData.get('photos');

  if (!title || !description) {
    return { message: 'Başlık ve açıklama zorunlu.', success: false } satisfies ActionData;
  }

  let variations: Variation[] = [];

  try {
    variations = JSON.parse(serializedVariations) as Variation[];
  } catch {
    return { message: 'Varyasyon verisi okunamadı.', success: false } satisfies ActionData;
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
    category: 'Drafts',
    basePrice,
    pricesVaryByOption,
    variations,
  };

  await writeFile(productsTextFilePath, `${productsText.trimEnd()}\n${JSON.stringify(draftProduct)}\n`, 'utf8');

  return { message: `Taslak ürün #${nextProductId} kaydedildi.`, success: true } satisfies ActionData;
}

export default function AddProduct() {
  const actionData = useActionData<ActionData>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationName, setVariationName] = useState('');
  const [optionTitle, setOptionTitle] = useState('');
  const [optionPrice, setOptionPrice] = useState('');
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [pricesVaryByOption, setPricesVaryByOption] = useState(false);

  const selectedVariation = useMemo(
    () => variations.find((variation) => variation.id === selectedVariationId),
    [selectedVariationId, variations],
  );

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }

    const files = Array.from(event.target.files);
    setPhotos(files);
  };

  const addVariation = () => {
    if (!variationName.trim()) {
      return;
    }

    const newVariation: Variation = {
      id: createId(),
      name: variationName.trim(),
      options: [],
    };

    setVariations((prev) => [...prev, newVariation]);
    setSelectedVariationId(newVariation.id);
    setVariationName('');
  };

  const deleteVariation = (variationId: string) => {
    setVariations((prev) => prev.filter((variation) => variation.id !== variationId));
    setSelectedVariationId((prev) => (prev === variationId ? '' : prev));
  };

  const addOption = () => {
    if (!selectedVariationId || !optionTitle.trim()) {
      return;
    }

    setVariations((prev) =>
      prev.map((variation) => {
        if (variation.id !== selectedVariationId) {
          return variation;
        }

        return {
          ...variation,
          options: [
            ...variation.options,
            { id: createId(), title: optionTitle.trim(), price: optionPrice.trim() },
          ],
        };
      }),
    );

    setOptionTitle('');
    setOptionPrice('');
  };

  const deleteOption = (variationId: string, optionId: string) => {
    setVariations((prev) =>
      prev.map((variation) => {
        if (variation.id !== variationId) {
          return variation;
        }

        return {
          ...variation,
          options: variation.options.filter((option) => option.id !== optionId),
        };
      }),
    );
  };

  const updateOptionPrice = (variationId: string, optionId: string, value: string) => {
    setVariations((prev) =>
      prev.map((variation) => {
        if (variation.id !== variationId) {
          return variation;
        }

        return {
          ...variation,
          options: variation.options.map((option) => {
            if (option.id !== optionId) {
              return option;
            }

            return {
              ...option,
              price: value,
            };
          }),
        };
      }),
    );
  };

  return (
    <>
      <NavBar />
      <main className="add-product-page">
        <section className="add-product-page__header">
          <p className="add-product-page__eyebrow">Admin Tools</p>
          <h1>Etsy benzeri ürün ekleme sayfası</h1>
          <p>
            Burayı route olarak açtık. İleride e-posta/şifre tabanlı admin auth geldiğinde sadece yetkili kullanıcılar
            görebilecek.
          </p>
        </section>

        <Form className="add-product-form" method="post" encType="multipart/form-data">
          {actionData?.message && <p className="hint">{actionData.message}</p>}
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
          </section>

          <section className="add-product-section">
            <h2>Price & Inventory</h2>
            <label>
              Base Price (₺)
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={basePrice}
                name="basePrice"
                onChange={(event) => setBasePrice(event.target.value)}
                required
              />
            </label>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={pricesVaryByOption}
                name="pricesVaryByOption"
                onChange={(event) => setPricesVaryByOption(event.target.checked)}
              />
              Varyasyona göre fiyat değişsin
            </label>
          </section>

          <input type="hidden" name="variations" value={JSON.stringify(variations)} readOnly />

          <section className="add-product-section">
            <h2>Variations</h2>
            <div className="variation-builder">
              <label>
                Variation Name
                <input
                  type="text"
                  placeholder="Örn: Size veya Color"
                  value={variationName}
                  onChange={(event) => setVariationName(event.target.value)}
                />
              </label>
              <button type="button" onClick={addVariation}>
                + Add Variation
              </button>
            </div>

            {variations.length > 0 && (
              <div className="variation-list">
                {variations.map((variation) => (
                  <article
                    key={variation.id}
                    className={`variation-card ${selectedVariationId === variation.id ? 'is-active' : ''}`}
                  >
                    <button type="button" onClick={() => setSelectedVariationId(variation.id)}>
                      {variation.name}
                    </button>
                    <span>{variation.options.length} options</span>
                    <button type="button" className="danger" onClick={() => deleteVariation(variation.id)}>
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            )}

            <div className="option-builder">
              <h3>Option editor</h3>
              {!selectedVariation && <p>Önce bir varyasyon seçin veya yeni bir varyasyon oluşturun.</p>}

              {selectedVariation && (
                <>
                  <p className="hint">Aktif varyasyon: {selectedVariation.name}</p>
                  <div className="option-inputs">
                    <input
                      type="text"
                      placeholder="Option title (Örn: 20x40 Inches)"
                      value={optionTitle}
                      onChange={(event) => setOptionTitle(event.target.value)}
                    />

                    {pricesVaryByOption && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Option price"
                        value={optionPrice}
                        onChange={(event) => setOptionPrice(event.target.value)}
                      />
                    )}

                    <button type="button" onClick={addOption}>
                      Add Option
                    </button>
                  </div>

                  {selectedVariation.options.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Option</th>
                          {pricesVaryByOption && <th>Price</th>}
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVariation.options.map((option) => (
                          <tr key={option.id}>
                            <td>{option.title}</td>
                            {pricesVaryByOption && (
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={option.price}
                                  onChange={(event) =>
                                    updateOptionPrice(selectedVariation.id, option.id, event.target.value)
                                  }
                                />
                              </td>
                            )}
                            <td>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => deleteOption(selectedVariation.id, option.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>Bu varyasyon için henüz seçenek yok.</p>
                  )}
                </>
              )}
            </div>
          </section>

          <div className="add-product-actions">
            <button type="submit">Save as Draft</button>
          </div>
        </Form>
      </main>
    </>
  );
}
