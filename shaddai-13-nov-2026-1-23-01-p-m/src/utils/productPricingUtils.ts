import { Material, Product, ProductMaterialUsage, PromoType, VariantOptionItem } from '../types';

export interface EffectivePricing {
  basePrice: number;
  finalPrice: number;
  hasPromo: boolean;
  discountBadge: string | null;
}

export interface ProductDisplayPricing extends EffectivePricing {
  hasRange: boolean;
  maxFinalPrice: number;
}

/**
 * Computes effective basePrice, finalPrice, promo status, and a crisp short discount badge
 * for a single variant option (taking into account option-level promos or inherited product promos).
 */
export function getOptionEffectivePricing(
  opt: VariantOptionItem | string,
  product: Product
): EffectivePricing {
  if (typeof opt === 'string') {
    const prodHasPromo = Boolean(product.promoActive && product.basePrice > product.finalPrice);
    return {
      basePrice: product.basePrice,
      finalPrice: product.finalPrice,
      hasPromo: prodHasPromo,
      discountBadge: prodHasPromo ? formatProductPromoBadge(product) : null,
    };
  }

  const hasCustomPrice = Boolean((opt.price && opt.price > 0) || (opt.finalPrice && opt.finalPrice > 0));
  if (!hasCustomPrice) {
    const prodHasPromo = Boolean(product.promoActive && product.basePrice > product.finalPrice);
    return {
      basePrice: product.basePrice,
      finalPrice: product.finalPrice,
      hasPromo: prodHasPromo,
      discountBadge: prodHasPromo ? formatProductPromoBadge(product) : null,
    };
  }

  const base = opt.price && opt.price > 0 ? opt.price : (opt.finalPrice || product.basePrice);
  let final = opt.finalPrice && opt.finalPrice > 0 ? opt.finalPrice : base;
  let badge: string | null = null;

  if (opt.promoDiscountPercent && opt.promoDiscountPercent > 0) {
    if (!opt.finalPrice || opt.finalPrice >= base) {
      final = Math.round(base * (1 - opt.promoDiscountPercent / 100));
    }
    badge = `${opt.promoDiscountPercent}% OFF`;
  } else if (opt.promoDiscountFixed && opt.promoDiscountFixed > 0) {
    if (!opt.finalPrice || opt.finalPrice >= base) {
      final = Math.max(0, base - opt.promoDiscountFixed);
    }
    badge = `-$${opt.promoDiscountFixed.toLocaleString('es-AR')}`;
  } else if (product.promoActive) {
    if (product.promoType === 'fixed' && product.promoDiscountFixed && product.promoDiscountFixed > 0) {
      if (!opt.finalPrice || opt.finalPrice === base) {
        final = Math.max(0, base - product.promoDiscountFixed);
      }
      badge = product.promoLabel?.trim() || `-$${product.promoDiscountFixed.toLocaleString('es-AR')}`;
    } else if (product.promoDiscountPercent && product.promoDiscountPercent > 0) {
      if (!opt.finalPrice || opt.finalPrice === base) {
        final = Math.round(base * (1 - product.promoDiscountPercent / 100));
      }
      badge = product.promoLabel?.trim() || `${product.promoDiscountPercent}% OFF`;
    }
  }

  if (final < base && !badge) {
    const pct = Math.round(((base - final) / base) * 100);
    badge = pct > 0 ? `${pct}% OFF` : null;
  }

  const hasPromo = final < base && Boolean(badge);
  return {
    basePrice: base,
    finalPrice: final,
    hasPromo,
    discountBadge: hasPromo ? badge : null,
  };
}

export function formatProductPromoBadge(product: Product): string | null {
  if (!product.promoActive) return null;
  if (product.promoLabel && product.promoLabel.trim()) {
    return product.promoLabel.trim();
  }
  if (product.promoType === 'fixed' && product.promoDiscountFixed && product.promoDiscountFixed > 0) {
    return `-$${product.promoDiscountFixed.toLocaleString('es-AR')}`;
  }
  if (product.promoDiscountPercent && product.promoDiscountPercent > 0) {
    return `${product.promoDiscountPercent}% OFF`;
  }
  return 'OFERTA';
}

/**
 * Finds the lowest effective price among a product's variants (if any variant has priced options),
 * or falls back to the product's own price. Used on catalog cards, sorting, and initial modal display.
 */
export function getLowestProductPricing(product: Product): ProductDisplayPricing {
  const prodHasPromo = Boolean(product.promoActive && product.basePrice > product.finalPrice);
  const baseResult: ProductDisplayPricing = {
    basePrice: product.basePrice,
    finalPrice: product.finalPrice,
    hasPromo: prodHasPromo,
    discountBadge: prodHasPromo ? formatProductPromoBadge(product) : null,
    hasRange: false,
    maxFinalPrice: product.finalPrice,
  };

  if (!product.variants || product.variants.length === 0) {
    return baseResult;
  }

  const candidatePricings: EffectivePricing[] = [];

  for (const variant of product.variants) {
    const hasAnyPricedOption = variant.options.some(
      (o) => typeof o !== 'string' && Boolean((o.price && o.price > 0) || (o.finalPrice && o.finalPrice > 0))
    );
    if (!hasAnyPricedOption) continue;

    for (const opt of variant.options) {
      const eff = getOptionEffectivePricing(opt, product);
      if (eff.finalPrice > 0) {
        candidatePricings.push(eff);
      }
    }
  }

  if (candidatePricings.length === 0) {
    return baseResult;
  }

  let minEntry = candidatePricings[0];
  let maxFinal = candidatePricings[0].finalPrice;

  for (const entry of candidatePricings) {
    if (entry.finalPrice < minEntry.finalPrice) {
      minEntry = entry;
    }
    if (entry.finalPrice > maxFinal) {
      maxFinal = entry.finalPrice;
    }
  }

  return {
    ...minEntry,
    hasRange: maxFinal > minEntry.finalPrice,
    maxFinalPrice: maxFinal,
  };
}

