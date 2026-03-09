import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
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

export default function AddProduct() {
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      title,
      description,
      basePrice,
      photoNames: photos.map((photo) => photo.name),
      pricesVaryByOption,
      variations,
    };

    console.log('Add product payload', payload);
    alert('Product data logged to console. Backend bağlantısı eklendiğinde kaydetme aktif olacak.');
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

        <form className="add-product-form" onSubmit={handleSubmit}>
          <section className="add-product-section">
            <h2>About</h2>
            <label>
              Title
              <input
                type="text"
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
              <input type="file" accept="image/*" multiple onChange={handlePhotoChange} />
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
                onChange={(event) => setBasePrice(event.target.value)}
                required
              />
            </label>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={pricesVaryByOption}
                onChange={(event) => setPricesVaryByOption(event.target.checked)}
              />
              Varyasyona göre fiyat değişsin
            </label>
          </section>

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
        </form>
      </main>
    </>
  );
}
