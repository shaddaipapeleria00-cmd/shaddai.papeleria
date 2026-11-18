import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductsManager } from './ProductsManager';
import { MaterialsManager } from './MaterialsManager';
import { CostCalculatorView } from './CostCalculatorView';
import { Package, Scissors, Calculator } from 'lucide-react';

export const TallerManager: React.FC = () => {
  const { currentTab, setCurrentTab, data } = useApp();

  // Subtab selection: 'productos' | 'materiales' | 'costos'
  const [subTab, setSubTab] = useState<'productos' | 'materiales' | 'costos'>(() => {
    if (currentTab === 'materiales') return 'materiales';
    if (currentTab === 'costos') return 'costos';
    return 'productos';
  });

  // Sync subTab with external currentTab navigation
  useEffect(() => {
    if (currentTab === 'materiales' || currentTab === 'costos' || currentTab === 'productos') {
      setSubTab(currentTab);
    }
  }, [currentTab]);

  const handleSubTabChange = (tab: 'productos' | 'materiales' | 'costos') => {
    setSubTab(tab);
    setCurrentTab(tab);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Unified Workshop Header & Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-amber-500/10 p-4 sm:p-5 rounded-3xl border border-pink-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h2 className="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900">
                Productos & Insumos del Taller
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Todo en un solo lugar: productos para el catálogo online, control de stock, insumos y cálculo de costos.
            </p>
          </div>

          {/* Subtab Segmented Switcher */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-pink-200 shadow-2xs overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSubTabChange('productos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'productos'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-pink-600 hover:bg-pink-50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Productos & Stock ({data.products.length})</span>
            </button>

            <button
              onClick={() => handleSubTabChange('materiales')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'materiales'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-pink-600 hover:bg-pink-50'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Insumos & Materiales ({data.materials.length})</span>
            </button>

            <button
              onClick={() => handleSubTabChange('costos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'costos'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-pink-600 hover:bg-pink-50'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Calculadora de Costos & Hora</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Workshop Module */}
      <div>
        {subTab === 'productos' && <ProductsManager />}
        {subTab === 'materiales' && <MaterialsManager />}
        {subTab === 'costos' && <CostCalculatorView />}
      </div>
    </div>
  );
};
