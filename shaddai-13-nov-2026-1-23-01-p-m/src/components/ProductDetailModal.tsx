import React, { useState } from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/exportUtils';
import {
  getLowestProductPricing,
  getOptionEffectivePricing,
  ProductDisplayPricing,
  sortVariantOptionsByPrice,
} from '../utils/productPricingUtils';
import { openWhatsAppDirect } from '../utils/whatsappUtils';
import { ImageLightboxModal } from './ImageLightboxModal';
import { X, ShoppingBag, Send, ChevronLeft, ChevronRight, Check, AlertOctagon, Maximize2 } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart, data } = useApp();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Selected variants state - allows optional / deselecting
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Calculate dynamic price & promo based on chosen variant options, defaulting to lowest variant price
  const activePricing: ProductDisplayPricing = React.useMemo(() => {
    if (!product) {
      return { basePrice: 0, finalPrice: 0, hasPromo: false, discountBadge: null, hasRange: false, maxFinalPrice: 0 };
    }

    let chosenOptionPricing: ProductDisplayPricing | null = null;

    if (product.variants) {
      product.variants.forEach((v) => {
        const chosen = selectedVariants[v.name];
        if (chosen) {
          const opt = v.options.find((o) => (typeof o === 'string' ? o === chosen : o.name === chosen));
          if (opt && typeof opt !== 'string' && ((opt.price && opt.price > 0) || (opt.finalPrice && opt.finalPrice > 0))) {
            const eff = getOptionEffectivePricing(opt, product);
            chosenOptionPricing = {
              ...eff,
              hasRange: false,
              maxFinalPrice: eff.finalPrice,
            };
          }
        }
      });
    }

    return chosenOptionPricing || getLowestProductPricing(product);
  }, [product, selectedVariants]);

  const activeUnitPrice = activePricing.finalPrice;

  if (!product) return null;

  const isOutOfStock = product.type === 'stock' && product.stockQuantity <= 0;
  const isStockLimited = product.type === 'stock';

  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'];

  const handleVariantToggle = (variantName: string, optionValue: string) => {
    setSelectedVariants((prev) => {
      const next = { ...prev };
      if (next[variantName] === optionValue) {
        // Deselect if already selected (leave blank)
        delete next[variantName];
      } else {
        // Select new option
        next[variantName] = optionValue;
      }
      return next;
    });
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedVariants, activeUnitPrice);
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
    }, 1500);
  };

  const handleDirectWhatsApp = () => {
    const waNumber = data.catalogSettings.businessWhatsApp.replace(/\D/g, '') || '5491123456789';
    let variantsText = '';
    if (Object.keys(selectedVariants).length > 0) {
      variantsText = ` (Variantes: ${Object.entries(selectedVariants)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')})`;
    }
    const text = `¡Hola Shaddai Papelería! 💕 Me interesa el producto *"${product.name}"*${variantsText} (Precio unitario: ${formatCurrency(activeUnitPrice)}). ¿Tienen disponibilidad o cuánto demora la confección? ¡Muchas gracias!`;
    openWhatsAppDirect(waNumber, text);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-pink-100 overflow-hidden max-h-[92vh] flex flex-col md:flex-row">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2 bg-white/90 hover:bg-white text-stone-500 hover:text-stone-800 rounded-full shadow-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image Gallery Column (1 to 10 images) */}
          <div className="w-full md:w-1/2 bg-stone-50 relative flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-pink-100">
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden bg-stone-100/70 flex items-center justify-center cursor-zoom-in group"
              title="Toca para ver la imagen completa en pantalla grande"
            >
              <img
                src={images[currentImageIndex]}
                alt={product.name}
                className="w-full h-full object-contain p-2 sm:p-3 transition-all duration-300 group-hover:scale-102"
              />

              <div className="absolute bottom-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-opacity cursor-pointer">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Ver completa</span>
              </div>

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none">
                {isOutOfStock ? (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs uppercase tracking-wider bg-red-600 text-white flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" />
                    Agotado / Sin Stock
                  </span>
                ) : (
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs uppercase tracking-wider ${
                      product.type === 'stock'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {product.type === 'stock'
                      ? `En Stock (${product.stockQuantity})`
                      : 'Por Pedido Artesanal'}
                  </span>
                )}
              </div>

              {/* Prev/Next buttons */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-stone-700 shadow-md transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-stone-700 shadow-md transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto bg-stone-50 border-t border-stone-200">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    currentImageIndex === idx
                      ? 'border-pink-500 shadow-xs scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Column */}
        <div className="w-full md:w-1/2 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-xs uppercase font-bold text-pink-600 tracking-wider">
                {product.category}
              </span>
              <h2 className="font-serif-brand text-xl sm:text-2xl font-bold text-stone-800 mt-1">
                {product.name}
              </h2>
            </div>

            {/* Price display with superscript discount badge */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pb-2.5 border-b border-pink-50">
              {activePricing.hasRange && (
                <span className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  Desde
                </span>
              )}
              <div className="inline-flex items-start">
                <span className="text-2xl sm:text-3xl font-extrabold text-pink-700 font-serif-brand leading-none">
                  {formatCurrency(activeUnitPrice)}
                </span>
                {activePricing.hasPromo && activePricing.discountBadge && (
                  <sup className="ml-1.5 -mt-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black leading-none tracking-tight shadow-2xs whitespace-nowrap">
                    {activePricing.discountBadge}
                  </sup>
                )}
              </div>
              {activePricing.hasPromo && activePricing.basePrice > activeUnitPrice && (
                <span className="text-sm text-stone-400 line-through leading-none">
                  {formatCurrency(activePricing.basePrice)}
                </span>
              )}
            </div>

            {/* Product Variants Selector with Individual Pricing */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-3.5 pt-1">
                {product.variants.map((v, vIdx) => {
                  const currentSelected = selectedVariants[v.name];
                  return (
                    <div key={`${v.name}-${vIdx}`} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-700">
                          {v.name}:
                          {currentSelected && (
                            <>
                              {' '}
                              <span className="text-pink-600 font-semibold">
                                {currentSelected}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full">
                        {sortVariantOptionsByPrice(v.options, product).map((opt, optIdx) => {
                          const optName = typeof opt === 'string' ? opt : opt.name;
                          const hasOwnPrice = typeof opt !== 'string' && Boolean((opt.price && opt.price > 0) || (opt.finalPrice && opt.finalPrice > 0));
                          const optPricing = getOptionEffectivePricing(opt, product);
                          const isSelected = currentSelected === optName;

                          return (
                            <button
                              key={`${optName}-${optIdx}`}
                              type="button"
                              onClick={() => handleVariantToggle(v.name, optName)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer max-w-full text-left ${
                                isSelected
                                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-600 shadow-xs'
                                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-pink-300 hover:bg-pink-50/50'
                              }`}
                            >
                              <span className="truncate">{optName}</span>
                              {hasOwnPrice && optPricing.finalPrice > 0 && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap inline-flex items-start gap-1 ${
                                    isSelected ? 'bg-pink-800 text-white' : 'bg-pink-100 text-pink-700'
                                  }`}
                                >
                                  <span>{formatCurrency(optPricing.finalPrice)}</span>
                                  {optPricing.hasPromo && optPricing.discountBadge && (
                                    <sup className={`text-[8px] font-black leading-none px-1 py-0.5 rounded ${
                                      isSelected ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
                                    }`}>
                                      {optPricing.discountBadge}
                                    </sup>
                                  )}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Description */}
            <div className="text-stone-600 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
              {product.description}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs font-semibold text-stone-600">Cantidad:</span>
                <div className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-2 py-1 bg-stone-50">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-pink-600 hover:bg-stone-200/60 rounded-lg font-bold text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={isStockLimited ? product.stockQuantity : 9999}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1) {
                        setQuantity(isStockLimited ? Math.min(product.stockQuantity, val) : val);
                      } else if (e.target.value === '') {
                        setQuantity(1);
                      }
                    }}
                    className="w-12 text-center font-bold text-xs text-stone-900 bg-white border border-stone-200 rounded-lg py-1 focus:outline-hidden focus:border-pink-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => (isStockLimited ? Math.min(product.stockQuantity, q + 1) : q + 1))
                    }
                    className="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-pink-600 hover:bg-stone-200/60 rounded-lg font-bold text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Sticky at bottom with mobile safe area */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-pink-100 space-y-2 mt-4 shrink-0 z-10">
            {isOutOfStock ? (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-center text-xs font-bold">
                Este producto se encuentra actualmente agotado / sin stock.
              </div>
            ) : (
              <>
                <button
                  onClick={handleAddToCart}
                  className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl font-bold shadow-md shadow-pink-200 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm cursor-pointer"
                >
                  {addedToast ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>¡Agregado al Carrito!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Agregar al Carrito</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDirectWhatsApp}
                  className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors text-xs sm:text-sm cursor-pointer"
                >
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>Consultar o Pedir por WhatsApp</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

      {isLightboxOpen && (
        <ImageLightboxModal
          images={images}
          initialIndex={currentImageIndex}
          productName={product.name}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
};
