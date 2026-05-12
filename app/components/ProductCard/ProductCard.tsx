import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteDoc, deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase.client';
import { PRODUCTS_COLLECTION, type Product } from '../../lib/products';
import style from './ProductCard.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: style }];
}

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

function getPreviewPrice(product: Product) {
  return product.pricingState?.basePrice ?? parsePrice(product.basePrice);
}

function getProductImages(product: Product) {
  const candidates = [product.imageUrl, ...(product.imageUrls ?? []), ...(product.images ?? [])]
    .map((image) => image?.trim())
    .filter((image): image is string => Boolean(image));

  return Array.from(new Set(candidates));
}

type ProductCardProps = {
  product: Product;
  onProductArchived?: (productId: string) => void;
  onProductDeleted?: (productId: string) => void;
};

export function ProductCard({ product, onProductArchived, onProductDeleted }: ProductCardProps) {
  const { isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const previewPrice = getPreviewPrice(product);
  const productImages = useMemo(() => getProductImages(product), [product]);
  const hasMultipleImages = productImages.length > 1;

  useEffect(() => {
    setActiveImageIndex(0);
    setIsImageHovered(false);
  }, [product.productId]);

  useEffect(() => {
    if (!isImageHovered || !hasMultipleImages) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveImageIndex((currentIndex) => (currentIndex + 1) % productImages.length);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [hasMultipleImages, isImageHovered, productImages.length]);

  const handleImageMouseEnter = () => {
    if (!hasMultipleImages) {
      return;
    }

    setIsImageHovered(true);
    setActiveImageIndex((currentIndex) => (currentIndex + 1) % productImages.length);
  };

  const handleImageMouseLeave = () => {
    setIsImageHovered(false);
    setActiveImageIndex(0);
  };

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
      onProductArchived?.(product.productId);
    } catch (error) {
      console.error(`Product could not be ${shouldArchive ? 'archived' : 'restored'}.`, error);
      setActionError(`Product could not be ${shouldArchive ? 'archived' : 'restored to Collections'}. Please check your admin access.`);
    }
  };

  const handleDelete = async () => {
    const shouldDelete = window.confirm(`Are you sure you want to permanently delete "${product.title}"?`);

    if (!shouldDelete) {
      return;
    }

    setActionError(null);

    try {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, product.productId));
      setIsMenuOpen(false);
      onProductDeleted?.(product.productId);
    } catch (error) {
      console.error('Product could not be deleted.', error);
      setActionError('Product could not be deleted. Please check your admin access.');
    }
  };

  return (
    <article className="product-card">
      <Link className="product-card__link" to={`/products/${product.productId}`} aria-label={`View details for ${product.title}`}>
        <div className="product-card__image-wrap" onMouseEnter={handleImageMouseEnter} onMouseLeave={handleImageMouseLeave}>
          {productImages.map((image, index) => (
            <img
              className={`product-card__image${index === activeImageIndex ? ' product-card__image--active' : ''}`}
              src={image}
              alt={index === 0 ? product.title : `${product.title} ${index + 1}`}
              loading={index === 0 ? 'lazy' : 'eager'}
              key={image}
            />
          ))}
        </div>
        <div className="product-card__content">
          <h2 className="product-card__title">{product.title}</h2>
          <p className="product-card__price">{formatCurrency(previewPrice)}</p>
        </div>
      </Link>

      {isAdmin ? (
        <div className="product-card__options" ref={menuRef}>
          <button
            type="button"
            className="product-card__options-button"
            aria-label={`${product.title} options`}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          {isMenuOpen ? (
            <div className="product-card__options-menu" role="menu" aria-label={`${product.title} options`}>
              <Link className="product-card__options-item" to={`/add-product?productId=${encodeURIComponent(product.productId)}`} role="menuitem">
                Edit
              </Link>
              <button type="button" className="product-card__options-item" role="menuitem" onClick={handleDelete}>
                Delete
              </button>
              <button type="button" className="product-card__options-item" role="menuitem" onClick={handleArchive}>
                {product.isArchived ? 'Restore to Collections' : 'Archive'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {actionError ? <p className="product-card__action-error">{actionError}</p> : null}
    </article>
  );
}
