import { useMemo, useState } from 'react';
import type { ProductCombination, VariationGroup } from '../../lib/pricing/types';
import { resolveCombination } from '../../lib/pricing/utils';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

type Props = {
  basePrice: number;
  groups: VariationGroup[];
  combinations: ProductCombination[];
};

export function StorefrontVariationSelector({ basePrice, groups, combinations }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedCombination = useMemo(() => resolveCombination(selectedIds, combinations), [selectedIds, combinations]);
  const hasCompleteSelection = groups.length > 0 && selectedIds.length === groups.length;

  const activeCombination = hasCompleteSelection ? selectedCombination : null;
  const resolvedPrice = activeCombination?.price ?? basePrice;
  const resolvedStock = activeCombination?.stock;

  const updateSelection = (groupIndex: number, optionId: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[groupIndex] = optionId;
      return next;
    });
  };

  return (
    <section className="storefront-selector">
      <h3>Storefront Preview</h3>

      {groups.map((group, groupIndex) => (
        <label key={group.id}>
          {group.name}
          <select value={selectedIds[groupIndex] ?? ''} onChange={(event) => updateSelection(groupIndex, event.target.value)}>
            <option value="">Select {group.name}</option>
            {group.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <div className="storefront-selector__summary">
        <p>
          <strong>Resolved Price:</strong> {formatCurrency(resolvedPrice)}
        </p>
        <p>
          <strong>Stock:</strong>{' '}
          {activeCombination ? (activeCombination.enabled ? String(resolvedStock ?? 0) : 'Unavailable') : 'Choose options'}
        </p>
        <p>
          <strong>SKU:</strong> {activeCombination?.sku || 'N/A'}
        </p>
        <p>
          <strong>Status:</strong>{' '}
          {activeCombination ? (activeCombination.enabled ? 'Purchasable' : 'Disabled combination') : 'Waiting selection'}
        </p>
      </div>
    </section>
  );
}
