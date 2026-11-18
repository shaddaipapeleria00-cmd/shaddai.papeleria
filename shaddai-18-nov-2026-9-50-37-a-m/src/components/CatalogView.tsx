import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { formatCurrency, exportCatalogPDF } from '../utils/exportUtils';
import { getLowestProductPricing } from '../utils/productPricingUtils';
import { openWhatsAppDirect } from '../utils/whatsappUtils';
import { ProductDetailModal } from './ProductDetailModal';
import {
  Search,
  ArrowUpDown,
  FileDown,
  Sparkles,
  ShoppingBag,
  Send,
  Check,
  Tag,
  AlertOctagon,
  Loader2,
  Package,
  Building2,
  Copy,
  Edit2,
  X,
  Save,
  List,
  LayoutGrid,
} from 'lucide-react';

// Format brand title to Title Case so calligraphy cursive ligatures connect seamlessly
const formatBrandTitle = (name: string): string => {
  if (!name) return 'Shaddai';
  const trimmed = name.trim();
  if (trimmed.toUpperCase() === 'SHADDAI') return 'Shaddai';
  if (trimmed.toUpperCase() === 'ZOHAR') return 'Zohar';
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 1) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  return trimmed;
};

export const CatalogView: React.FC = () => {
  const {
    data,
    addToCart,
    isAdmin,
    adminAuthenticated,
    setCurrentTab,
    cart,
    setIsCartOpen,
    updateCatalogSettings,
  } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recientes' | 'az' | 'za' | 'precio_asc' | 'precio_desc' | 'categoria'>('recientes');
  const [filterType, setFilterType] = useState<'all' | 'stock' | 'order'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addedToastId, setAddedToastId] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [compactView, setCompactView] = useState(false);

  // Quick edit modal for hero texts (Admin)
  const [isTextEditModalOpen, setIsTextEditModalOpen] = useState(false);
  const [editAppName, setEditAppName] = useState('');
  const [editAppTagline, setEditAppTagline] = useState('');
  const [editHeaderBadge, setEditHeaderBadge] = useState('');
  const [editWelcomeDesc, setEditWelcomeDesc] = useState('');
  const [editAlias, setEditAlias] = useState('');
  const [editWhatsApp, setEditWhatsApp] = useState('');

  const handleOpenTextEditor = () => {
    setEditAppName(data.catalogSettings.appName);
    setEditAppTagline(data.catalogSettings.appTagline);
    setEditHeaderBadge(data.catalogSettings.headerBadge || 'Hecho con amor, creado con propósito 💖✨');
    setEditWelcomeDesc(data.catalogSettings.welcomeDescription);
    setEditAlias(data.catalogSettings.bankInfo?.alias || '');
    setEditWhatsApp(data.catalogSettings.businessWhatsApp || '');
    setIsTextEditModalOpen(true);
  };

  const handleSaveTextEditor = (e: React.FormEvent) => {
    e.preventDefault();
    updateCatalogSettings({
      appName: editAppName.trim() || 'Shaddai',
      appTagline: editAppTagline.trim(),
      headerBadge: editHeaderBadge.trim(),
      welcomeDescription: editWelcomeDesc.trim(),
      businessWhatsApp: editWhatsApp.trim(),
      bankInfo: {
        ...data.catalogSettings.bankInfo,
        alias: editAlias.trim(),
      },
    });
    setIsTextEditModalOpen(false);
  };

  const handleCopyAlias = () => {
    if (data.catalogSettings.bankInfo?.alias) {
      navigator.clipboard.writeText(data.catalogSettings.bankInfo.alias);
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    }
  };

  const categories = useMemo(() => {
    return ['Todas', ...data.productCategories];
  }, [data.productCategories]);

  // Subcategories for current category
  const currentSubcategories = useMemo(() => {
    if (selectedCategory === 'Todas') return [];
    const catObj = (data.categories || []).find((c) => c.name === selectedCategory);
    return catObj ? catObj.subcategories || [] : [];
  }, [data.categories, selectedCategory]);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    let result = [...data.products];

    // Category
    if (selectedCategory !== 'Todas') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Subcategory
    if (selectedCategory !== 'Todas' && selectedSubcategory !== 'Todas') {
      result = result.filter((p) => p.subcategory === selectedSubcategory);
    }

    // Online Catalog visibility filter for clients
    if (!isAdmin || !adminAuthenticated) {
      result = result.filter((p) => p.visibleInCatalog !== false);
    }

    // Type filter
    if (filterType === 'stock') {
      result = result.filter((p) => p.type === 'stock');
    } else if (filterType === 'order') {
      result = result.filter((p) => p.type === 'order');
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'az') return a.name.localeCompare(b.name, 'es');
      if (sortBy === 'za') return b.name.localeCompare(a.name, 'es');
      if (sortBy === 'precio_asc') return getLowestProductPricing(a).finalPrice - getLowestProductPricing(b).finalPrice;
      if (sortBy === 'precio_desc') return getLowestProductPricing(b).finalPrice - getLowestProductPricing(a).finalPrice;
      if (sortBy === 'categoria') return a.category.localeCompare(b.category, 'es');
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [data.products, selectedCategory, selectedSubcategory, filterType, searchQuery, sortBy, isAdmin, adminAuthenticated]);

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.type === 'stock' && product.stockQuantity <= 0) {
      alert('Este producto no tiene stock disponible.');
      return;
    }
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      return;
    }

    addToCart(product, 1);
    setAddedToastId(product.id);
    setTimeout(() => setAddedToastId(null), 1200);
  };

  const handleWhatsAppInquiry = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const lowestPrice = getLowestProductPricing(product).finalPrice;
    const text = `¡Hola ${formatBrandTitle(data.catalogSettings.appName)}! 💕 Quisiera consultar sobre el producto: *${product.name}* (${formatCurrency(lowestPrice)}).`;
    openWhatsAppDirect(data.catalogSettings.businessWhatsApp, text);
  };

  const handleExportCatalog = async () => {
    try {
      setIsExportingPDF(true);
      await exportCatalogPDF(filteredProducts, data.catalogSettings);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const isSquareBanner = data.catalogSettings.bannerType === 'square';
  const cartItemsCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div className="min-h-screen pb-20">
      {/* Catalog Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-100/60 via-pink-50/40 to-white pt-6 pb-8 border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col ${isSquareBanner ? 'md:flex-row items-center gap-8' : 'gap-5'} items-center`}>
            
            {/* Banner Image Container */}
            {data.catalogSettings.bannerUrl && (
              <div
                className={`relative overflow-hidden rounded-3xl shadow-xl border-4 border-white ${
                  isSquareBanner
                    ? 'w-64 h-64 sm:w-72 sm:h-72 shrink-0'
                    : 'w-full h-44 sm:h-60 md:h-72'
                }`}
              >
                <img
                  src={data.catalogSettings.bannerUrl}
                  alt={`${data.catalogSettings.appName} Banner`}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            )}

            {/* Header Texts */}
            <div className={`text-center ${isSquareBanner ? 'md:text-left flex-1' : 'max-w-3xl mx-auto'} w-full flex flex-col items-center sm:items-center`}>
              {/* Badge & Quick Admin Text Editor */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                  <span>{data.catalogSettings.headerBadge || 'Hecho con amor, creado con propósito 💖✨'}</span>
                </div>

                {isAdmin && adminAuthenticated && (
                  <button
                    onClick={handleOpenTextEditor}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                    title="Editar textos, título y datos de transferencia"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar Textos (Admin)</span>
                  </button>
                )}
              </div>

              {/* Cursive Brand Title matching logo calligraphy script */}
              <h1
                className="font-brand-cursive text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-pink-600 tracking-normal drop-shadow-xs italic select-none leading-none py-1.5 text-center"
                style={{ fontFamily: "'Great Vibes', 'Alex Brush', 'Dancing Script', 'Parisienne', 'Satisfy', cursive" }}
              >
                {formatBrandTitle(data.catalogSettings.appName)}
              </h1>

              {/* App Tagline / Slogan */}
              {data.catalogSettings.appTagline && (
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-pink-800/80 mt-1">
                  {data.catalogSettings.appTagline}
                </p>
              )}

              {/* Welcome Description */}
              <p className="mt-2.5 text-stone-600 text-xs sm:text-sm sm:leading-relaxed max-w-2xl text-center">
                {data.catalogSettings.welcomeDescription}
              </p>

              {/* Quick Customer Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-pink-700 hover:bg-pink-50 border border-pink-200 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-pink-600" />
                  <span>Ver Mi Carrito ({cartItemsCount})</span>
                </button>

                {isAdmin && adminAuthenticated && (
                  <button
                    onClick={() => setCurrentTab('productos')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-stone-600" />
                    <span>Gestionar Productos & Stock</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Filters Bar (No horizontal scrolling on mobile, full responsiveness) */}
      <section className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-pink-100 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5">
          
          {/* Search, Category Dropdown (first), Availability, Sort & Reduced View on same line */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Bar */}
            <div className="relative flex-1 lg:max-w-xs xl:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, descripción o subcategoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-50 hover:bg-stone-100 focus:bg-white border border-stone-200 rounded-xl text-xs sm:text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-hidden transition-all"
              />
            </div>

            {/* Filter Options Row: Category Dropdown FIRST, then Availability, Sort, and Reduced View */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 1. Category Dropdown (First of all options) */}
              <div className="relative shrink-0">
                <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 px-3 py-1.5 rounded-xl text-xs font-bold text-pink-800 shadow-2xs">
                  <Tag className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubcategory('Todas');
                    }}
                    aria-label="Filtrar por categoría"
                    className="bg-transparent outline-hidden cursor-pointer max-w-[160px] sm:max-w-[200px]"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category} className="text-stone-800 bg-white font-semibold">
                        {category === 'Todas' ? 'Categorías: Todas' : category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Availability Toggles */}
              <div className="flex bg-stone-100 p-0.5 rounded-xl text-xs shrink-0">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    filterType === 'all' ? 'bg-white text-stone-800 shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterType('stock')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    filterType === 'stock' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  En Stock
                </button>
                <button
                  onClick={() => setFilterType('order')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    filterType === 'order' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Por Pedido
                </button>
              </div>

              {/* 3. Sort Dropdown */}
              <div className="relative shrink-0">
                <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700">
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent outline-hidden cursor-pointer"
                  >
                    <option value="recientes">Recientes primero</option>
                    <option value="az">De la A a la Z</option>
                    <option value="za">De la Z a la A</option>
                    <option value="precio_asc">Menor precio</option>
                    <option value="precio_desc">Mayor precio</option>
                    <option value="categoria">Por categoría</option>
                  </select>
                </div>
              </div>

              {/* 4. Reduced View Toggle */}
              <button
                type="button"
                onClick={() => setCompactView((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                  compactView
                    ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-200'
                }`}
                title={compactView ? 'Volver a la vista normal con fotos grandes' : 'Ver todos los productos en formato reducido y compacto'}
              >
                {compactView ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                <span>{compactView ? 'Visión Reducida' : 'Visión Reducida'}</span>
              </button>
            </div>
          </div>

          {/* Subcategories Filter Pills (Wrap cleanly without side cutoff) */}
          {currentSubcategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 pl-1">
                Subcategorías:
              </span>
              {['Todas', ...currentSubcategories].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    selectedSubcategory === sub
                      ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {sub.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Edit Texts Modal (Admin) with sticky footer */}
      {isTextEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-pink-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-stone-50/70 shrink-0">
              <div>
                <h3 className="font-serif-brand font-bold text-lg text-stone-800">
                  Editar Textos & Datos del Catálogo
                </h3>
                <p className="text-xs text-stone-500">
                  Modificaciones instantáneas sincronizadas en la nube para todos los dispositivos
                </p>
              </div>
              <button
                onClick={() => setIsTextEditModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTextEditor} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Nombre de la Marca / App *
                  </label>
                  <input
                    type="text"
                    required
                    value={editAppName}
                    onChange={(e) => setEditAppName(e.target.value)}
                    placeholder="Ej: Zohar o Shaddai"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    Se mostrará en letra cursiva elegante coincidiendo con el logo
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Eslogan o Subtítulo
                  </label>
                  <input
                    type="text"
                    value={editAppTagline}
                    onChange={(e) => setEditAppTagline(e.target.value)}
                    placeholder="Ej: CREATIVIDAD CON PROPÓSITO o Catálogo Online"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Insignia Superior (Badge)
                  </label>
                  <input
                    type="text"
                    value={editHeaderBadge}
                    onChange={(e) => setEditHeaderBadge(e.target.value)}
                    placeholder="Ej: Hecho con amor, creado con propósito 💖✨"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Texto de Bienvenida / Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={editWelcomeDesc}
                    onChange={(e) => setEditWelcomeDesc(e.target.value)}
                    placeholder="Descripción que ven los clientes en el inicio..."
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden leading-relaxed resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Alias de Transferencia Bancaria
                    </label>
                    <input
                      type="text"
                      value={editAlias}
                      onChange={(e) => setEditAlias(e.target.value)}
                      placeholder="Ej: zohar.creaciones"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      WhatsApp Comercial
                    </label>
                    <input
                      type="text"
                      value={editWhatsApp}
                      onChange={(e) => setEditWhatsApp(e.target.value)}
                      placeholder="Ej: 5493402509524"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky bottom buttons */}
              <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex gap-2 shrink-0 z-10 mt-3">
                <button
                  type="button"
                  onClick={() => setIsTextEditModalOpen(false)}
                  className="flex-1 py-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Textos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs sm:text-sm font-semibold text-stone-500">
            Mostrando <span className="text-pink-600 font-bold">{filteredProducts.length}</span> producto(s)
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-pink-200 p-8">
            <div className="w-16 h-16 bg-pink-50 text-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="font-serif-brand text-lg font-bold text-stone-800">
              No encontramos productos con ese filtro
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
              Probá seleccionando otra categoría o borrando el término de búsqueda.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Todas');
                setSearchQuery('');
                setFilterType('all');
              }}
              className="mt-4 px-4 py-2 bg-pink-50 text-pink-700 hover:bg-pink-100 rounded-xl text-xs font-semibold transition-colors"
            >
              Restablecer filtros
            </button>
          </div>
        ) : compactView ? (
          /* Reduced / Compact View of all products */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((product) => {
              const primaryImage =
                product.images && product.images.length > 0
                  ? product.images[0]
                  : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';

              const isOutOfStock = product.type === 'stock' && product.stockQuantity <= 0;
              const pricing = getLowestProductPricing(product);

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`group bg-white rounded-2xl border p-2.5 sm:p-3 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                    isOutOfStock ? 'border-red-100 opacity-90' : 'border-pink-100/90 hover:border-pink-300'
                  }`}
                >
                  {/* Compact 3:4 Thumbnail */}
                  <div className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-100">
                    <img
                      src={primaryImage}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* Compact Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider truncate max-w-[120px]">
                        {product.category}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">
                          Agotado
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            product.type === 'stock'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {product.type === 'stock' ? 'En Stock' : 'Por Pedido'}
                        </span>
                      )}
                      {product.variants && product.variants.length > 0 && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                          {product.variants.length} var.
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-stone-800 line-clamp-1 group-hover:text-pink-600 transition-colors">
                      {product.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-0.5">
                      {pricing.hasRange && (
                        <span className="text-[9px] font-bold uppercase text-stone-400">Desde</span>
                      )}
                      <div className="inline-flex items-start">
                        <span className="text-base sm:text-lg font-extrabold text-pink-800 font-serif-brand leading-none">
                          {formatCurrency(pricing.finalPrice)}
                        </span>
                        {pricing.hasPromo && pricing.discountBadge && (
                          <sup className="ml-1 -mt-1 inline-flex items-center px-1 py-0.5 rounded bg-rose-600 text-white text-[8px] font-black leading-none whitespace-nowrap">
                            {pricing.discountBadge}
                          </sup>
                        )}
                      </div>
                      {pricing.hasPromo && pricing.basePrice > pricing.finalPrice && (
                        <span className="text-[11px] text-stone-400 line-through leading-none">
                          {formatCurrency(pricing.basePrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compact Quick Actions */}
                  {!isOutOfStock && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(product, e)}
                        className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl transition-colors cursor-pointer"
                        title="Agregar al carrito"
                      >
                        {addedToastId === product.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ShoppingBag className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleWhatsAppInquiry(product, e)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors cursor-pointer"
                        title="Consultar por WhatsApp"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const primaryImage =
                product.images && product.images.length > 0
                  ? product.images[0]
                  : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';

              const isOutOfStock = product.type === 'stock' && product.stockQuantity <= 0;
              const pricing = getLowestProductPricing(product);

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`group bg-white rounded-3xl border shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1 ${
                    isOutOfStock ? 'border-red-100 opacity-90' : 'border-pink-100/80'
                  }`}
                >
                  {/* Image Container (3:4 portrait view) */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100/70 flex items-center justify-center">
                    <img
                      src={primaryImage}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Stock badge */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wide bg-red-600 text-white flex items-center gap-1">
                          <AlertOctagon className="w-2.5 h-2.5" />
                          Agotado
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wide ${
                            product.type === 'stock'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {product.type === 'stock' ? 'En Stock' : 'Por Pedido'}
                        </span>
                      )}
                    </div>

                    {/* Variants pill */}
                    {product.variants && product.variants.length > 0 && (
                      <span className="absolute bottom-2 left-2 bg-stone-900/70 text-white text-[9px] px-2 py-0.5 rounded-md font-medium">
                        {product.variants.length} variante(s)
                      </span>
                    )}

                    {product.images && product.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-medium">
                        {product.images.length} fotos
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-pink-600 uppercase tracking-wider block">
                        {product.category}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-stone-800 line-clamp-2 mt-0.5 group-hover:text-pink-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
                        {product.description}
                      </p>
                    </div>

                    {/* Pricing: lowest variant price first + tiny superscript discount badge next to price */}
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {pricing.hasRange && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                            Desde
                          </span>
                        )}
                        <div className="inline-flex items-start">
                          <span className="text-xl font-extrabold text-pink-800 font-serif-brand leading-none">
                            {formatCurrency(pricing.finalPrice)}
                          </span>
                          {pricing.hasPromo && pricing.discountBadge && (
                            <sup className="ml-1 -mt-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black leading-none tracking-tight shadow-2xs whitespace-nowrap">
                              {pricing.discountBadge}
                            </sup>
                          )}
                        </div>
                        {pricing.hasPromo && pricing.basePrice > pricing.finalPrice && (
                          <span className="text-xs text-stone-400 line-through leading-none">
                            {formatCurrency(pricing.basePrice)}
                          </span>
                        )}
                      </div>

                      {/* Action buttons on card */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-pink-50">
                        {isOutOfStock ? (
                          <div className="col-span-2 py-2 text-center text-xs font-bold text-red-600 bg-red-50 rounded-xl">
                            Sin Stock Disponible
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => handleQuickAdd(product, e)}
                              className="py-2 px-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              {addedToastId === product.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-[11px] text-emerald-700">¡Agregado!</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Al Carrito</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={(e) => handleWhatsAppInquiry(product, e)}
                              className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                              title="Consultar por WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};
