import { Link, useNavigate, useParams } from 'react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteDoc, deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { NavBar } from '../components/NavBar/NavBar';
import navBarStylesHref from '../components/NavBar/NavBar.css?url';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase.client';
import { fetchProductById, PRODUCTS_COLLECTION, type Product } from '../lib/products';
import { addCartItem } from '../lib/cart';
import { resolveCombination } from '../lib/pricing/utils';
import type { ProductCombination, ProductPricingState, VariationGroup } from '../lib/pricing/types';
import type { Route } from './+types/product-detail';
import productDetailStylesHref from './product-detail.css?url';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: navBarStylesHref },
  { rel: 'stylesheet', href: productDetailStylesHref },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Product Details | Online Shopping' },
    { name: 'description', content: 'View product details, variations, shipping and purchase options.' },
  ];
}

const fallbackImageLabel = 'Product image unavailable';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function parsePrice(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getProductImages(product: Product) {
  const candidates = [product.imageUrl, ...(product.imageUrls ?? []), ...(product.images ?? [])]
    .map((image) => image?.trim())
    .filter((image): image is string => Boolean(image));

  return Array.from(new Set(candidates));
}

function getPricingState(product: Product): ProductPricingState {
  return {
    basePrice: product.pricingState?.basePrice ?? parsePrice(product.basePrice),
    variationGroups: product.pricingState?.variationGroups ?? [],
    combinations: product.pricingState?.combinations ?? [],
  };
}


type AdminProductOptionsProps = {
  product: Product;
  onArchived: (isArchived: boolean) => void;
  onDeleted: () => void;
};

function AdminProductOptions({ product, onArchived, onDeleted }: AdminProductOptionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMenuOpen]);

  const handleArchive = async () => {
    const shouldArchive = product.isArchived !== true;
    setActionError(null);

    try {
      await updateDoc(doc(db, PRODUCTS_COLLECTION, product.productId), {
        isArchived: shouldArchive,
        archivedAt: shouldArchive ? serverTimestamp() : deleteField(),
        updatedAt: serverTimestamp(),
      });
      setIsMenuOpen(false);
      onArchived(shouldArchive);
    } catch (error) {
      console.error(`Product could not be ${shouldArchive ? 'archived' : 'restored'}.`, error);
      setActionError(`Ürün ${shouldArchive ? 'arşivlenemedi' : 'koleksiyonlara geri alınamadı'}. Admin yetkinizi kontrol edin.`);
    }
  };

  const handleDelete = async () => {
    const shouldDelete = window.confirm(`"${product.title}" ürününü kalıcı olarak silmek istediğinizden emin misiniz?`);

    if (!shouldDelete) {
      return;
    }

    setActionError(null);

    try {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, product.productId));
      setIsMenuOpen(false);
      onDeleted();
    } catch (error) {
      console.error('Product could not be deleted.', error);
      setActionError('Ürün silinemedi. Admin yetkinizi kontrol edin.');
    }
  };

  return (
    <div className="product-detail__admin-options" ref={menuRef}>
      <button
        type="button"
        className="product-detail__admin-options-button"
        aria-label={`${product.title} seçenekleri`}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {isMenuOpen ? (
        <div className="product-detail__admin-options-menu" role="menu" aria-label={`${product.title} seçenekleri`}>
          <Link className="product-detail__admin-options-item" to={`/add-product?productId=${encodeURIComponent(product.productId)}`} role="menuitem">
            Edit
          </Link>
          <button type="button" className="product-detail__admin-options-item" role="menuitem" onClick={handleDelete}>
            Delete
          </button>
          <button type="button" className="product-detail__admin-options-item" role="menuitem" onClick={handleArchive}>
            {product.isArchived ? 'Restore to Collections' : 'Archive'}
          </button>
        </div>
      ) : null}

      {actionError ? <p className="product-detail__admin-options-error">{actionError}</p> : null}
    </div>
  );
}

type PurchasePanelProps = {
  product: Product;
  selectedIds: string[];
  onSelectVariation: (groupIndex: number, optionId: string) => void;
};

