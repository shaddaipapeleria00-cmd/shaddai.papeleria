import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Material } from '../types';
import { formatCurrency, formatDate } from '../utils/exportUtils';
import {
  Scissors,
  Plus,
  Search,
  ArrowUpDown,
  Edit2,
  Trash2,
  Layers,
  X,
  Package,
  AlertTriangle,
  LayoutGrid,
  List,
} from 'lucide-react';

export const MaterialsManager: React.FC = () => {
  const {
    data,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addMaterialCategory,
    renameMaterialCategory,
    deleteMaterialCategory,
    setCurrentTab,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  // View mode toggle requested by user:
  // "que también puedan verlas de manera agrupadas por categorías o de la A a la Z"
  const [viewGrouping, setViewGrouping] = useState<'az' | 'categoria'>('az');
  const [sortOrder, setSortOrder] = useState<'az' | 'za'>('az');

  // Material Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  // Category Modal (with edit/rename)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatOld, setEditingCatOld] = useState<string | null>(null);
  const [editingCatNew, setEditingCatNew] = useState('');

  // Form states with Wholesale pricing
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState<Material['unit']>('unidad');
  
  const [isWholesale, setIsWholesale] = useState(false);
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleUnits, setWholesaleUnits] = useState('100');
  const [unitCost, setUnitCost] = useState('');

  const [currentStock, setCurrentStock] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  // Handle wholesale auto calculation of unit cost
  const handleWholesalePriceChange = (val: string) => {
    setWholesalePrice(val);
    const p = parseFloat(val);
    const u = parseFloat(wholesaleUnits);
    if (!isNaN(p) && !isNaN(u) && u > 0) {
      setUnitCost((p / u).toFixed(2));
    }
  };

  const handleWholesaleUnitsChange = (val: string) => {
    setWholesaleUnits(val);
    const p = parseFloat(wholesalePrice);
    const u = parseFloat(val);
    if (!isNaN(p) && !isNaN(u) && u > 0) {
      setUnitCost((p / u).toFixed(2));
    }
  };

  // Filtered & Sorted Materials
  const filteredMaterials = useMemo(() => {
    let list = [...data.materials];

    if (selectedCategory !== 'Todas') {
      list = list.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.supplier && m.supplier.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortOrder === 'az') return a.name.localeCompare(b.name, 'es');
      return b.name.localeCompare(a.name, 'es');
    });

    return list;
  }, [data.materials, selectedCategory, searchQuery, sortOrder]);

  // Grouped by category
  const groupedByCategory = useMemo(() => {
    const map: Record<string, Material[]> = {};
    filteredMaterials.forEach((m) => {
      if (!map[m.category]) map[m.category] = [];
      map[m.category].push(m);
    });
    return map;
  }, [filteredMaterials]);

  const handleOpenCreate = () => {
    setEditingMaterialId(null);
    setName('');
    setCategory(data.materialCategories[0] || 'Insumos Generales');
    setUnit('unidad');
    setIsWholesale(false);
    setWholesalePrice('');
    setWholesaleUnits('100');
    setUnitCost('');
    setCurrentStock('100');
    setSupplier('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (material: Material) => {
    setEditingMaterialId(material.id);
    setName(material.name);
    setCategory(material.category);
    setUnit(material.unit);
    setIsWholesale(!!material.wholesalePrice);
    setWholesalePrice(material.wholesalePrice ? String(material.wholesalePrice) : '');
    setWholesaleUnits(material.wholesaleUnits ? String(material.wholesaleUnits) : '100');
    setUnitCost(String(material.unitCost));
    setCurrentStock(String(material.currentStock));
    setSupplier(material.supplier || '');
    setNotes(material.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Ingresá el nombre del material.');
      return;
    }

    const payload = {
      name: name.trim(),
      category: category || data.materialCategories[0] || 'General',
      unit,
      wholesalePrice: isWholesale ? parseFloat(wholesalePrice) || undefined : undefined,
      wholesaleUnits: isWholesale ? parseFloat(wholesaleUnits) || undefined : undefined,
      unitCost: parseFloat(unitCost) || 0,
      currentStock: parseFloat(currentStock) || 0,
      supplier: supplier.trim(),
      notes: notes.trim() || undefined,
    };

    if (editingMaterialId) {
      updateMaterial(editingMaterialId, payload);
    } else {
      addMaterial(payload);
    }

    setIsModalOpen(false);
  };

  const handleStockQuickAdjust = (materialId: string, current: number, delta: number) => {
    const updated = Math.max(0, current + delta);
    updateMaterial(materialId, { currentStock: updated });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900">
            Insumos y Materiales
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Precios mayoristas y unitarios. Al modificar un costo, se actualizan automáticamente todos los productos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switch between Calculadora and Insumos */}
          <div className="flex bg-stone-100 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setCurrentTab('costos')}
              className="px-3.5 py-1.5 text-stone-600 hover:text-stone-900 rounded-xl transition-colors"
            >
              Calculadora
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('materiales')}
              className="px-3.5 py-1.5 bg-pink-600 text-white rounded-xl shadow-xs"
            >
              Insumos & Materiales
            </button>
          </div>

          {/* Toggle View: A to Z vs Grouped by Category */}
          <div className="flex bg-stone-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewGrouping('az')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                viewGrouping === 'az'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>De la A a la Z</span>
            </button>
            <button
              onClick={() => setViewGrouping('categoria')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                viewGrouping === 'categoria'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Por Categorías</span>
            </button>
          </div>

          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-pink-600" />
            <span>Editar Categorías</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-pink-200 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Material</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-pink-100 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar insumos por nombre o proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-pink-500"
          />
        </div>

        {/* Sort A-Z */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'az' ? 'za' : 'az')}
            className="flex items-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-700 border border-pink-200 rounded-xl text-xs font-semibold hover:bg-pink-100 transition-colors"
            title="Alternar orden"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'az' ? 'A ➔ Z' : 'Z ➔ A'}</span>
          </button>
        </div>

        {/* Categories pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['Todas', ...data.materialCategories].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
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

      {/* Materials Render: Either Grouped by Category OR Flat A-Z Table */}
      {viewGrouping === 'categoria' ? (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([catName, matList]) => (
            <div key={catName} className="bg-white rounded-3xl border border-pink-100 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-pink-50">
                <h3 className="font-serif-brand font-bold text-base text-pink-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                  {catName}
                </h3>
                <span className="text-xs text-stone-400 font-semibold">{matList.length} insumo(s)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {matList.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col justify-between space-y-2 hover:border-pink-200 transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-stone-800 text-xs">{mat.name}</h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-serif-brand font-bold text-pink-700 text-sm">
                          {formatCurrency(mat.unitCost)}
                        </span>
                        <span className="text-[10px] text-stone-400">/ {mat.unit}</span>
                      </div>
                      {mat.wholesalePrice && mat.wholesaleUnits && (
                        <p className="text-[10px] text-stone-500 mt-0.5">
                          Mayorista: {formatCurrency(mat.wholesalePrice)} x {mat.wholesaleUnits} un.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
                      <span className="text-stone-500 text-[11px]">
                        Stock: <span className="font-bold text-stone-800">{mat.currentStock}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(mat)}
                          className="p-1 text-stone-400 hover:text-pink-600 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar "${mat.name}"?`)) deleteMaterial(mat.id);
                          }}
                          className="p-1 text-stone-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat A-Z Table */
        <div className="bg-white rounded-3xl border border-pink-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-rose-50/70 border-b border-pink-100 text-stone-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Insumo (A-Z)</th>
                  <th className="py-3 px-4 font-bold">Categoría</th>
                  <th className="py-3 px-4 font-bold">Costo Unitario</th>
                  <th className="py-3 px-4 font-bold">Precio Mayorista</th>
                  <th className="py-3 px-4 font-bold">Stock Actual</th>
                  <th className="py-3 px-4 font-bold">Proveedor</th>
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-800 text-sm block">{mat.name}</span>
                      {mat.notes && (
                        <span className="text-[11px] text-stone-400 italic block">{mat.notes}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md font-medium">
                        {mat.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-serif-brand font-bold text-stone-800 text-sm">
                        {formatCurrency(mat.unitCost)}
                      </span>
                      <span className="text-stone-400 text-[10px] ml-1">/ {mat.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {mat.wholesalePrice && mat.wholesaleUnits ? (
                        <div>
                          <span className="font-bold text-stone-700">{formatCurrency(mat.wholesalePrice)}</span>
                          <span className="text-[10px] text-stone-400 block">x {mat.wholesaleUnits} un.</span>
                        </div>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            mat.currentStock < 10 ? 'text-amber-600' : 'text-stone-700'
                          }`}
                        >
                          {mat.currentStock} {mat.unit}s
                        </span>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleStockQuickAdjust(mat.id, mat.currentStock, -1)}
                            className="w-5 h-5 bg-stone-100 hover:bg-stone-200 rounded flex items-center justify-center font-bold text-stone-600"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleStockQuickAdjust(mat.id, mat.currentStock, 1)}
                            className="w-5 h-5 bg-stone-100 hover:bg-stone-200 rounded flex items-center justify-center font-bold text-stone-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600">{mat.supplier || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(mat)}
                          className="p-1.5 text-stone-500 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar insumo "${mat.name}"?`)) {
                              deleteMaterial(mat.id);
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-100 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-pink-100 space-y-4 max-h-[92vh] overflow-y-auto flex flex-col justify-between">
            <h3 className="font-serif-brand font-bold text-xl text-stone-800">
              {editingMaterialId ? 'Editar Insumo' : 'Nuevo Insumo / Material'}
            </h3>

            <form onSubmit={handleSaveMaterial} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Nombre del Insumo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Papel Chambril 90gr A4"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  >
                    {data.materialCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Unidad de Medida
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="hoja">Hoja</option>
                    <option value="pliego">Pliego</option>
                    <option value="metro">Metro</option>
                    <option value="bobina">Bobina</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="gr">Gramo (gr)</option>
                    <option value="pack">Pack / Paquete</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Wholesale mode toggle (Requested by user) */}
              <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-pink-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWholesale}
                      onChange={(e) => setIsWholesale(e.target.checked)}
                      className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4"
                    />
                    <span>Compro por bulto / paquete mayorista</span>
                  </label>
                  {isWholesale && (
                    <span className="text-[10px] text-pink-700 font-semibold">
                      Calcula costo unitario automáticamente
                    </span>
                  )}
                </div>

                {isWholesale && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-0.5">
                        Precio pagado por bulto ($)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ej: 9000"
                        value={wholesalePrice}
                        onChange={(e) => handleWholesalePriceChange(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-0.5">
                        Unidades que trae el bulto
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 500"
                        value={wholesaleUnits}
                        onChange={(e) => handleWholesaleUnitsChange(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Costo Unitario Final ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ej: 18.50"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500 font-semibold"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    Impacta en todos los productos calculados
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Stock Disponible
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ej: 500"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Proveedor
                </label>
                <input
                  type="text"
                  placeholder="Ej: Papelera Central"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Notas / Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Ej: Rinde 4 tapas por pliego..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                />
              </div>

              <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 transition-all cursor-pointer"
                >
                  Guardar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Categories Modal (with Rename capability) */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-pink-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif-brand font-bold text-lg text-stone-800">
              Categorías de Insumos y Materiales
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva categoría..."
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCatInput.trim()) {
                    addMaterialCategory(newCatInput);
                    setNewCatInput('');
                  }
                }}
                className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold"
              >
                Agregar
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {data.materialCategories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700"
                >
                  {editingCatOld === cat ? (
                    <div className="flex-1 flex gap-1 mr-2">
                      <input
                        type="text"
                        value={editingCatNew}
                        onChange={(e) => setEditingCatNew(e.target.value)}
                        className="flex-1 p-1 bg-white border border-pink-300 rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          renameMaterialCategory(cat, editingCatNew);
                          setEditingCatOld(null);
                        }}
                        className="px-2 py-1 bg-pink-600 text-white rounded text-[11px] font-bold"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <span>{cat}</span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCatOld(cat);
                        setEditingCatNew(cat);
                      }}
                      className="text-stone-400 hover:text-pink-600 p-1"
                      title="Editar nombre"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMaterialCategory(cat)}
                      className="text-stone-400 hover:text-red-500 p-1"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 shrink-0 z-10">
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
