export type VariationOption = {
  id: string;
  label: string;
  skuFragment?: string;
  stock?: number;
};

export type VariationGroup = {
  id: string;
  name: string;
  options: VariationOption[];
};

export type ProductCombination = {
  key: string;
  optionIds: string[];
  price: number;
  stock: number;
  sku: string;
  enabled: boolean;
};

export type ProductPricingState = {
  basePrice: number;
  variationGroups: VariationGroup[];
  combinations: ProductCombination[];
};

export type PricingValidationError = {
  field: string;
  message: string;
};