function PurchasePanel({ product, selectedIds, onSelectVariation }: PurchasePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const pricingState = useMemo(() => getPricingState(product), [product]);
  const selectedCombination = useMemo(
    () => resolveCombination(selectedIds, pricingState.combinations),
    [pricingState.combinations, selectedIds],
  );
  const hasVariations = pricingState.variationGroups.length > 0;
  const hasCompleteSelection = hasVariations && selectedIds.filter(Boolean).length === pricingState.variationGroups.length;
  const activeCombination = hasCompleteSelection ? selectedCombination : null;
  const currentPrice = activeCombination?.price ?? pricingState.basePrice;
  const comparePrice = parsePrice(product.compareAtPrice ?? product.oldPrice);
  const hasComparePrice = comparePrice > currentPrice;
  const discountPercentage = hasComparePrice ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100) : 0;
  const stock = activeCombination?.stock;
  const isUnavailable = Boolean(activeCombination && !activeCombination.enabled);
  const optionSummary = pricingState.variationGroups
    .map((group, groupIndex) => {
      const selectedOption = group.options.find((option) => option.id === selectedIds[groupIndex]);
      return selectedOption ? `${group.name}: ${selectedOption.label}` : '';
    })
    .filter(Boolean)
    .join(' / ');

  const handleAddToCart = () => {
    addCartItem({
      id: `${product.productId}:${selectedIds.filter(Boolean).join('|') || 'default'}`,
      productId: product.productId,
      title: product.title,
      imageUrl: product.imageUrl,
      price: currentPrice,
      quantity,
      optionSummary: optionSummary || undefined,
    });
    setCartMessage('Ürün sepetinize eklendi.');
  };

  return (
    <aside className="product-detail__purchase-card" aria-label="Purchase options">
      {product.cartCount ? <p className="product-detail__urgency">In {product.cartCount} carts</p> : null}

      <h1 className="product-detail__title">{product.title}</h1>

      {hasVariations && (
        <div className="product-detail__variations" aria-label="Choose product options">
          {pricingState.variationGroups.map((group: VariationGroup, groupIndex: number) => (
            <label className="product-detail__select-label" key={group.id}>
              <span>{group.name}</span>
              <select value={selectedIds[groupIndex] ?? ''} onChange={(event) => onSelectVariation(groupIndex, event.target.value)}>
                <option value="">Select {group.name}</option>
                {group.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <p className="product-detail__stock-note">
            {activeCombination
              ? activeCombination.enabled
                ? `${stock ?? 0} available${activeCombination.sku ? ` · SKU ${activeCombination.sku}` : ''}`
                : 'This option combination is unavailable.'
              : 'Choose options to confirm availability.'}
          </p>
        </div>
      )}

      <label className="product-detail__quantity">
        <span>Quantity</span>
        <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <div className="product-detail__price-summary">
        <div className="product-detail__price-row" aria-live="polite">
          <span className="product-detail__price">{formatCurrency(currentPrice)}</span>
          {hasComparePrice ? <span className="product-detail__old-price">{formatCurrency(comparePrice)}</span> : null}
        </div>
        {(product.saleText || discountPercentage > 0) && (
          <p className="product-detail__sale-badge">{product.saleText ?? `${discountPercentage}% off today`}</p>
        )}
      </div>

      <div className="product-detail__actions">
        <button className="product-detail__button product-detail__button--primary" type="button" disabled={isUnavailable}>
          Buy it now
        </button>
        <button className="product-detail__button product-detail__button--secondary" type="button" disabled={isUnavailable} onClick={handleAddToCart}>
          Add to cart
        </button>
        <button className="product-detail__button product-detail__button--ghost" type="button">
          Add to collection
        </button>
      </div>

      {cartMessage ? <p className="product-detail__cart-message">{cartMessage}</p> : null}

    </aside>
  );
}

function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const selectedImage = images[selectedImageIndex];
  const hasMultipleImages = images.length > 1;
  const imageFailed = selectedImage ? failedImages.has(selectedImage) : true;

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [images.join('|')]);

  const showPreviousImage = () => {
    setSelectedImageIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const showNextImage = () => {
    setSelectedImageIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="product-detail__gallery" aria-label="Product images">
      <div className="product-detail__thumbs" role="list" aria-label="Product thumbnails">
        {images.map((image, index) => (
          <button
            aria-label={`Show image ${index + 1}`}
            aria-current={index === selectedImageIndex ? 'true' : undefined}
            className="product-detail__thumb"
            key={image}
            onClick={() => setSelectedImageIndex(index)}
            type="button"
          >
            {failedImages.has(image) ? (
              <span>{fallbackImageLabel}</span>
            ) : (
              <img src={image} alt={`${title} thumbnail ${index + 1}`} onError={() => setFailedImages((prev) => new Set(prev).add(image))} />
            )}
          </button>
        ))}
      </div>

      <div className="product-detail__main-image-wrap">
        {selectedImage && !imageFailed ? (
          <img
            className="product-detail__main-image"
            src={selectedImage}
            alt={title}
            onError={() => setFailedImages((prev) => new Set(prev).add(selectedImage))}
          />
        ) : (
          <div className="product-detail__image-fallback" role="img" aria-label={fallbackImageLabel}>
            {fallbackImageLabel}
          </div>
        )}

        {hasMultipleImages && (
          <div className="product-detail__image-controls" aria-label="Image controls">
            <button type="button" onClick={showPreviousImage} aria-label="Previous image">
              ‹
            </button>
            <button type="button" onClick={showNextImage} aria-label="Next image">
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductAccordions({ product }: { product: Product }) {
  return (
    <section className="product-detail__details" aria-label="Product details">
      <details open>
        <summary>Item details</summary>
        <p>{product.description || 'More details for this item will be added soon.'}</p>
      </details>
      <details>
        <summary>Shipping and returns</summary>
        <p>{product.shippingInfo ?? 'Shipping times and return options are confirmed at checkout.'}</p>
      </details>
      <details>
        <summary>Reviews</summary>
        <p>Customer reviews are not available for this product yet.</p>
      </details>
    </section>
  );
}

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadProduct() {
      if (!productId) {
        setErrorMessage('Product id is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextProduct = await fetchProductById(productId);

        if (isSubscribed) {
          setProduct(nextProduct);
          setSelectedIds([]);
          setErrorMessage(nextProduct ? null : 'We could not find that product.');
        }
      } catch (error) {
        if (isSubscribed) {
          setProduct(null);
          setErrorMessage(error instanceof Error ? error.message : 'Product details could not be loaded.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isSubscribed = false;
    };
  }, [productId]);

  const images = useMemo(() => (product ? getProductImages(product) : []), [product]);

  const updateSelection = (groupIndex: number, optionId: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[groupIndex] = optionId;
      return next;
    });
  };

  return (
    <>
      <NavBar />
      <main className="product-detail">
        <nav className="product-detail__breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/shop">Shop</Link>
          {product?.category ? (
            <>
              <span aria-hidden="true">/</span>
              <span>{product.category}</span>
            </>
          ) : null}
        </nav>

        <button className="product-detail__back" type="button" onClick={() => navigate(-1)}>
          ← Back to search results
        </button>

        {isLoading && <p className="product-detail__status">Loading product details...</p>}
        {errorMessage && !isLoading && <p className="product-detail__status product-detail__status--error">{errorMessage}</p>}

        {product && !isLoading && !errorMessage && (
          <>
            <section className="product-detail__layout">
              <ProductGallery images={images} title={product.title} />
              <div className="product-detail__purchase-column">
                {isAdmin ? (
                  <AdminProductOptions
                    product={product}
                    onArchived={(isArchived) => setProduct((currentProduct) => (currentProduct ? { ...currentProduct, isArchived } : currentProduct))}
                    onDeleted={() => navigate('/shop')}
                  />
                ) : null}
                <PurchasePanel product={product} selectedIds={selectedIds} onSelectVariation={updateSelection} />
              </div>
            </section>
            <ProductAccordions product={product} />
          </>
        )}
      </main>
    </>
  );
}
