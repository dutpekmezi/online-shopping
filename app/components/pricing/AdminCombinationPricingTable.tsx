import type { ProductCombination, VariationGroup } from '../../lib/pricing/types';

type Props = {
  groups: VariationGroup[];
  combinations: ProductCombination[];
  onUpdateCombination: (key: string, patch: Partial<Pick<ProductCombination, 'price' | 'stock' | 'sku' | 'enabled'>>) => void;
};

function getOptionLabel(groups: VariationGroup[], optionId: string) {
  for (const group of groups) {
    const option = group.options.find((item) => item.id === optionId);
    if (option) {
      return option.label;
    }
  }

  return optionId;
}

export function AdminCombinationPricingTable({ groups, combinations, onUpdateCombination }: Props) {
  const group1Name = groups[0]?.name ?? 'Variation 1';
  const group2Name = groups[1]?.name ?? 'Variation 2';

  if (groups.length === 0) {
    return <p className="hint">No variation group defined. Base price will be used.</p>;
  }

  return (
    <div className="combination-table-wrapper">
      <table className="combination-table">
        <thead>
          <tr>
            <th>{group1Name}</th>
            {groups.length > 1 && <th>{group2Name}</th>}
            <th>Price</th>
            <th>Stock</th>
            <th>SKU</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {combinations.map((combination) => (
            <tr key={combination.key}>
              <td>{getOptionLabel(groups, combination.optionIds[0] ?? '')}</td>
              {groups.length > 1 && <td>{getOptionLabel(groups, combination.optionIds[1] ?? '')}</td>}
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={combination.price}
                  onChange={(event) => onUpdateCombination(combination.key, { price: Number(event.target.value) || 0 })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={combination.stock}
                  onChange={(event) => onUpdateCombination(combination.key, { stock: Number(event.target.value) || 0 })}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={combination.sku}
                  onChange={(event) => onUpdateCombination(combination.key, { sku: event.target.value })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={combination.enabled}
                  onChange={(event) => onUpdateCombination(combination.key, { enabled: event.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
