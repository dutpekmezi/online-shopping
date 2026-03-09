import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useMemo, useState } from 'react';
import { Form, useActionData, useNavigation } from 'react-router';
import type { ChangeEvent } from 'react';
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

type ActionData = {
  success: boolean;
  message: string;
};

const createId = () => Math.random().toString(36).slice(2, 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsFilePath = path.resolve(__dirname, '../data/products.txt');
const imagesDirectoryPath = path.resolve(__dirname, '../Images');

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

async function saveUploadedPhoto(file: File, nextProductId: number) {
  const fileName = sanitizeFileName(file.name);
  const uniqueName = `${nextProductId}-${Date.now()}-${fileName}`;
  const targetPath = path.join(imagesDirectoryPath, uniqueName);
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(targetPath, Buffer.from(arrayBuffer));

  return `App/Images/${uniqueName}`;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim() || 'Custom';
  const basePrice = String(formData.get('basePrice') ?? '').trim();
  const pricesVaryByOption = formData.get('pricesVaryByOption') === 'on';

  if (!title || !description) {
    return Response.json(
      { success: false, message: 'Title ve Description alanları zorunludur.' },
      { status: 400 },
    );
  }

  const rawVariations = String(formData.get('variationsJson') ?? '[]');
  const variations = JSON.parse(rawVariations) as Variation[];

  const lines = (await readFile(productsFilePath, 'utf-8'))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const highestId = lines.reduce((maxId, line) => {
    const parsed = JSON.parse(line) as { productId?: string };
    const parsedId = Number.parseInt(parsed.productId?.trim() ?? '0', 10);

    if (Number.isNaN(parsedId)) {
      return maxId;
    }

    return Math.max(maxId, parsedId);
  }, 0);

  const nextProductId = highestId + 1;

  await mkdir(imagesDirectoryPath, { recursive: true });

  const uploadedFiles = formData
    .getAll('photos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const photoUrls: string[] = [];
  for (const photo of uploadedFiles) {
    const photoUrl = await saveUploadedPhoto(photo, nextProductId);
    photoUrls.push(photoUrl);
  }

  const productRecord = {
    productId: String(nextProductId),
    title,
    description,
    imageUrl: photoUrls[0] ?? 'App/Images/MainSectionImage.JPG',
    category,
    basePrice,
    pricesVaryByOption,
    variations,
    photoUrls,
  };

  const nextLine = `${JSON.stringify(productRecord)}\n`;
  await writeFile(productsFilePath, `${lines.join('\n')}\n${nextLine}`, 'utf-8');

  return Response.json({
    success: true,
    message: `Ürün taslak olarak kaydedildi (ID: ${nextProductId}).`,
  });
}

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

export default function AddProduct() {
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Custom');
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
          <section className="add-product-section">
            <h2>About</h2>
            <label>
              Title
              <input
                type="text"
                name="title"
                placeholder="Örn: Handcrafted Ceramic Mug"
                maxLength={140}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <span className="hint">{title.length}/140</span>
            </label>

            <label>
              Photos
              <input type="file" name="photos" accept="image/*" multiple onChange={handlePhotoChange} />
            </label>

            {photos.length > 0 && (
              <ul className="photo-list">
                {photos.map((photo) => (
                  <li key={`${photo.name}-${photo.size}`}>{photo.name}</li>
                ))}
              </ul>
            )}

            <label>
              Description
              <textarea
                name="description"
                rows={6}
                placeholder="Ürünü, malzemesini ve bakım bilgisini anlatın..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </label>

            <label>
              Category
              <input
                type="text"
                name="category"
                placeholder="Örn: Coffee Table Slabs"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
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
                name="basePrice"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={basePrice}
                onChange={(event) => setBasePrice(event.target.value)}
                required
              />
            </label>
            <label className="switch-row">
              <input
                type="checkbox"
                name="pricesVaryByOption"
                checked={pricesVaryByOption}
                onChange={(event) => setPricesVaryByOption(event.target.checked)}
              />
              Varyasyona göre fiyat değişsin
            </label>
          </section>

          <section className="add-product-section">
            <h2>Variations</h2>
            <input type="hidden" name="variationsJson" value={JSON.stringify(variations)} />
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
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>

          {actionData && (
            <p className={actionData.success ? 'feedback feedback--success' : 'feedback feedback--error'}>
              {actionData.message}
            </p>
          )}
        </Form>
      </main>
    </>
  );
}
