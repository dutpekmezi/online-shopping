import { generateCombinations } from './utils';
import type { ProductPricingState } from './types';

export const tableSeedPricingState: ProductPricingState = {
  basePrice: 7900,
  variationGroups: [
    {
      id: 'size',
      name: 'Size',
      options: [
        { id: 'size_100x60', label: '100x60', skuFragment: '100x60' },
        { id: 'size_120x70', label: '120x70', skuFragment: '120x70' },
        { id: 'size_140x80', label: '140x80', skuFragment: '140x80' },
      ],
    },
    {
      id: 'legmat',
      name: 'LegMaterial',
      options: [
        { id: 'legmat_wood_walnut', label: 'Wood + Walnut', skuFragment: 'WW' },
        { id: 'legmat_wood_oak', label: 'Wood + Oak', skuFragment: 'WO' },
        { id: 'legmat_metal_walnut', label: 'Metal + Walnut', skuFragment: 'MW' },
        { id: 'legmat_metal_oak', label: 'Metal + Oak', skuFragment: 'MO' },
      ],
    },
  ],
  combinations: [],
};

tableSeedPricingState.combinations = generateCombinations(tableSeedPricingState.variationGroups).map((combination, index) => ({
  ...combination,
  price: 8100 + index * 200,
  stock: 15,
  sku: `TABLE-${combination.sku || combination.key}`,
  enabled: true,
}));
