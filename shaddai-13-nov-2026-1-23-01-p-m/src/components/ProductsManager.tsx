import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductMaterialUsage, ProductType, ProductVariant, PromoType, VariantOptionItem } from '../types';
import { formatCurrency } from '../utils/exportUtils';
import { computeOptionRawPriceBeforeSub, getLowestProductPricing, syncVariantOptionWithMaterials } from '../utils/productPricingUtils';
import { compressImage } from '../utils/imageCompressor';
import {
  Plus,
  Edit2,
  Copy,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Calculator,
  Search,
  Check,
  X,
  Upload,
  Layers,
  Clock,
  Coins,
  ArrowRight,
  ArrowLeft,
  Star,
  FolderTree,
  Eye,
  Crop,
  ZoomIn,
  Cloud,
  RefreshCw,
} from 'lucide-react';

export const ProductsManager: React.FC = () => {
  const {
    data,
    addProduct,
    updateProduct,
    duplicateProduct,
    deleteProduct,
    addProductCategory,
    renameProductCategory,
    deleteProductCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
    removeVariantSuggestion,
    addVariantSuggestion,
    setCurrentTab,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<'recientes' | 'az' | 'za' | 'precio_asc' | 'precio_desc' | 'categoria'>('recientes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Category management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatOldName, setEditingCatOldName] = useState<string | null>(null);
  const [editingCatNewName, setEditingCatNewName] = useState('');
  const [selectedCatForSub, setSelectedCatForSub] = useState<string | null>(null);
  const [newSubInput, setNewSubInput] = useState('');
  const [editingSubOldName, setEditingSubOldName] = useState<string | null>(null);
  const [editingSubNewName, setEditingSubNewName] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [type, setType] = useState<ProductType>('stock');
  const [stockQuantity, setStockQuantity] = useState(10);
  const [visibleInCatalog, setVisibleInCatalog] = useState(true);

  // Variants builder with individual pricing & cloud-stored material history
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [newVariantName, setNewVariantName] = useState('');
  const [variantOptionsList, setVariantOptionsList] = useState<VariantOptionItem[]>([]);
  const [optionNameInput, setOptionNameInput] = useState('');
  const [optionPriceInput, setOptionPriceInput] = useState('');
  const [optionSubtractionInput, setOptionSubtractionInput] = useState('');
  const [optionPromoPctInput, setOptionPromoPctInput] = useState('');
  const [optionPromoFixedInput, setOptionPromoFixedInput] = useState('');
  const [saveOptionMaterialsToCloud, setSaveOptionMaterialsToCloud] = useState(true);
  const [editingOptionCloudFeedback, setEditingOptionCloudFeedback] = useState<string | null>(null);
  const [newSuggestionInput, setNewSuggestionInput] = useState('');
  const calculatorSectionRef = React.useRef<HTMLDivElement>(null);

  // 3:4 Image Cropper State
  const [croppingImageIndex, setCroppingImageIndex] = useState<number | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPanX, setCropPanX] = useState(0); // -50% to 50%
  const [cropPanY, setCropPanY] = useState(0); // -50% to 50%

  // Cost calculator fields (Labor in MINUTES)
  const [materialsUsed, setMaterialsUsed] = useState<ProductMaterialUsage[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialAddMode, setMaterialAddMode] = useState<'cantidad' | 'porcentaje' | 'partes'>('cantidad');
  const [materialQtyInput, setMaterialQtyInput] = useState('1');
  const [materialPctInput, setMaterialPctInput] = useState('50'); // 50% de la unidad
  const [materialPartsInput, setMaterialPartsInput] = useState('10'); // Rendimiento: 1 unidad rinde X productos
  const [editingMaterialUsageId, setEditingMaterialUsageId] = useState<string | null>(null);
  const [editMatId, setEditMatId] = useState('');
  const [editMatMode, setEditMatMode] = useState<'cantidad' | 'porcentaje' | 'partes'>('cantidad');
  const [editMatValue, setEditMatValue] = useState('');

  const [laborMinutes, setLaborMinutes] = useState(45); // Minutes
  const [hourlyRate, setHourlyRate] = useState(data.costSettings.calculatedHourlyRate || 3400);
  const [profitMarginPercent, setProfitMarginPercent] = useState(data.costSettings.defaultProfitMargin || 45);
  const [subtractionAmount, setSubtractionAmount] = useState(0); // Resta manual para números redondos
  const [roundToCleanNumbers, setRoundToCleanNumbers] = useState(true);

  // Promotions: percentage or fixed pesos ($)
  const [promoActive, setPromoActive] = useState(false);
  const [promoType, setPromoType] = useState<PromoType>('percentage');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(10);
  const [promoDiscountFixed, setPromoDiscountFixed] = useState(500);
  const [promoLabel, setPromoLabel] = useState('10% OFF');

  // Materials alphabetically sorted
  const sortedMaterials = useMemo(() => {
    return [...data.materials].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [data.materials]);

  // Filtered materials for recipe selector with search box
  const filteredMaterialsForSelect = useMemo(() => {
    if (!materialSearchQuery.trim()) return sortedMaterials;
    const q = materialSearchQuery.toLowerCase().trim();
    return sortedMaterials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q))
    );
  }, [sortedMaterials, materialSearchQuery]);

  // Current category subcategories list
  const availableSubcategories = useMemo(() => {
    const found = (data.categories || []).find((c) => c.name === category);
    return found ? found.subcategories || [] : [];
  }, [data.categories, category]);

  // Dynamic calculations in modal based on MINUTES
  const materialsCost = useMemo(() => {
    return materialsUsed.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  }, [materialsUsed]);

  const laborHours = useMemo(() => {
    return (laborMinutes || 0) / 60;
  }, [laborMinutes]);

  const laborCost = useMemo(() => {
    return Math.round(laborHours * (hourlyRate || 3400));
  }, [laborHours, hourlyRate]);

  // Invisible expenses calculated automatically based on labor minutes
  const invisibleExpenseFixed = useMemo(() => {
    const overheadPerHour = data.costSettings.calculatedOverheadPerHour || 1590;
    return Math.round(laborHours * overheadPerHour);
  }, [laborHours, data.costSettings.calculatedOverheadPerHour]);

  const totalCalculatedCost = useMemo(() => {
    return materialsCost + laborCost + invisibleExpenseFixed;
  }, [materialsCost, laborCost, invisibleExpenseFixed]);

  // Raw price before manual subtraction
  const rawBasePriceBeforeSub = useMemo(() => {
    if (totalCalculatedCost <= 0) return 0;
    return Math.round(totalCalculatedCost * (1 + (profitMarginPercent || 0) / 100));
  }, [totalCalculatedCost, profitMarginPercent]);

  // Suggested subtraction to end in 00
  const suggestedSubtraction00 = useMemo(() => {
    if (rawBasePriceBeforeSub <= 0) return 0;
    const remainder = rawBasePriceBeforeSub % 100;
    return remainder;
  }, [rawBasePriceBeforeSub]);

  const calculatedBasePrice = useMemo(() => {
    if (totalCalculatedCost <= 0) return 0;
    let price = rawBasePriceBeforeSub;

    if (subtractionAmount && subtractionAmount > 0) {
      price = Math.max(0, price - subtractionAmount);
    }

    if (roundToCleanNumbers) {
      return Math.round(price / 10) * 10;
    }
    return Math.round(price);
  }, [rawBasePriceBeforeSub, subtractionAmount, roundToCleanNumbers]);

  const calculatedFinalPrice = useMemo(() => {
    if (!promoActive) return calculatedBasePrice;

    let discounted = calculatedBasePrice;
    if (promoType === 'fixed' && promoDiscountFixed > 0) {
      discounted = Math.max(0, calculatedBasePrice - promoDiscountFixed);
    } else if (promoType === 'percentage' && promoDiscountPercent > 0) {
      discounted = Math.max(0, calculatedBasePrice * (1 - promoDiscountPercent / 100));
    }

    if (roundToCleanNumbers) {
      return Math.round(discounted / 10) * 10;
    }
    return Math.round(discounted);
  }, [calculatedBasePrice, promoActive, promoType, promoDiscountPercent, promoDiscountFixed, roundToCleanNumbers]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingProductId(null);
    setName('');
    const firstCat = data.productCategories[0] || 'General';
    setCategory(firstCat);
    setSubcategory('');
    setDescription('');
    setImages([]);
    setType('stock');
    setStockQuantity(10);
    setVisibleInCatalog(true);
    setVariants([]);
    setEditingVariantIndex(null);
    setEditingOptionIndex(null);
    setEditingOptionCloudFeedback(null);
    setSaveOptionMaterialsToCloud(true);
    setVariantOptionsList([]);
    setNewVariantName('');
    setOptionNameInput('');
    setOptionPriceInput('');
    setOptionSubtractionInput('');
    setOptionPromoPctInput('');
    setOptionPromoFixedInput('');
    setMaterialsUsed([]);
    setEditingMaterialUsageId(null);
    setEditMatId('');
    setEditMatValue('');
    setLaborMinutes(45);
    setHourlyRate(data.costSettings.calculatedHourlyRate || 3400);
    setProfitMarginPercent(data.costSettings.defaultProfitMargin || 45);
    setSubtractionAmount(0);
    setRoundToCleanNumbers(true);
    setPromoActive(false);
    setPromoType('percentage');
    setPromoDiscountPercent(10);
    setPromoDiscountFixed(500);
    setPromoLabel('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (product: Product) => {
    setEditingProductId(product.id);
    setName(product.name);
    setCategory(product.category);
    setSubcategory(product.subcategory || '');
    setDescription(product.description);
    setImages(product.images || []);
    setType(product.type);
    setStockQuantity(product.stockQuantity || 0);
    setVisibleInCatalog(product.visibleInCatalog ?? true);

    const materialsMap = new Map(data.materials.map((m) => [m.id, m]));
    const prodMinutes = product.laborMinutes !== undefined
      ? product.laborMinutes
      : (product.laborHours ? Math.round(product.laborHours * 60) : 45);
    const prodMargin = product.profitMarginPercent || 45;
    const prodHourly = product.hourlyRate || data.costSettings.calculatedHourlyRate || 3400;
    const prodOverhead = data.costSettings.calculatedOverheadPerHour || 1590;

    // Normalize & sync variants with live material costs
    const normalizedVariants: ProductVariant[] = (product.variants || []).map((v) => ({
      name: v.name,
      options: v.options.map((opt) => {
        if (typeof opt === 'string') return { name: opt };
        return syncVariantOptionWithMaterials(
          opt,
          materialsMap,
          prodHourly,
          prodOverhead,
          prodMinutes,
          prodMargin,
          product.roundToCleanNumbers ?? true,
          {
            promoActive: product.promoActive,
            promoType: product.promoType,
            promoDiscountPercent: product.promoDiscountPercent,
            promoDiscountFixed: product.promoDiscountFixed,
          }
        );
      }),
    }));
    setVariants(normalizedVariants);
    setEditingVariantIndex(null);
    setEditingOptionIndex(null);
    setEditingOptionCloudFeedback(null);
    setSaveOptionMaterialsToCloud(true);
    setVariantOptionsList([]);
    setNewVariantName('');
    setOptionNameInput('');
    setOptionPriceInput('');
    setOptionSubtractionInput('');
    setOptionPromoPctInput('');
    setOptionPromoFixedInput('');

    // Refresh base materialsUsed against live material unitCosts too
    const syncedBaseMaterials = (product.materialsUsed || []).map((u) => {
      const liveMat = materialsMap.get(u.materialId);
      return liveMat ? { ...u, unitCost: liveMat.unitCost, materialName: liveMat.name } : u;
    });
    setMaterialsUsed(syncedBaseMaterials);
    setEditingMaterialUsageId(null);
    setEditMatId('');
    setEditMatValue('');
    setLaborMinutes(prodMinutes);
    setHourlyRate(prodHourly);
    setProfitMarginPercent(prodMargin);
    setSubtractionAmount(product.subtractionAmount || 0);
    setRoundToCleanNumbers(product.roundToCleanNumbers ?? true);
    setPromoActive(product.promoActive || false);
    setPromoType(product.promoType || 'percentage');
    setPromoDiscountPercent(product.promoDiscountPercent || 10);
    setPromoDiscountFixed(product.promoDiscountFixed || 500);
    setPromoLabel(product.promoLabel || '');
    setIsModalOpen(true);
  };

  // Handle image upload from PC or mobile with automatic lightweight compression
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 10) {
      alert('Podés subir hasta un máximo de 10 imágenes por producto.');
      return;
    }

    const compressedList: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file, 900, 900, 0.78);
        compressedList.push(compressed);
      } catch (err) {
        console.warn('Error compressing image, fallback to raw', err);
      }
    }
    if (compressedList.length > 0) {
      setImages((prev) => [...prev, ...compressedList].slice(0, 10));
    }
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    if (images.length >= 10) {
      alert('Máximo 10 imágenes por producto.');
      return;
    }
    setImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleMakeCoverImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      return [chosen, ...copy];
    });
  };

  // Helper to populate option price + subtraction from the current calculator state
  const applyCalculatorPricingToOptionInputs = () => {
    if (subtractionAmount > 0 && rawBasePriceBeforeSub > 0) {
      setOptionPriceInput(String(rawBasePriceBeforeSub));
      setOptionSubtractionInput(String(subtractionAmount));
    } else if (calculatedBasePrice > 0) {
      setOptionPriceInput(String(calculatedBasePrice));
      setOptionSubtractionInput('');
    }
  };

  // Auto-suggest pricing based on current product final price, subtraction, and active promo (pesos or %)
  const handleAutoSuggestProductPricing = () => {
    if (calculatedFinalPrice > 0 || rawBasePriceBeforeSub > 0) {
      applyCalculatorPricingToOptionInputs();
      if (promoActive) {
        if (promoType === 'percentage' && promoDiscountPercent > 0) {
          setOptionPromoPctInput(String(promoDiscountPercent));
          setOptionPromoFixedInput('');
        } else if (promoType === 'fixed' && promoDiscountFixed && promoDiscountFixed > 0) {
          setOptionPromoFixedInput(String(promoDiscountFixed));
          setOptionPromoPctInput('');
        }
      } else {
        setOptionPromoPctInput('');
        setOptionPromoFixedInput('');
      }
    }
  };

  // Helper to create a clean Firestore-safe copy of current calculator materials
  const snapshotCurrentMaterials = (): ProductMaterialUsage[] => {
    return materialsUsed.map((m) => {
      const cleanItem: ProductMaterialUsage = {
        materialId: m.materialId,
        materialName: m.materialName,
        quantity: m.quantity,
        unitCost: m.unitCost,
      };
      if (m.usePercentage !== undefined) cleanItem.usePercentage = m.usePercentage;
      if (m.divisionParts !== undefined) cleanItem.divisionParts = m.divisionParts;
      return cleanItem;
    });
  };

  // Compute live preview of option's net price after its own independent subtraction & promo
  const currentOptionRawNum = optionPriceInput ? parseFloat(optionPriceInput) : 0;
  const currentOptionSubNum = optionSubtractionInput ? Math.max(0, parseFloat(optionSubtractionInput)) : 0;
  const currentOptionSuggestedSub00 = currentOptionRawNum > 0 ? Math.round(currentOptionRawNum) % 100 : 0;
  const currentOptionNetBase = (() => {
    if (!currentOptionRawNum || currentOptionRawNum <= 0) return 0;
    let net = Math.max(0, currentOptionRawNum - currentOptionSubNum);
    if (roundToCleanNumbers && currentOptionSubNum > 0 && net > 0) {
      net = Math.round(net / 10) * 10;
    }
    return net;
  })();

  // Add or update individual option in variant draft (with independent subtraction, price, promo, and cloud material history)
  const handleAddOptionToDraft = () => {
    const trimmed = optionNameInput.trim();
    if (!trimmed) return;
    const rawPriceNum = optionPriceInput ? parseFloat(optionPriceInput) : undefined;
    const subNum = optionSubtractionInput ? Math.max(0, parseFloat(optionSubtractionInput)) : 0;
    let priceNum = rawPriceNum;
    if (rawPriceNum && rawPriceNum > 0 && subNum > 0) {
      priceNum = Math.max(0, rawPriceNum - subNum);
      if (roundToCleanNumbers && priceNum > 0) {
        priceNum = Math.round(priceNum / 10) * 10;
      }
    }

    const promoPct = optionPromoPctInput ? parseFloat(optionPromoPctInput) : undefined;
    const promoFixed = optionPromoFixedInput ? parseFloat(optionPromoFixedInput) : undefined;
    let optFinal: number | undefined = undefined;

    if (priceNum && priceNum > 0) {
      if (promoFixed && promoFixed > 0) {
        optFinal = Math.max(0, priceNum - promoFixed);
      } else if (promoPct && promoPct > 0) {
        optFinal = Math.round(priceNum * (1 - promoPct / 100));
      } else {
        optFinal = priceNum;
      }
    }

    const shouldSaveMats = saveOptionMaterialsToCloud && materialsUsed.length > 0;
    const existingOpt = editingOptionIndex !== null ? variantOptionsList[editingOptionIndex] : undefined;

    const newOptionItem: VariantOptionItem = {
      name: trimmed,
      ...(priceNum && priceNum > 0 ? { price: priceNum } : {}),
      ...(subNum > 0 ? { subtractionAmount: subNum } : {}),
      ...(!shouldSaveMats && subNum > 0 && rawPriceNum && rawPriceNum > 0 ? { rawPrice: rawPriceNum } : {}),
      ...(promoPct && promoPct > 0 ? { promoDiscountPercent: promoPct } : {}),
      ...(promoFixed && promoFixed > 0 ? { promoDiscountFixed: promoFixed } : {}),
      ...(optFinal !== undefined ? { finalPrice: optFinal } : {}),
      ...(shouldSaveMats
        ? {
            materialsUsed: snapshotCurrentMaterials(),
            laborMinutes: Number(laborMinutes),
            profitMarginPercent: Number(profitMarginPercent),
          }
        : !saveOptionMaterialsToCloud
        ? {}
        : existingOpt?.materialsUsed
        ? {
            materialsUsed: existingOpt.materialsUsed,
            ...(existingOpt.laborMinutes !== undefined ? { laborMinutes: existingOpt.laborMinutes } : {}),
            ...(existingOpt.profitMarginPercent !== undefined ? { profitMarginPercent: existingOpt.profitMarginPercent } : {}),
          }
        : {}),
    };

    if (editingOptionIndex !== null) {
      setVariantOptionsList((prev) =>
        prev.map((item, idx) => (idx === editingOptionIndex ? newOptionItem : item))
      );
      setEditingOptionIndex(null);
      setEditingOptionCloudFeedback(null);
    } else {
      setVariantOptionsList((prev) => [...prev, newOptionItem]);
    }

    setOptionNameInput('');
    setOptionPriceInput('');
    setOptionSubtractionInput('');
    setOptionPromoPctInput('');
    setOptionPromoFixedInput('');
  };

  // Load an existing option for editing and auto-update its saved materials & own subtraction into the calculator
  const handleStartEditOption = (idx: number) => {
    const opt = variantOptionsList[idx];
    if (!opt) return;

    setEditingOptionIndex(idx);
    setOptionNameInput(opt.name);
    setOptionPromoPctInput(opt.promoDiscountPercent ? String(opt.promoDiscountPercent) : '');
    setOptionPromoFixedInput(opt.promoDiscountFixed ? String(opt.promoDiscountFixed) : '');

    const optSub = opt.subtractionAmount || 0;

    if (opt.materialsUsed && opt.materialsUsed.length > 0) {
      const materialsMap = new Map(data.materials.map((m) => [m.id, m]));
      const usedHourlyRate = hourlyRate || data.costSettings.calculatedHourlyRate || 3400;
      const usedOverhead = data.costSettings.calculatedOverheadPerHour || 1590;
      const synced = syncVariantOptionWithMaterials(
        opt,
        materialsMap,
        usedHourlyRate,
        usedOverhead,
        laborMinutes,
        profitMarginPercent,
        roundToCleanNumbers,
        {
          promoActive,
          promoType,
          promoDiscountPercent,
          promoDiscountFixed,
        }
      );

      // Update option in draft list with live-recalculated numbers
      setVariantOptionsList((prev) => prev.map((item, i) => (i === idx ? synced : item)));

      // Load its live-updated materials, minutes, margin, and own independent subtraction into the calculator
      if (synced.materialsUsed) {
        setMaterialsUsed(synced.materialsUsed);
        setEditingMaterialUsageId(null);
      }
      if (synced.laborMinutes !== undefined) {
        setLaborMinutes(synced.laborMinutes);
      }
      if (synced.profitMarginPercent !== undefined) {
        setProfitMarginPercent(synced.profitMarginPercent);
      }
      setSubtractionAmount(optSub);

      if (optSub > 0) {
        const rawBeforeSub = computeOptionRawPriceBeforeSub(
          synced,
          materialsMap,
          usedHourlyRate,
          usedOverhead,
          laborMinutes,
          profitMarginPercent
        );
        setOptionPriceInput(rawBeforeSub > 0 ? String(rawBeforeSub) : (synced.price ? String(synced.price + optSub) : ''));
        setOptionSubtractionInput(String(optSub));
      } else {
        setOptionPriceInput(synced.price ? String(synced.price) : '');
        setOptionSubtractionInput('');
      }

      setSaveOptionMaterialsToCloud(true);
      setEditingOptionCloudFeedback(
        `Nube sincronizada: "${opt.name}" cargó ${synced.materialsUsed?.length || 0} insumo(s) con costos actuales (${formatCurrency(synced.price || 0)}).`
      );
    } else {
      if (optSub > 0) {
        const raw = opt.rawPrice && opt.rawPrice > 0 ? opt.rawPrice : (opt.price || 0) + optSub;
        setOptionPriceInput(raw > 0 ? String(raw) : '');
        setOptionSubtractionInput(String(optSub));
      } else {
        setOptionPriceInput(opt.price ? String(opt.price) : '');
        setOptionSubtractionInput('');
      }
      setSaveOptionMaterialsToCloud(materialsUsed.length > 0);
      setEditingOptionCloudFeedback(null);
    }
  };

  const handleCancelEditOption = () => {
    setEditingOptionIndex(null);
    setOptionNameInput('');
    setOptionPriceInput('');
    setOptionSubtractionInput('');
    setOptionPromoPctInput('');
    setOptionPromoFixedInput('');
    setEditingOptionCloudFeedback(null);
  };

  const handleRemoveOptionFromDraft = (idx: number) => {
    if (editingOptionIndex === idx) {
      handleCancelEditOption();
    } else if (editingOptionIndex !== null && editingOptionIndex > idx) {
      setEditingOptionIndex(editingOptionIndex - 1);
    }
    setVariantOptionsList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Variant editing handlers (automatically sync cloud-saved options with live material costs)
  const handleStartEditVariant = (index: number) => {
    const v = variants[index];
    if (!v) return;
    const materialsMap = new Map(data.materials.map((m) => [m.id, m]));
    const syncedOptions = v.options.map((opt) =>
      typeof opt === 'string'
        ? { name: opt }
        : syncVariantOptionWithMaterials(
            opt,
            materialsMap,
            hourlyRate || data.costSettings.calculatedHourlyRate || 3400,
            data.costSettings.calculatedOverheadPerHour || 1590,
            laborMinutes,
            profitMarginPercent,
            roundToCleanNumbers,
            {
              promoActive,
              promoType,
              promoDiscountPercent,
              promoDiscountFixed,
            }
          )
    );

    setEditingVariantIndex(index);
    setEditingOptionIndex(null);
    setNewVariantName(v.name);
    setVariantOptionsList(syncedOptions);

    const cloudCount = syncedOptions.filter((o) => o.materialsUsed && o.materialsUsed.length > 0).length;
    if (cloudCount > 0) {
      setEditingOptionCloudFeedback(
        `☁️ ${cloudCount} opción(es) actualizadas con el costo vigente de insumos. Tocá el lápiz (✎) de cualquier opción para editar sus insumos en el calculador.`
      );
    } else {
      setEditingOptionCloudFeedback(null);
    }
  };

  const handleCancelEditVariant = () => {
    setEditingVariantIndex(null);
    setEditingOptionIndex(null);
    setEditingOptionCloudFeedback(null);
    setNewVariantName('');
    setVariantOptionsList([]);
    setOptionNameInput('');
    setOptionPriceInput('');
    setOptionSubtractionInput('');
    setOptionPromoPctInput('');
    setOptionPromoFixedInput('');
  };

  // Save or update variant to product
  const handleSaveVariant = () => {
    if (!newVariantName.trim()) {
      alert('Ingresá el nombre de la variante (ej: Tamaño, Tipo de Hojas).');
      return;
    }
    if (variantOptionsList.length === 0) {
      alert('Agregá al menos una opción para esta variante.');
      return;
    }

    if (editingVariantIndex !== null) {
      setVariants((prev) =>
        prev.map((v, i) =>
          i === editingVariantIndex ? { name: newVariantName.trim(), options: variantOptionsList } : v
        )
      );
      setEditingVariantIndex(null);
    } else {
      setVariants((prev) => [
        ...prev,
        { name: newVariantName.trim(), options: variantOptionsList },
      ]);
    }
    setEditingOptionIndex(null);
    setEditingOptionCloudFeedback(null);
    setNewVariantName('');
    setVariantOptionsList([]);
    setOptionNameInput('');
    setOptionPriceInput('');
    setOptionSubtractionInput('');
    setOptionPromoPctInput('');
    setOptionPromoFixedInput('');
  };

  const handleRemoveVariant = (index: number) => {
    if (editingVariantIndex === index) {
      handleCancelEditVariant();
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // 3:4 Image Cropper Handlers
  const handleOpenCropModal = (index: number) => {
    setCroppingImageIndex(index);
    setCropZoom(1);
    setCropPanX(0);
    setCropPanY(0);
  };

  const handleApplyCrop34 = () => {
    if (croppingImageIndex === null) return;
    const src = images[croppingImageIndex];
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetWidth = 900;
      const targetHeight = 1200; // 3:4 ratio
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill clean background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Base scale to cover 3:4 aspect ratio
      const imgRatio = img.width / img.height;
      const canvasRatio = targetWidth / targetHeight; // 0.75

      let baseDrawWidth: number;
      let baseDrawHeight: number;

      if (imgRatio > canvasRatio) {
        // Image is wider than 3:4
        baseDrawHeight = targetHeight;
        baseDrawWidth = img.width * (targetHeight / img.height);
      } else {
        // Image is taller or equal
        baseDrawWidth = targetWidth;
        baseDrawHeight = img.height * (targetWidth / img.width);
      }

      const drawWidth = baseDrawWidth * cropZoom;
      const drawHeight = baseDrawHeight * cropZoom;

      const centerX = (targetWidth - drawWidth) / 2;
      const centerY = (targetHeight - drawHeight) / 2;

      const offsetX = (cropPanX / 100) * targetWidth;
      const offsetY = (cropPanY / 100) * targetHeight;

      ctx.drawImage(img, centerX + offsetX, centerY + offsetY, drawWidth, drawHeight);

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setImages((prev) =>
        prev.map((image, idx) => (idx === croppingImageIndex ? croppedDataUrl : image))
      );
      setCroppingImageIndex(null);
    };
    img.src = src;
  };

  // Add material to recipe (by exact qty, percentage of unit, or yield/parts)
  const handleAddMaterialToProduct = () => {
    if (!selectedMaterialId) return;
    const mat = data.materials.find((m) => m.id === selectedMaterialId);
    if (!mat) return;

    let qty = 1;
    let usePct: number | undefined = undefined;
    let divParts: number | undefined = undefined;

    if (materialAddMode === 'partes') {
      const parts = parseFloat(materialPartsInput);
      if (isNaN(parts) || parts <= 0) return;
      qty = 1 / parts;
      divParts = parts;
    } else if (materialAddMode === 'porcentaje') {
      const pct = parseFloat(materialPctInput);
      if (isNaN(pct) || pct <= 0) return;
      qty = pct / 100;
      usePct = pct;
    } else {
      qty = parseFloat(materialQtyInput);
      if (isNaN(qty) || qty <= 0) return;
    }

    setMaterialsUsed((prev) => {
      const existing = prev.find((m) => m.materialId === mat.id);
      if (existing) {
        return prev.map((m) =>
          m.materialId === mat.id
            ? {
                materialId: m.materialId,
                materialName: mat.name,
                quantity: m.quantity + qty,
                unitCost: mat.unitCost,
                ...(usePct !== undefined ? { usePercentage: usePct } : {}),
                ...(divParts !== undefined ? { divisionParts: divParts } : {}),
              }
            : m
        );
      }
      return [
        ...prev,
        {
          materialId: mat.id,
          materialName: mat.name,
          quantity: qty,
          unitCost: mat.unitCost,
          ...(usePct !== undefined ? { usePercentage: usePct } : {}),
          ...(divParts !== undefined ? { divisionParts: divParts } : {}),
        },
      ];
    });

    setSelectedMaterialId('');
    setMaterialQtyInput('1');
    setMaterialPctInput('50');
    setMaterialPartsInput('10');
  };

  const handleStartEditMaterialUsage = (m: ProductMaterialUsage) => {
    setEditingMaterialUsageId(m.materialId);
    setEditMatId(m.materialId);
    if (m.divisionParts && m.divisionParts > 0) {
      setEditMatMode('partes');
      setEditMatValue(String(m.divisionParts));
    } else if (m.usePercentage && m.usePercentage > 0) {
      setEditMatMode('porcentaje');
      setEditMatValue(String(m.usePercentage));
    } else {
      setEditMatMode('cantidad');
      setEditMatValue(String(m.quantity));
    }
  };

  const handleCancelEditMaterialUsage = () => {
    setEditingMaterialUsageId(null);
    setEditMatId('');
    setEditMatValue('');
  };

  const handleSaveEditedMaterialUsage = () => {
    if (!editingMaterialUsageId || !editMatId) return;
    const val = parseFloat(editMatValue);
    if (isNaN(val) || val <= 0) return;

    const targetMat = data.materials.find((x) => x.id === editMatId);
    const originalItem = materialsUsed.find((x) => x.materialId === editingMaterialUsageId);
    if (!targetMat && !originalItem) return;

    let qty = val;
    let usePct: number | undefined = undefined;
    let divParts: number | undefined = undefined;

    if (editMatMode === 'partes') {
      qty = 1 / val;
      divParts = val;
    } else if (editMatMode === 'porcentaje') {
      qty = val / 100;
      usePct = val;
    }

    const updatedEntry: ProductMaterialUsage = {
      materialId: targetMat ? targetMat.id : originalItem!.materialId,
      materialName: targetMat ? targetMat.name : originalItem!.materialName,
      quantity: qty,
      unitCost: targetMat ? targetMat.unitCost : originalItem!.unitCost,
      ...(usePct !== undefined ? { usePercentage: usePct } : {}),
      ...(divParts !== undefined ? { divisionParts: divParts } : {}),
    };

    setMaterialsUsed((prev) => {
      if (updatedEntry.materialId === editingMaterialUsageId) {
        return prev.map((item) =>
          item.materialId === editingMaterialUsageId ? updatedEntry : item
        );
      }
      const alreadyExists = prev.some((item) => item.materialId === updatedEntry.materialId);
      if (alreadyExists) {
        return prev
          .filter((item) => item.materialId !== editingMaterialUsageId)
          .map((item) =>
            item.materialId === updatedEntry.materialId ? updatedEntry : item
          );
      }
      return prev.map((item) =>
        item.materialId === editingMaterialUsageId ? updatedEntry : item
      );
    });

    setEditingMaterialUsageId(null);
    setEditMatId('');
    setEditMatValue('');
  };

  const handleRemoveMaterial = (materialId: string) => {
    if (editingMaterialUsageId === materialId) {
      handleCancelEditMaterialUsage();
    }
    setMaterialsUsed((prev) => prev.filter((m) => m.materialId !== materialId));
  };

  // Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor ingresá el nombre del producto.');
      return;
    }

    const productPayload = {
      name: name.trim(),
      category: category || data.productCategories[0] || 'General',
      subcategory: subcategory.trim() || undefined,
      description,
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'],
      type,
      stockQuantity: type === 'stock' ? Number(stockQuantity) : 0,
      visibleInCatalog,
      variants,
      materialsUsed,
      laborMinutes: Number(laborMinutes),
      laborHours: Number(laborMinutes) / 60,
      hourlyRate: Number(hourlyRate),
      invisibleExpenseFixed,
      profitMarginPercent: Number(profitMarginPercent),
      subtractionAmount: Number(subtractionAmount),
      roundToCleanNumbers,
      calculatedCost: totalCalculatedCost,
      basePrice: calculatedBasePrice,
      promoActive,
      promoType,
      promoDiscountPercent: promoActive && promoType === 'percentage' ? Number(promoDiscountPercent) : 0,
      promoDiscountFixed: promoActive && promoType === 'fixed' ? Number(promoDiscountFixed) : 0,
      promoLabel: promoActive ? promoLabel.trim() : undefined,
      finalPrice: calculatedFinalPrice,
    };

    if (editingProductId) {
      updateProduct(editingProductId, productPayload);
    } else {
      addProduct(productPayload);
    }

    setIsModalOpen(false);
  };

  // Filter and sort products for the manager table/cards
  const filteredProducts = useMemo(() => {
    let list = [...data.products];
    if (selectedCategory !== 'Todas') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'az') return a.name.localeCompare(b.name, 'es');
      if (sortBy === 'za') return b.name.localeCompare(a.name, 'es');
      if (sortBy === 'precio_asc') return getLowestProductPricing(a).finalPrice - getLowestProductPricing(b).finalPrice;
      if (sortBy === 'precio_desc') return getLowestProductPricing(b).finalPrice - getLowestProductPricing(a).finalPrice;
      if (sortBy === 'categoria') return a.category.localeCompare(b.category, 'es');
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [data.products, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900">
            Administración de Productos
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Variantes con precio individual, cálculo por minutos, subcategorías, duplicado y resta automática a 00
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentTab('catalogo')}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>🛍️ Ver Catálogo</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FolderTree className="w-3.5 h-3.5 text-pink-600" />
            <span>Categorías & Subcategorías</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-pink-200 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Filter, Search and Sort Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-pink-100 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-pink-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-semibold whitespace-nowrap hidden sm:inline">
              Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden focus:border-pink-500 cursor-pointer"
            >
              <option value="recientes">Más recientes</option>
              <option value="az">Nombre: A - Z</option>
              <option value="za">Nombre: Z - A</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="categoria">Por categoría</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar pt-1 lg:pt-0">
          {['Todas', ...data.productCategories].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-pink-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((product) => {
          const img = product.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
          const isOut = product.type === 'stock' && product.stockQuantity <= 0;

          return (
            <div
              key={product.id}
              className="bg-white rounded-3xl border border-pink-100 p-4 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 relative">
                  <img src={img} alt={product.name} className="w-full h-full object-cover" />
                  {product.images && product.images.length > 1 && (
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 rounded">
                      {product.images.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-pink-600 uppercase tracking-wider truncate">
                    <span>{product.category}</span>
                    {product.subcategory && (
                      <>
                        <span className="text-stone-300">•</span>
                        <span className="text-stone-500 font-semibold">{product.subcategory}</span>
                      </>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-stone-800 line-clamp-1">
                    {product.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isOut
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : product.type === 'stock'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isOut
                        ? 'Agotado (0 stock)'
                        : product.type === 'stock'
                        ? `Stock: ${product.stockQuantity}`
                        : 'Por Pedido'}
                    </span>
                    {product.promoActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        {product.promoLabel || (product.promoType === 'fixed' ? `$${product.promoDiscountFixed} OFF` : `${product.promoDiscountPercent}% OFF`)}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        product.visibleInCatalog !== false
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      {product.visibleInCatalog !== false ? '👁️ En Catálogo' : '🔒 Oculto'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Variants badge if any (compact with cloud icon when recipes saved) */}
              {product.variants && product.variants.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.variants.map((v, vIdx) => {
                    const cloudOptionsCount = v.options.filter(
                      (o) => typeof o !== 'string' && o.materialsUsed && o.materialsUsed.length > 0
                    ).length;
                    return (
                      <span
                        key={`${v.name}-${vIdx}`}
                        className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                      >
                        <span>{v.name}: {v.options.length} opc.</span>
                        {cloudOptionsCount > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 text-sky-700 font-bold"
                            title={`${cloudOptionsCount} opción(es) con historial de insumos en la nube`}
                          >
                            <Cloud className="w-2.5 h-2.5" />
                            <span>{cloudOptionsCount}</span>
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Cost & Final Price Summary for Admin */}
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-xs space-y-1">
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Costo ({product.laborMinutes || 45} min):</span>
                  <span>{formatCurrency(product.calculatedCost || 0)}</span>
                </div>
                {product.subtractionAmount && product.subtractionAmount > 0 && (
                  <div className="flex justify-between text-amber-700 text-[11px]">
                    <span>Resta p/ redondear:</span>
                    <span>-{formatCurrency(product.subtractionAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-stone-800">
                  <span>Precio Final:</span>
                  <span className="text-pink-700 font-serif-brand text-sm">
                    {(() => {
                      const lowest = getLowestProductPricing(product);
                      return lowest.hasRange
                        ? `Desde ${formatCurrency(lowest.finalPrice)}`
                        : formatCurrency(product.finalPrice);
                    })()}
                  </span>
                </div>
              </div>

              {/* Action buttons: Edit, Duplicate, Delete */}
              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-stone-100">
                <button
                  onClick={() => duplicateProduct(product.id)}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Duplicar producto con un clic"
                >
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>Duplicar</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(product)}
                  className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar producto "${product.name}"?`)) {
                      deleteProduct(product.id);
                    }
                  }}
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded-xl hover:bg-stone-100 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-pink-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-rose-50/50">
              <h3 className="font-serif-brand font-bold text-xl text-stone-800">
                {editingProductId ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Agenda Perpetua A5 Rose Gold"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:border-pink-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Categoría Principal
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubcategory('');
                    }}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:border-pink-500 outline-hidden"
                  >
                    {data.productCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Subcategoría (Opcional)
                  </label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:border-pink-500 outline-hidden"
                  >
                    <option value="">-- Sin subcategoría --</option>
                    {availableSubcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Disponibilidad / Tipo
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setType('stock')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        type === 'stock'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-500'
                          : 'bg-stone-50 text-stone-600 border-stone-200'
                      }`}
                    >
                      En Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('order')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        type === 'order'
                          ? 'bg-amber-50 text-amber-800 border-amber-500'
                          : 'bg-stone-50 text-stone-600 border-stone-200'
                      }`}
                    >
                      Por Pedido Artesanal
                    </button>
                  </div>
                </div>

                {type === 'stock' && (
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Cantidad en Stock (0 = Agotado para clientes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockQuantity === 0 ? '' : stockQuantity}
                      placeholder="0"
                      onChange={(e) => setStockQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:border-pink-500 outline-hidden"
                    />
                  </div>
                )}

                {/* Visible in Catalog Toggle (Requested by user) */}
                <div className="flex items-center justify-between p-3.5 bg-pink-50/70 rounded-2xl border border-pink-100 col-span-full">
                  <div>
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5 cursor-pointer">
                      <Eye className="w-3.5 h-3.5 text-pink-600" />
                      <span>Mostrar en el catálogo online para clientes</span>
                    </label>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {visibleInCatalog
                        ? 'El producto aparecerá visible en el catálogo para que los clientes puedan verlo y comprarlo.'
                        : 'El producto estará oculto del catálogo de clientes (solo visible acá en el administrador).'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                    <input
                      type="checkbox"
                      checked={visibleInCatalog}
                      onChange={(e) => setVisibleInCatalog(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Descripción del Producto
                </label>
                <textarea
                  rows={4}
                  placeholder="Detalles sobre medidas, tapas, gramaje de hojas, encuadernación..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:border-pink-500 outline-hidden"
                />
              </div>

              {/* Images Uploader (1 to 10 images) */}
              <div className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-pink-600" />
                    <span>Fotos del Producto (1 a 10 imágenes)</span>
                  </label>
                  <span className="text-[11px] text-stone-500">
                    {images.length}/10 fotos
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-xl text-xs font-bold transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir desde PC o Celular</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 flex items-center gap-2 min-w-[240px]">
                    <input
                      type="url"
                      placeholder="O pegar URL de imagen..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-semibold"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] text-stone-500 font-semibold block">
                      Fotos del producto (podés reordenarlas con las flechas o elegir la portada):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                      {images.map((img, i) => (
                        <div
                          key={i}
                          className={`relative rounded-2xl border p-1.5 flex flex-col justify-between space-y-1.5 transition-all bg-white ${
                            i === 0
                              ? 'border-pink-500 shadow-sm ring-1 ring-pink-400'
                              : 'border-stone-200 shadow-2xs hover:border-pink-300'
                          }`}
                        >
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-stone-50 flex items-center justify-center">
                            <img src={img} alt="" className="w-full h-full object-contain p-1" />
                            {i === 0 && (
                              <span className="absolute top-1 left-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-white" />
                                Portada
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(i)}
                              className="absolute top-1 right-1 p-1 bg-red-600/85 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                              title="Eliminar esta foto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Reordering Controls */}
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveImage(i, 'left')}
                              disabled={i === 0}
                              className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Mover hacia la izquierda"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>

                            {i !== 0 ? (
                              <button
                                type="button"
                                onClick={() => handleMakeCoverImage(i)}
                                className="px-1.5 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold transition-colors cursor-pointer truncate"
                                title="Fijar como foto principal"
                              >
                                Portada
                              </button>
                            ) : (
                              <span className="text-[10px] text-pink-600 font-bold">Principal</span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleMoveImage(i, 'right')}
                              disabled={i === images.length - 1}
                              className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Mover hacia la derecha"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenCropModal(i)}
                            className="w-full mt-1 py-1 px-1 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border border-pink-200 transition-colors cursor-pointer"
                            title="Ajustar zoom, centrado y recorte exacto a 3:4"
                          >
                            <Crop className="w-3 h-3 text-pink-600" />
                            <span>Ajustar 3:4</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cost Calculator Section (Labor in MINUTES + Auto Invisible Expenses) */}
              <div
                ref={calculatorSectionRef}
                className="p-4 sm:p-5 bg-gradient-to-br from-pink-50/50 to-rose-50/30 rounded-3xl border border-pink-200 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-pink-600" />
                    <h4 className="font-serif-brand font-bold text-base text-stone-800">
                      Cálculo Dinámico de Costos
                    </h4>
                  </div>
                  {editingOptionIndex !== null && variantOptionsList[editingOptionIndex] && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold">
                      <Cloud className="w-3 h-3" />
                      <span>Editando insumos de: {variantOptionsList[editingOptionIndex].name}</span>
                    </span>
                  )}
                </div>

                {/* Insumos Recipe */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="text-xs font-bold text-stone-700 block">
                      1. Insumos Utilizados (Cantidad, Porcentaje o Rendimiento por partes)
                    </label>
                    <div className="flex bg-white rounded-lg border border-pink-200 p-0.5 text-[11px] overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setMaterialAddMode('cantidad')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                          materialAddMode === 'cantidad'
                            ? 'bg-pink-600 text-white font-bold'
                            : 'text-stone-600 hover:text-pink-600'
                        }`}
                      >
                        Cantidad Exacta
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialAddMode('porcentaje')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                          materialAddMode === 'porcentaje'
                            ? 'bg-pink-600 text-white font-bold'
                            : 'text-stone-600 hover:text-pink-600'
                        }`}
                      >
                        Porcentaje (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialAddMode('partes')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                          materialAddMode === 'partes'
                            ? 'bg-pink-600 text-white font-bold'
                            : 'text-stone-600 hover:text-pink-600'
                        }`}
                      >
                        Rendimiento (1 rinde X)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Material search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Buscar insumo por nombre..."
                        value={materialSearchQuery}
                        onChange={(e) => setMaterialSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-pink-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <select
                          value={selectedMaterialId}
                          onChange={(e) => setSelectedMaterialId(e.target.value)}
                          className="w-full p-2 bg-white border border-pink-200 rounded-xl text-xs outline-hidden"
                        >
                          <option value="">
                            -- Seleccionar insumo ({filteredMaterialsForSelect.length} encontrados) --
                          </option>
                          {filteredMaterialsForSelect.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({formatCurrency(m.unitCost)} / {m.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {materialAddMode === 'cantidad' ? (
                        <div className="w-24">
                          <input
                            type="number"
                            step="any"
                            placeholder="Cant."
                            value={materialQtyInput}
                            onChange={(e) => setMaterialQtyInput(e.target.value)}
                            className="w-full p-2 bg-white border border-pink-200 rounded-xl text-xs outline-hidden"
                          />
                        </div>
                      ) : materialAddMode === 'porcentaje' ? (
                        <div className="w-28 relative">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="%"
                            value={materialPctInput}
                            onChange={(e) => setMaterialPctInput(e.target.value)}
                            className="w-full p-2 pr-6 bg-white border border-pink-200 rounded-xl text-xs outline-hidden"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="w-36 relative">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            placeholder="Rinde X prod."
                            value={materialPartsInput}
                            onChange={(e) => setMaterialPartsInput(e.target.value)}
                            className="w-full p-2 pr-12 bg-white border border-pink-200 rounded-xl text-xs outline-hidden"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400">
                            partes
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleAddMaterialToProduct}
                        className="px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Añadir Insumo
                      </button>
                    </div>
                  </div>

                  {materialsUsed.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {materialsUsed.map((m) => {
                        const isEditingMat = editingMaterialUsageId === m.materialId;
                        if (isEditingMat) {
                          const selectedEditMat = data.materials.find((x) => x.id === editMatId);
                          const parsedEditVal = parseFloat(editMatValue) || 0;
                          const previewQty =
                            parsedEditVal <= 0
                              ? 0
                              : editMatMode === 'partes'
                              ? 1 / parsedEditVal
                              : editMatMode === 'porcentaje'
                              ? parsedEditVal / 100
                              : parsedEditVal;
                          const previewUnitCost = selectedEditMat ? selectedEditMat.unitCost : m.unitCost;

                          return (
                            <div
                              key={m.materialId}
                              className="p-3 bg-sky-50/70 rounded-2xl border-2 border-sky-300 space-y-2 shadow-xs text-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-sky-900">
                                  Editando insumo: {m.materialName}
                                </span>
                                <div className="flex bg-white rounded-lg border border-sky-200 p-0.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => setEditMatMode('cantidad')}
                                    className={`px-2 py-0.5 rounded cursor-pointer ${
                                      editMatMode === 'cantidad'
                                        ? 'bg-sky-600 text-white font-bold'
                                        : 'text-stone-600 hover:text-sky-700'
                                    }`}
                                  >
                                    Cantidad
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditMatMode('porcentaje')}
                                    className={`px-2 py-0.5 rounded cursor-pointer ${
                                      editMatMode === 'porcentaje'
                                        ? 'bg-sky-600 text-white font-bold'
                                        : 'text-stone-600 hover:text-sky-700'
                                    }`}
                                  >
                                    %
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditMatMode('partes')}
                                    className={`px-2 py-0.5 rounded cursor-pointer ${
                                      editMatMode === 'partes'
                                        ? 'bg-sky-600 text-white font-bold'
                                        : 'text-stone-600 hover:text-sky-700'
                                    }`}
                                  >
                                    1 rinde X
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                                <select
                                  value={editMatId}
                                  onChange={(e) => setEditMatId(e.target.value)}
                                  className="flex-1 p-2 bg-white border border-sky-200 rounded-xl text-xs font-semibold outline-hidden focus:border-sky-500"
                                >
                                  {!sortedMaterials.some((sm) => sm.id === m.materialId) && (
                                    <option value={m.materialId}>
                                      {m.materialName} ({formatCurrency(m.unitCost)})
                                    </option>
                                  )}
                                  {sortedMaterials.map((matOpt) => (
                                    <option key={matOpt.id} value={matOpt.id}>
                                      {matOpt.name} ({formatCurrency(matOpt.unitCost)} / {matOpt.unit})
                                    </option>
                                  ))}
                                </select>

                                <div className="relative w-full sm:w-32">
                                  <input
                                    type="number"
                                    min="0.0001"
                                    step="any"
                                    value={editMatValue}
                                    onChange={(e) => setEditMatValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveEditedMaterialUsage();
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCancelEditMaterialUsage();
                                      }
                                    }}
                                    placeholder={
                                      editMatMode === 'partes'
                                        ? 'Partes'
                                        : editMatMode === 'porcentaje'
                                        ? '%'
                                        : 'Cant.'
                                    }
                                    className="w-full p-2 pr-12 bg-white border border-sky-200 rounded-xl text-xs font-bold text-stone-800 outline-hidden focus:border-sky-500"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400">
                                    {editMatMode === 'partes'
                                      ? 'partes'
                                      : editMatMode === 'porcentaje'
                                      ? '%'
                                      : 'un.'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                                  <span className="font-bold text-sky-800 text-xs px-1.5">
                                    {formatCurrency(previewQty * previewUnitCost)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleSaveEditedMaterialUsage}
                                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                    title="Guardar cambios del insumo"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Guardar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditMaterialUsage}
                                    className="px-2 py-1.5 bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                    title="Cancelar edición"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={m.materialId}
                            className="p-2.5 bg-white rounded-2xl border border-pink-100 flex items-center justify-between gap-2 shadow-2xs text-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-stone-800 block truncate">{m.materialName}</span>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-500">
                                <span>
                                  Uso:{' '}
                                  <strong className="text-pink-700">
                                    {m.divisionParts
                                      ? `1/${m.divisionParts} de un. (rinde ${m.divisionParts} prod.)`
                                      : m.usePercentage
                                      ? `${m.usePercentage}% (${m.quantity} un.)`
                                      : `${m.quantity} un.`}
                                  </strong>
                                </span>
                                <span>• Unit: {formatCurrency(m.unitCost)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-bold text-pink-700 font-serif-brand text-xs sm:text-sm mr-1">
                                {formatCurrency(m.quantity * m.unitCost)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditMaterialUsage(m)}
                                className="px-2 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                title="Editar insumo o cantidad"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMaterial(m.materialId)}
                                className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                title="Eliminar insumo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Quitar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-right text-xs font-bold text-stone-700">
                    Subtotal Insumos: {formatCurrency(materialsCost)}
                  </p>
                </div>

                {/* Labor (in MINUTES) and Auto Invisible Expenses */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      2. Tiempo de Confección (en minutos) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={laborMinutes === 0 ? '' : laborMinutes}
                        placeholder="Minutos"
                        onChange={(e) => setLaborMinutes(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full p-2 bg-white border border-pink-200 rounded-xl text-xs font-bold outline-hidden"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-semibold">
                        min
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      {(laborMinutes / 60).toFixed(2)} hs = {formatCurrency(laborCost)}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      3. Gastos Invisibles Automáticos
                    </label>
                    <div className="p-2 bg-white/70 border border-pink-200 rounded-xl text-xs font-bold text-stone-700">
                      {formatCurrency(invisibleExpenseFixed)}
                    </div>
                    <span className="text-[10px] text-stone-400 block mt-0.5">
                      Calculado según los {laborMinutes} min de confección
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      4. Margen de Ganancia (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={profitMarginPercent === 0 ? '' : profitMarginPercent}
                      placeholder="45"
                      onChange={(e) => setProfitMarginPercent(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full p-2 bg-white border border-pink-200 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                </div>

                {/* Manual subtraction with Auto-Suggestion to end in 00 (Requested by user) */}
                <div className="p-3.5 bg-white rounded-2xl border border-pink-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">
                        Resta para fijar precios redondos ($)
                      </span>
                      <span className="text-[11px] text-stone-500 block">
                        Descontá del costo para fijar un número redondo antes de registrar el pedido.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {suggestedSubtraction00 > 0 && (
                        <button
                          type="button"
                          onClick={() => setSubtractionAmount(suggestedSubtraction00)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                          title="Sugerir resta para que termine en 00"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Redondear a 00 (-{formatCurrency(suggestedSubtraction00)})</span>
                        </button>
                      )}

                      <div className="w-32 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                          $ -
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={subtractionAmount === 0 ? '' : subtractionAmount}
                          onChange={(e) => setSubtractionAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                          placeholder="0"
                          className="w-full pl-8 pr-2 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                    <input
                      type="checkbox"
                      id="roundNumbers"
                      checked={roundToCleanNumbers}
                      onChange={(e) => setRoundToCleanNumbers(e.target.checked)}
                      className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4"
                    />
                    <label htmlFor="roundNumbers" className="text-xs text-stone-700 font-medium">
                      Quitar centavos y redondear a números cerrados (múltiplos de $10)
                    </label>
                  </div>
                </div>

                {/* Promotions toggle in % or $ */}
                <div className="p-3 bg-white rounded-2xl border border-pink-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={promoActive}
                        onChange={(e) => setPromoActive(e.target.checked)}
                        className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4"
                      />
                      <span>Activar Promoción</span>
                    </label>

                    {promoActive && (
                      <div className="flex bg-stone-100 p-0.5 rounded-lg text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setPromoType('percentage')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            promoType === 'percentage'
                              ? 'bg-pink-600 text-white font-bold'
                              : 'text-stone-600'
                          }`}
                        >
                          En Porcentaje (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromoType('fixed')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            promoType === 'fixed'
                              ? 'bg-pink-600 text-white font-bold'
                              : 'text-stone-600'
                          }`}
                        >
                          En Pesos ($)
                        </button>
                      </div>
                    )}
                  </div>

                  {promoActive && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-stone-500 block mb-0.5">
                          {promoType === 'percentage' ? '% de Descuento' : 'Monto en Pesos ($ OFF)'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={
                            promoType === 'percentage'
                              ? (promoDiscountPercent === 0 ? '' : promoDiscountPercent)
                              : (promoDiscountFixed === 0 ? '' : promoDiscountFixed)
                          }
                          placeholder="Monto"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            if (promoType === 'percentage') setPromoDiscountPercent(val);
                            else setPromoDiscountFixed(val);
                          }}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-stone-500 block mb-0.5">
                          Etiqueta de la Promo
                        </label>
                        <input
                          type="text"
                          placeholder={promoType === 'percentage' ? '15% OFF' : '$500 OFF'}
                          value={promoLabel}
                          onChange={(e) => setPromoLabel(e.target.value)}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Result Preview */}
                <div className="p-4 bg-white rounded-2xl border-2 border-pink-300 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-stone-500 block">Costo total calculado:</span>
                    <span className="text-sm font-bold text-stone-700">
                      {formatCurrency(totalCalculatedCost)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-500 block">Precio base redondo:</span>
                    <span className="text-sm font-bold text-stone-700">
                      {formatCurrency(calculatedBasePrice)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-pink-600 font-bold block uppercase tracking-wide">
                      Precio Final al Cliente:
                    </span>
                    <span className="text-2xl font-black font-serif-brand text-pink-700">
                      {formatCurrency(calculatedFinalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Variants / Variables (Placed AL FINAL, after Precio Final) */}
              <div className="p-4 bg-gradient-to-br from-pink-50/70 via-white to-pink-50/40 rounded-3xl border-2 border-pink-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-pink-100">
                  <div>
                    <label className="text-xs font-bold text-pink-900 block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                      <span>Variables / Variantes del Producto (al final)</span>
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Configurá las variables (ej: Tamaño, Hojas, Tapa). Podés autocompletar con el precio final actual ({formatCurrency(calculatedFinalPrice)}) y editarlo a gusto.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-pink-700 bg-pink-100 px-2.5 py-0.5 rounded-full shrink-0 w-fit">
                    {variants.length} variable(s)
                  </span>
                </div>

                {/* Suggestions chips with Delete button 'X' */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-stone-500 font-semibold block">Sugerencias rápidas de variables:</span>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {(data.variantSuggestions || []).map((sug, sugIdx) => (
                      <div
                        key={`${sug}-${sugIdx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-pink-100 text-stone-700 rounded-lg border border-pink-200 shadow-2xs transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setNewVariantName(sug)}
                          className="font-medium hover:text-pink-600 cursor-pointer"
                        >
                          + {sug}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeVariantSuggestion(sug)}
                          title="Eliminar sugerencia"
                          className="text-stone-300 hover:text-red-500 ml-1 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new suggestion */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Añadir nueva sugerencia..."
                      value={newSuggestionInput}
                      onChange={(e) => setNewSuggestionInput(e.target.value)}
                      className="p-1.5 bg-white border border-stone-200 rounded-lg text-xs w-48 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSuggestionInput.trim()) {
                          addVariantSuggestion(newSuggestionInput);
                          setNewSuggestionInput('');
                        }
                      }}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      + Guardar sugerencia
                    </button>
                  </div>
                </div>

                {/* Add / Edit Variant Form */}
                <div className="p-3.5 bg-white rounded-2xl border border-pink-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">
                      {editingVariantIndex !== null ? `Editando Variable #${editingVariantIndex + 1}` : 'Configurar Variable:'}
                    </span>

                    {/* Quick Auto-complete button with current product final price */}
                    <button
                      type="button"
                      onClick={handleAutoSuggestProductPricing}
                      className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Copiar automáticamente el precio final y oferta del producto a los campos de la variable"
                    >
                      <Sparkles className="w-3 h-3 text-pink-600" />
                      <span>Autocompletar con Precio Final ({formatCurrency(calculatedFinalPrice)})</span>
                    </button>
                  </div>

                  {/* Variant Name */}
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Nombre de la Variable (ej: Tamaño, Tipo de Hojas, Acabado, Color)
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre de la variable..."
                      value={newVariantName}
                      onChange={(e) => setNewVariantName(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500 font-semibold"
                    />
                  </div>

                  {/* Options Input with Auto Suggestion & Cloud Material Snapshot */}
                  <div className="p-2.5 bg-stone-50/80 rounded-xl border border-stone-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-stone-700 block">
                        {editingOptionIndex !== null
                          ? `Editando Opción: "${variantOptionsList[editingOptionIndex]?.name || ''}"`
                          : 'Agregar Opción a esta Variable:'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {editingOptionIndex !== null && (
                          <button
                            type="button"
                            onClick={() => calculatorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="Ir al calculador de insumos arriba para ajustar materiales"
                          >
                            <Calculator className="w-3 h-3" />
                            <span>Ver insumos arriba</span>
                          </button>
                        )}
                        {editingOptionIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEditOption}
                            className="px-2 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Cancelar edición
                          </button>
                        )}
                      </div>
                    </div>

                    {editingOptionCloudFeedback && (
                      <div className="p-2 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-900 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Cloud className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="leading-snug">{editingOptionCloudFeedback}</span>
                        </div>
                        {editingOptionIndex !== null && (calculatedBasePrice > 0 || rawBasePriceBeforeSub > 0) && (
                          <button
                            type="button"
                            onClick={applyCalculatorPricingToOptionInputs}
                            className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold shrink-0 inline-flex items-center gap-1 cursor-pointer"
                            title="Aplicar precio y resta calculados ahora con los insumos del calculador"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Aplicar {formatCurrency(calculatedBasePrice)}</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                        <div className="sm:col-span-5">
                          <label className="text-[10px] text-stone-500 block mb-0.5">Nombre Opción (ej: A5)</label>
                          <input
                            type="text"
                            placeholder="Nombre opción..."
                            value={optionNameInput}
                            onChange={(e) => {
                              setOptionNameInput(e.target.value);
                              // Auto-suggest price if empty
                              if (e.target.value.trim() && !optionPriceInput && calculatedFinalPrice > 0) {
                                handleAutoSuggestProductPricing();
                              }
                            }}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-stone-500 block mb-0.5">
                            Total Base ($)
                          </label>
                          <input
                            type="number"
                            placeholder={String(rawBasePriceBeforeSub || calculatedFinalPrice || 0)}
                            value={optionPriceInput}
                            onChange={(e) => setOptionPriceInput(e.target.value)}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-hidden"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-stone-500">Resta propia ($)</label>
                            {currentOptionSuggestedSub00 > 0 && currentOptionSubNum !== currentOptionSuggestedSub00 && (
                              <button
                                type="button"
                                onClick={() => setOptionSubtractionInput(String(currentOptionSuggestedSub00))}
                                className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-bold cursor-pointer"
                                title="Redondear esta opción a 00 sin modificar las demás"
                              >
                                00 (-${currentOptionSuggestedSub00})
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-stone-400">
                              -$
                            </span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={optionSubtractionInput}
                              onChange={(e) => setOptionSubtractionInput(e.target.value)}
                              className="w-full pl-7 pr-2 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-amber-800 outline-hidden focus:border-amber-400"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-end gap-2">
                        <div className="w-24">
                          <label className="text-[10px] text-stone-500 block mb-0.5">Promo %</label>
                          <input
                            type="number"
                            placeholder="%"
                            value={optionPromoPctInput}
                            onChange={(e) => {
                              setOptionPromoPctInput(e.target.value);
                              if (e.target.value) setOptionPromoFixedInput('');
                            }}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden"
                          />
                        </div>

                        <div className="w-28">
                          <label className="text-[10px] text-stone-500 block mb-0.5">Promo $ (fijo)</label>
                          <input
                            type="number"
                            placeholder="$"
                            value={optionPromoFixedInput}
                            onChange={(e) => {
                              setOptionPromoFixedInput(e.target.value);
                              if (e.target.value) setOptionPromoPctInput('');
                            }}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden"
                          />
                        </div>

                        {currentOptionNetBase > 0 && currentOptionSubNum > 0 && (
                          <span className="px-2.5 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] font-bold">
                            Neto c/ resta: {formatCurrency(currentOptionNetBase)}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={handleAddOptionToDraft}
                          className={`ml-auto px-4 py-2 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs ${
                            editingOptionIndex !== null
                              ? 'bg-sky-600 hover:bg-sky-700'
                              : 'bg-pink-600 hover:bg-pink-700'
                          }`}
                        >
                          {editingOptionIndex !== null ? 'Guardar' : '+ Opción'}
                        </button>
                      </div>
                    </div>

                    {/* Compact Cloud Material History Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-stone-200/80">
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveOptionMaterialsToCloud}
                          onChange={(e) => setSaveOptionMaterialsToCloud(e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                        />
                        <Cloud className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>
                          Guardar en la nube los insumos del calculador para esta opción
                          {materialsUsed.length > 0 ? (
                            <strong className="text-sky-700 ml-1">({materialsUsed.length} insumos · {laborMinutes} min)</strong>
                          ) : (
                            <span className="text-stone-400 ml-1">(sin insumos cargados arriba)</span>
                          )}
                        </span>
                      </label>

                      {materialsUsed.length > 0 && (calculatedBasePrice > 0 || rawBasePriceBeforeSub > 0) && (
                        <button
                          type="button"
                          onClick={applyCalculatorPricingToOptionInputs}
                          className="text-[10px] font-bold text-pink-700 hover:text-pink-900 underline cursor-pointer"
                        >
                          Tomar precio calculado ({formatCurrency(calculatedBasePrice)})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Draft options list (compact pills with own subtraction badge, cloud badge + edit button) */}
                  {variantOptionsList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-stone-500 font-semibold">Opciones a guardar:</span>
                      {variantOptionsList.map((opt, idx) => {
                        const cloudMatsCount = opt.materialsUsed?.length || 0;
                        const isEditingThisOption = editingOptionIndex === idx;
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium transition-all ${
                              isEditingThisOption
                                ? 'bg-sky-50 text-sky-900 border-sky-400 ring-1 ring-sky-300'
                                : 'bg-pink-50 text-pink-900 border-pink-200'
                            }`}
                          >
                            <span className="font-bold">{opt.name}</span>
                            {opt.price && opt.price > 0 && (
                              <span className="font-bold text-pink-700 bg-white px-1.5 py-0.5 rounded text-[10px] shadow-2xs">
                                {formatCurrency(opt.price)}
                              </span>
                            )}
                            {opt.subtractionAmount && opt.subtractionAmount > 0 && (
                              <span
                                className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded text-[9px]"
                                title="Resta independiente de esta opción"
                              >
                                Resta -${opt.subtractionAmount.toLocaleString('es-AR')}
                              </span>
                            )}
                            {opt.promoDiscountPercent && opt.promoDiscountPercent > 0 && (
                              <span className="font-bold text-rose-600 bg-rose-50 px-1 rounded text-[9px]">
                                {opt.promoDiscountPercent}% OFF
                              </span>
                            )}
                            {opt.promoDiscountFixed && opt.promoDiscountFixed > 0 && (
                              <span className="font-bold text-rose-600 bg-rose-50 px-1 rounded text-[9px]">
                                -${opt.promoDiscountFixed} OFF
                              </span>
                            )}
                            {opt.finalPrice && opt.finalPrice !== opt.price && (
                              <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                = {formatCurrency(opt.finalPrice)}
                              </span>
                            )}
                            {cloudMatsCount > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[9px] font-bold"
                                title={`${cloudMatsCount} insumo(s) guardados en la nube. Tocá el lápiz para editar y actualizar.`}
                              >
                                <Cloud className="w-2.5 h-2.5" />
                                <span>{cloudMatsCount}</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEditOption(idx)}
                              title="Editar opción y cargar/actualizar sus insumos"
                              className="text-stone-400 hover:text-sky-600 ml-0.5 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveOptionFromDraft(idx)}
                              title="Quitar opción"
                              className="text-stone-400 hover:text-red-500 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}

                      <div className="ml-auto flex items-center gap-2 pt-1 sm:pt-0">
                        {editingVariantIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEditVariant}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveVariant}
                          className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                        >
                          {editingVariantIndex !== null ? 'Guardar Cambios de Variable' : 'Confirmar Variable'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Existing variants on this product (compact cloud indicator, no verbose material dump) */}
                {variants.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-stone-700 block">
                      Variables cargadas en este producto ({variants.length}):
                    </span>
                    {variants.map((v, i) => {
                      const cloudOpts = v.options.filter(
                        (o) => typeof o !== 'string' && o.materialsUsed && o.materialsUsed.length > 0
                      ).length;
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            editingVariantIndex === i
                              ? 'bg-pink-50/70 border-pink-300 ring-1 ring-pink-400'
                              : 'bg-white border-pink-100 shadow-2xs'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-stone-900">{v.name}:</span>
                              {cloudOpts > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-bold"
                                  title="El historial de insumos de estas opciones está guardado en la nube y se sincroniza al editar"
                                >
                                  <Cloud className="w-2.5 h-2.5" />
                                  <span>Nube ({cloudOpts})</span>
                                </span>
                              )}
                            </div>
                            <span className="text-stone-600 block truncate mt-0.5">
                              {v.options
                                .map((opt) =>
                                  typeof opt === 'string'
                                    ? opt
                                    : `${opt.name}${
                                        opt.finalPrice
                                          ? ` (${formatCurrency(opt.finalPrice)})`
                                          : opt.price
                                          ? ` (${formatCurrency(opt.price)})`
                                          : ''
                                      }`
                                )
                                .join(' | ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditVariant(i)}
                              className="p-1.5 text-stone-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar esta variable y sincronizar insumos"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(i)}
                              className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar esta variable"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons: Sticky at bottom */}
              <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex gap-3 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-pink-200 transition-all cursor-pointer"
                >
                  {editingProductId ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories & Subcategories Manager Modal (Requested by user) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-pink-100 space-y-4 max-h-[90vh] flex flex-col">
            <div>
              <h3 className="font-serif-brand font-bold text-lg text-stone-800">
                Categorías y Subcategorías de Productos
              </h3>
              <p className="text-xs text-stone-500">
                Podés crear, renombrar y eliminar categorías y agregar subcategorías a cada una
              </p>
            </div>

            {/* Add Category Form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva categoría principal..."
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCatInput.trim()) {
                    addProductCategory(newCatInput);
                    setNewCatInput('');
                  }
                }}
                className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold"
              >
                + Categoría
              </button>
            </div>

            {/* Categories & Subcategories List */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {(data.categories || []).map((catObj) => (
                <div
                  key={catObj.id || catObj.name}
                  className="p-3 bg-stone-50/80 rounded-2xl border border-stone-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    {editingCatOldName === catObj.name ? (
                      <div className="flex-1 flex gap-1 mr-2">
                        <input
                          type="text"
                          value={editingCatNewName}
                          onChange={(e) => setEditingCatNewName(e.target.value)}
                          className="flex-1 p-1 bg-white border border-pink-300 rounded text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            renameProductCategory(catObj.name, editingCatNewName);
                            setEditingCatOldName(null);
                          }}
                          className="px-2 py-1 bg-pink-600 text-white rounded text-[11px] font-bold"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-sm text-stone-800">{catObj.name}</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setSelectedCatForSub(selectedCatForSub === catObj.name ? null : catObj.name)
                        }
                        className="px-2 py-1 bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <span>Subcategorías ({catObj.subcategories?.length || 0})</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingCatOldName(catObj.name);
                          setEditingCatNewName(catObj.name);
                        }}
                        className="text-stone-400 hover:text-pink-600 p-1"
                        title="Renombrar categoría"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteProductCategory(catObj.name)}
                        className="text-stone-400 hover:text-red-500 p-1"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories panel for this category */}
                  {selectedCatForSub === catObj.name && (
                    <div className="mt-2 pt-2 border-t border-stone-200 pl-3 space-y-2">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Nueva subcategoría..."
                          value={newSubInput}
                          onChange={(e) => setNewSubInput(e.target.value)}
                          className="flex-1 p-1.5 bg-white border border-pink-200 rounded-lg text-xs outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSubInput.trim()) {
                              addSubcategory(catObj.name, newSubInput);
                              setNewSubInput('');
                            }
                          }}
                          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[11px] font-bold"
                        >
                          + Agregar
                        </button>
                      </div>

                      {catObj.subcategories && catObj.subcategories.length > 0 ? (
                        <div className="space-y-1">
                          {catObj.subcategories.map((sub) => (
                            <div
                              key={sub}
                              className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-pink-100 text-stone-700"
                            >
                              {editingSubOldName === sub ? (
                                <div className="flex-1 flex gap-1 mr-2">
                                  <input
                                    type="text"
                                    value={editingSubNewName}
                                    onChange={(e) => setEditingSubNewName(e.target.value)}
                                    className="flex-1 p-1 bg-stone-50 border border-pink-300 rounded text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      renameSubcategory(catObj.name, sub, editingSubNewName);
                                      setEditingSubOldName(null);
                                    }}
                                    className="px-2 py-0.5 bg-pink-600 text-white rounded text-[10px] font-bold"
                                  >
                                    OK
                                  </button>
                                </div>
                              ) : (
                                <span>↳ {sub}</span>
                              )}

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingSubOldName(sub);
                                    setEditingSubNewName(sub);
                                  }}
                                  className="text-stone-400 hover:text-pink-600 p-0.5"
                                  title="Renombrar subcategoría"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteSubcategory(catObj.name, sub)}
                                  className="text-stone-400 hover:text-red-500 p-0.5"
                                  title="Eliminar subcategoría"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400 italic block">
                          No tiene subcategorías aún.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 shrink-0 z-10">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3:4 Image Cropper / Center Modal */}
      {croppingImageIndex !== null && images[croppingImageIndex] && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 p-4 sm:p-5 flex flex-col justify-between max-h-[96vh] space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Crop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Ajustar Portada (Proporción 3:4)</h3>
                  <p className="text-[10px] text-stone-500">Zoom, centrado y recorte exacto</p>
                </div>
              </div>
              <button
                onClick={() => setCroppingImageIndex(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3:4 Visual Preview Frame */}
            <div className="flex justify-center items-center py-1">
              <div className="relative w-48 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-dashed border-pink-400 shadow-md bg-stone-100 flex items-center justify-center select-none">
                <img
                  src={images[croppingImageIndex]}
                  alt=""
                  style={{
                    transform: `scale(${cropZoom}) translate(${cropPanX}%, ${cropPanY}%)`,
                    transition: 'transform 0.05s ease-out',
                  }}
                  className="w-full h-full object-cover pointer-events-none"
                />
                {/* Overlay grid lines */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-pink-500/20 divide-x divide-y divide-pink-500/20" />
              </div>
            </div>

            {/* Sliders for Zoom and Pan */}
            <div className="space-y-2 bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
              <div>
                <div className="flex justify-between font-bold text-[11px] text-stone-700 mb-1">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-pink-600" />
                    <span>Zoom</span>
                  </span>
                  <span>{cropZoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="w-full accent-pink-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-stone-600 mb-0.5">
                    <span>Eje Horizontal (X)</span>
                    <span>{cropPanX > 0 ? `+${cropPanX}` : cropPanX}%</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={cropPanX}
                    onChange={(e) => setCropPanX(parseInt(e.target.value))}
                    className="w-full accent-pink-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-stone-600 mb-0.5">
                    <span>Eje Vertical (Y)</span>
                    <span>{cropPanY > 0 ? `+${cropPanY}` : cropPanY}%</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={cropPanY}
                    onChange={(e) => setCropPanY(parseInt(e.target.value))}
                    className="w-full accent-pink-600 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCropZoom(1);
                  setCropPanX(0);
                  setCropPanY(0);
                }}
                className="text-[10px] text-stone-500 hover:text-stone-800 underline block text-center pt-0.5 cursor-pointer"
              >
                Restablecer a valores iniciales
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1 shrink-0">
              <button
                type="button"
                onClick={() => setCroppingImageIndex(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyCrop34}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Recorte 3:4</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