/**
 * Returns variant options sorted ascending by effective final price so the lowest-priced
 * option always appears first visually.
 */
export function sortVariantOptionsByPrice(
  options: (VariantOptionItem | string)[],
  product: Product
): (VariantOptionItem | string)[] {
  return [...options].sort((a, b) => {
    const priceA = getOptionEffectivePricing(a, product).finalPrice;
    const priceB = getOptionEffectivePricing(b, product).finalPrice;
    return priceA - priceB;
  });
}

/**
 * Computes the live pre-subtraction base price of a variant option that has saved materialsUsed.
 */
export function computeOptionRawPriceBeforeSub(
  opt: VariantOptionItem,
  materialsMap: Map<string, Material>,
  hourlyRate: number,
  overheadPerHour: number,
  fallbackLaborMinutes: number,
  fallbackProfitMargin: number
): number {
  if (!opt.materialsUsed || opt.materialsUsed.length === 0) {
    return opt.rawPrice && opt.rawPrice > 0
      ? opt.rawPrice
      : (opt.price || 0) + (opt.subtractionAmount || 0);
  }
  const matsCost = opt.materialsUsed.reduce((sum, u) => {
    const liveMat = materialsMap.get(u.materialId);
    const unitCost = liveMat ? liveMat.unitCost : u.unitCost;
    return sum + (u.quantity || 0) * (unitCost || 0);
  }, 0);
  const optMinutes = opt.laborMinutes !== undefined ? opt.laborMinutes : fallbackLaborMinutes;
  const optLaborHours = optMinutes / 60;
  const optLaborCost = optLaborHours * hourlyRate;
  const optInvisibleCost = Math.round(optLaborHours * overheadPerHour);
  const optTotalCost = matsCost + optLaborCost + optInvisibleCost;
  const optMargin = opt.profitMarginPercent !== undefined ? opt.profitMarginPercent : fallbackProfitMargin;
  return Math.round(optTotalCost * (1 + optMargin / 100));
}

/**
 * Refreshes a variant option's saved material usages against live materials and recalculates
 * its price and finalPrice using the product/workshop cost settings and ONLY this option's own subtractionAmount.
 */
export function syncVariantOptionWithMaterials(
  opt: VariantOptionItem,
  materialsMap: Map<string, Material>,
  hourlyRate: number,
  overheadPerHour: number,
  fallbackLaborMinutes: number,
  fallbackProfitMargin: number,
  roundToCleanNumbers: boolean,
  productPromo?: {
    promoActive?: boolean;
    promoType?: PromoType;
    promoDiscountPercent?: number;
    promoDiscountFixed?: number;
  }
): VariantOptionItem {
  if (!opt.materialsUsed || opt.materialsUsed.length === 0) {
    return opt;
  }

  const updatedMats: ProductMaterialUsage[] = opt.materialsUsed.map((u) => {
    const liveMat = materialsMap.get(u.materialId);
    return {
      ...u,
      unitCost: liveMat ? liveMat.unitCost : u.unitCost,
      materialName: liveMat ? liveMat.name : u.materialName,
    };
  });

  const matsCost = updatedMats.reduce((sum, m) => sum + (m.quantity || 0) * (m.unitCost || 0), 0);
  const optMinutes = opt.laborMinutes !== undefined ? opt.laborMinutes : fallbackLaborMinutes;
  const optLaborHours = optMinutes / 60;
  const optLaborCost = optLaborHours * hourlyRate;
  const optInvisibleCost = Math.round(optLaborHours * overheadPerHour);
  const optTotalCost = matsCost + optLaborCost + optInvisibleCost;
  const optMargin = opt.profitMarginPercent !== undefined ? opt.profitMarginPercent : fallbackProfitMargin;

  let optPrice = Math.round(optTotalCost * (1 + optMargin / 100));
  if (opt.subtractionAmount && opt.subtractionAmount > 0) {
    optPrice = Math.max(0, optPrice - opt.subtractionAmount);
  }
  if (roundToCleanNumbers) {
    optPrice = Math.round(optPrice / 10) * 10;
  }

  let optFinalPrice = optPrice;
  if (optPrice > 0) {
    if (opt.promoDiscountPercent && opt.promoDiscountPercent > 0) {
      optFinalPrice = Math.round(optPrice * (1 - opt.promoDiscountPercent / 100));
    } else if (opt.promoDiscountFixed && opt.promoDiscountFixed > 0) {
      optFinalPrice = Math.max(0, optPrice - opt.promoDiscountFixed);
    } else if (productPromo?.promoActive) {
      if (productPromo.promoType === 'fixed' && productPromo.promoDiscountFixed) {
        optFinalPrice = Math.max(0, optPrice - productPromo.promoDiscountFixed);
      } else if (productPromo.promoDiscountPercent && productPromo.promoDiscountPercent > 0) {
        optFinalPrice = Math.round(optPrice * (1 - productPromo.promoDiscountPercent / 100));
      }
    }
    if (roundToCleanNumbers && optFinalPrice > 0) {
      optFinalPrice = Math.round(optFinalPrice / 10) * 10;
    }
  }

  return {
    ...opt,
    materialsUsed: updatedMats,
    price: optPrice,
    finalPrice: optFinalPrice,
  };
}
