import type {
  PricingValidationError,
  ProductCombination,
  ProductPricingState,
  VariationGroup,
  VariationOption,
} from './types';

const MAX_PRICING_GROUPS = 2;

function assertValidGroupCount(groups: VariationGroup[]) {
  if (groups.length > MAX_PRICING_GROUPS) {
    throw new Error(`Only ${MAX_PRICING_GROUPS} variation groups are supported for pricing.`);
  }
}

function optionMap(groups: VariationGroup[]) {
  const map = new Map<string, VariationOption>();

  for (const group of groups) {
    for (const option of group.options) {
      if (map.has(option.id)) {
        throw new Error(`Duplicate option id detected: ${option.id}`);
      }

      map.set(option.id, option);
    }
  }

  return map;
}

function defaultSkuFromOptionIds(optionIds: string[], optionsById: Map<string, VariationOption>) {
  return optionIds
    .map((id) => optionsById.get(id)?.skuFragment?.trim())
    .filter((value): value is string => Boolean(value))
    .join('-');
}

export function generateCombinationKey(optionIds: string[]): string {
  return optionIds.map((id) => id.trim()).filter(Boolean).join('__');
}

export function mergeCombinations(
  oldCombinations: ProductCombination[],
  newCombinations: ProductCombination[],
): ProductCombination[] {
  const existingByKey = new Map(oldCombinations.map((combination) => [combination.key, combination]));

  return newCombinations.map((combination) => {
    const existing = existingByKey.get(combination.key);

    if (!existing) {
      return combination;
    }

    return {
      ...combination,
      price: existing.price,
      stock: existing.stock,
      sku: existing.sku,
      enabled: existing.enabled,
    };
  });
}

export function generateCombinations(
  groups: VariationGroup[],
  existing: ProductCombination[] = [],
): ProductCombination[] {
  assertValidGroupCount(groups);

  if (groups.length === 0) {
    return [];
  }

  const optionsById = optionMap(groups);
  const groupA = groups[0]?.options ?? [];
  const groupB = groups[1]?.options ?? [];

  const generated: ProductCombination[] = [];

  if (groups.length === 1) {
    for (const optionA of groupA) {
      const optionIds = [optionA.id];
      generated.push({
        key: generateCombinationKey(optionIds),
        optionIds,
        price: 0,
        stock: optionA.stock ?? 0,
        sku: defaultSkuFromOptionIds(optionIds, optionsById),
        enabled: true,
      });
    }
  } else {
    for (const optionA of groupA) {
      for (const optionB of groupB) {
        const optionIds = [optionA.id, optionB.id];
        generated.push({
          key: generateCombinationKey(optionIds),
          optionIds,
          price: 0,
          stock: optionA.stock ?? optionB.stock ?? 0,
          sku: defaultSkuFromOptionIds(optionIds, optionsById),
          enabled: true,
        });
      }
    }
  }

  const uniqueByKey = new Map<string, ProductCombination>();
  for (const combination of generated) {
    if (uniqueByKey.has(combination.key)) {
      throw new Error(`Duplicate combination key detected: ${combination.key}`);
    }

    uniqueByKey.set(combination.key, combination);
  }

  const merged = mergeCombinations(existing, Array.from(uniqueByKey.values()));
  const mergedKeySet = new Set<string>();
  for (const combination of merged) {
    if (mergedKeySet.has(combination.key)) {
      throw new Error(`Duplicate merged combination key detected: ${combination.key}`);
    }

    mergedKeySet.add(combination.key);
  }

  return merged;
}

export function resolveCombination(
  selectedOptionIds: string[],
  combinations: ProductCombination[],
): ProductCombination | null {
  if (selectedOptionIds.length === 0) {
    return null;
  }

  const key = generateCombinationKey(selectedOptionIds);
  return combinations.find((combination) => combination.key === key) ?? null;
}

export function validatePricingState(state: ProductPricingState): PricingValidationError[] {
  const errors: PricingValidationError[] = [];

  if (state.variationGroups.length > MAX_PRICING_GROUPS) {
    errors.push({ field: 'variationGroups', message: 'At most 2 variation groups are allowed.' });
  }

  const optionIdSet = new Set<string>();
  for (const group of state.variationGroups) {
    for (const option of group.options) {
      if (!option.id.trim()) {
        errors.push({ field: 'variationGroups.options.id', message: 'Option id is required.' });
      }

      if (optionIdSet.has(option.id)) {
        errors.push({ field: 'variationGroups.options.id', message: `Duplicate option id: ${option.id}` });
      }

      optionIdSet.add(option.id);
    }
  }

  const combinationKeySet = new Set<string>();
  for (const combination of state.combinations) {
    if (combinationKeySet.has(combination.key)) {
      errors.push({ field: 'combinations.key', message: `Duplicate combination key: ${combination.key}` });
    }

    combinationKeySet.add(combination.key);

    if (combination.enabled && combination.price <= 0) {
      errors.push({
        field: 'combinations.price',
        message: `Enabled combination ${combination.key} must have a price greater than 0.`,
      });
    }
  }

  if (state.variationGroups.length > 0) {
    const expectedKeys = new Set(generateCombinations(state.variationGroups).map((combination) => combination.key));

    for (const combination of state.combinations) {
      if (combination.enabled && !expectedKeys.has(combination.key)) {
        errors.push({
          field: 'combinations.key',
          message: `Enabled combination ${combination.key} is not part of generated matrix.`,
        });
      }
    }
  }

  return errors;
}
