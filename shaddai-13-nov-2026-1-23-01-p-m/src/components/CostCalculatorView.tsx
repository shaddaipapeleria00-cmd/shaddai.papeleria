import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/exportUtils';
import { InvisibleExpense } from '../types';
import {
  Calculator,
  Clock,
  Zap,
  Plus,
  Trash2,
  TrendingUp,
  Coins,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  Lightbulb,
  Sparkles,
} from 'lucide-react';

export const CostCalculatorView: React.FC = () => {
  const { data, updateCostSettings, setGlobalHourlyRate, setCurrentTab } = useApp();
  const { costSettings } = data;

  // Local state for labor calculation
  const [salary, setSalary] = useState(costSettings.targetMonthlySalary);
  const [days, setDays] = useState(costSettings.workingDaysPerMonth);
  const [hoursPerDay, setHoursPerDay] = useState(costSettings.workingHoursPerDay);

  // Directly set specific hourly rate (Requested by user: "tener un lugar para poner yo específicamente el precio de la hora de trabajo que quiero tener y que también esa, si yo la modifico, se actualice automáticamente en todos los productos ya calculados")
  const [manualHourlyRate, setManualHourlyRate] = useState(
    costSettings.calculatedHourlyRate || 3400
  );

  // Invisible expense input
  const [newExpName, setNewExpName] = useState('');
  const [newExpCost, setNewExpCost] = useState('');
  const [newExpCat, setNewExpCat] = useState<InvisibleExpense['category']>('servicios');

  // Interactive Simulator
  const [simMaterials, setSimMaterials] = useState(2500);
  const [simHours, setSimHours] = useState(0.75);
  const [simMargin, setSimMargin] = useState(50);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Calculations
  const totalMonthlyHours = Math.max(1, days * hoursPerDay);
  const calculatedHourlyRateFromSalary = Math.round(salary / totalMonthlyHours);

  const totalInvisibleMonthly = costSettings.invisibleExpenses.reduce(
    (acc, item) => acc + item.monthlyCost,
    0
  );
  const overheadPerHour = Math.round(totalInvisibleMonthly / totalMonthlyHours);

  // Apply directly specified hourly rate across all products
  const handleApplyManualHourlyRate = () => {
    const rateNum = Number(manualHourlyRate);
    if (isNaN(rateNum) || rateNum <= 0) return;
    setGlobalHourlyRate(rateNum);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Calculate from salary and apply
  const handleApplyCalculatedHourlyRate = () => {
    setManualHourlyRate(calculatedHourlyRateFromSalary);
    updateCostSettings({
      targetMonthlySalary: salary,
      workingDaysPerMonth: days,
      workingHoursPerDay: hoursPerDay,
      calculatedHourlyRate: calculatedHourlyRateFromSalary,
      calculatedOverheadPerHour: overheadPerHour,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpName.trim() || !newExpCost) return;

    const newExp: InvisibleExpense = {
      id: `inv-${Date.now()}`,
      name: newExpName.trim(),
      monthlyCost: parseFloat(newExpCost) || 0,
      category: newExpCat,
    };

    const updatedExpenses = [...costSettings.invisibleExpenses, newExp];
    const newTotalOverhead = updatedExpenses.reduce((acc, it) => acc + it.monthlyCost, 0);

    updateCostSettings({
      invisibleExpenses: updatedExpenses,
      calculatedOverheadPerHour: Math.round(newTotalOverhead / totalMonthlyHours),
    });

    setNewExpName('');
    setNewExpCost('');
  };

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = costSettings.invisibleExpenses.filter((it) => it.id !== id);
    const newTotalOverhead = updatedExpenses.reduce((acc, it) => acc + it.monthlyCost, 0);

    updateCostSettings({
      invisibleExpenses: updatedExpenses,
      calculatedOverheadPerHour: Math.round(newTotalOverhead / totalMonthlyHours),
    });
  };

  // Simulator calculations using active hourly rate
  const activeRate = costSettings.calculatedHourlyRate || 3400;
  const simLaborCost = Math.round(simHours * activeRate);
  const simOverheadCost = Math.round(simHours * overheadPerHour);
  const simTotalCost = simMaterials + simLaborCost + simOverheadCost;
  const simRecommendedPrice = Math.round((simTotalCost * (1 + simMargin / 100)) / 10) * 10;
  const simNetProfit = simRecommendedPrice - simTotalCost;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900">
            Calculadora de Costos & Gastos Invisibles
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Al modificar el precio de la hora de trabajo o de los insumos, todos los productos se recalculan automáticamente
          </p>
        </div>

        <div className="flex bg-stone-100 p-1 rounded-2xl text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setCurrentTab('costos')}
            className="px-4 py-2 bg-pink-600 text-white rounded-xl shadow-xs"
          >
            Calculadora
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('materiales')}
            className="px-4 py-2 text-stone-600 hover:text-stone-900 rounded-xl transition-colors"
          >
            Insumos & Materiales
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>¡Hora de trabajo actualizada! Todos los productos de la tienda han sido recalculados de forma instantánea.</span>
        </div>
      )}

      {/* Direct Hourly Rate Setter Banner (Requested by user) */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 p-6 rounded-3xl text-white shadow-lg shadow-pink-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-pink-100 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Precio Fijo de la Hora de Trabajo Activo</span>
          </div>
          <h3 className="font-serif-brand text-2xl sm:text-3xl font-extrabold">
            {formatCurrency(costSettings.calculatedHourlyRate)} / hora
          </h3>
          <p className="text-xs text-pink-100 max-w-xl">
            Podés escribir acá el monto exacto por hora que querés tener. Al guardarlo, se impactará en todos los productos calculados del catálogo.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-xs border border-white/20">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-200 font-bold text-sm">$</span>
            <input
              type="number"
              min="100"
              value={manualHourlyRate}
              onChange={(e) => setManualHourlyRate(Number(e.target.value))}
              placeholder="Ej: 3500"
              className="w-36 pl-8 pr-3 py-2.5 bg-white text-stone-800 font-bold rounded-xl text-sm outline-hidden shadow-xs"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyManualHourlyRate}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs shadow-md transition-all whitespace-nowrap"
          >
            Actualizar Todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. Labor Hourly Rate Formula Calculator */}
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-800">
                1. Calcular Hora según Sueldo Deseado
              </h3>
              <p className="text-xs text-stone-500">
                Calculá cuánto debería valer tu hora en base a tu meta de ingresos mensual
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Sueldo mensual deseado ($ ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold focus:border-pink-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Días trabajados por mes
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold focus:border-pink-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Horas productivas por día
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold focus:border-pink-500 outline-hidden"
                />
              </div>
            </div>

            <div className="p-4 bg-rose-50/60 rounded-2xl border border-pink-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 block">Horas mensuales:</span>
                <span className="text-sm font-bold text-stone-700">{totalMonthlyHours} horas</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-pink-700 font-bold block uppercase tracking-wide">
                  Valor sugerido:
                </span>
                <span className="text-2xl font-black font-serif-brand text-pink-800">
                  {formatCurrency(calculatedHourlyRateFromSalary)}
                </span>
              </div>
            </div>

            <button
              onClick={handleApplyCalculatedHourlyRate}
              className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              Aplicar este valor ({formatCurrency(calculatedHourlyRateFromSalary)}) a la Tienda
            </button>
          </div>
        </div>

        {/* 2. Invisible Expenses (Gastos Invisibles) */}
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-800">
                2. Gastos Invisibles & Fijos del Taller
              </h3>
              <p className="text-xs text-stone-500">
                Luz, alquiler, internet, amortización de plotters y servicios
              </p>
            </div>
          </div>

          <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Concepto (ej: Luz, Alquiler, Internet)..."
              value={newExpName}
              onChange={(e) => setNewExpName(e.target.value)}
              className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
            />
            <input
              type="number"
              placeholder="Costo mensual $"
              value={newExpCost}
              onChange={(e) => setNewExpCost(e.target.value)}
              className="w-32 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              Agregar
            </button>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {costSettings.invisibleExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="font-medium">{exp.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold font-serif-brand">
                    {formatCurrency(exp.monthlyCost)}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="text-stone-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-800 font-bold block">
                Total Gastos Invisibles Mensuales:
              </span>
              <span className="text-xl font-bold font-serif-brand text-stone-800">
                {formatCurrency(totalInvisibleMonthly)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-500 block">Costo invisible por hora:</span>
              <span className="text-base font-bold text-amber-900">
                {formatCurrency(overheadPerHour)}/hora
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Pricing Simulator */}
      <div className="bg-gradient-to-br from-rose-50/80 via-white to-pink-50/80 p-6 sm:p-8 rounded-3xl border border-pink-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-brand font-bold text-xl text-stone-900">
              3. Simulador de Precio con Costos Activos
            </h3>
            <p className="text-xs text-stone-500">
              Usa la hora de trabajo activa ({formatCurrency(activeRate)}/h) y el aporte de gastos invisibles
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-stone-700">
              <span>Costo de Insumos:</span>
              <span className="text-pink-700">{formatCurrency(simMaterials)}</span>
            </div>
            <input
              type="range"
              min="200"
              max="20000"
              step="100"
              value={simMaterials}
              onChange={(e) => setSimMaterials(Number(e.target.value))}
              className="w-full accent-pink-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-stone-700">
              <span>Tiempo de armado:</span>
              <span className="text-pink-700">{simHours} hs ({Math.round(simHours * 60)} min)</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={simHours}
              onChange={(e) => setSimHours(Number(e.target.value))}
              className="w-full accent-pink-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-stone-700">
              <span>Margen pretendido:</span>
              <span className="text-pink-700">{simMargin}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={simMargin}
              onChange={(e) => setSimMargin(Number(e.target.value))}
              className="w-full accent-pink-600"
            />
          </div>
        </div>

        {/* Simulator Results */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-pink-100">
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
            <span className="text-[11px] text-stone-400 block">Mano de Obra ({simHours}h)</span>
            <span className="text-sm font-bold text-stone-700">{formatCurrency(simLaborCost)}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
            <span className="text-[11px] text-stone-400 block">Gastos Invisibles</span>
            <span className="text-sm font-bold text-stone-700">{formatCurrency(simOverheadCost)}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-pink-200">
            <span className="text-[11px] text-pink-700 font-bold block">Costo Total Real</span>
            <span className="text-base font-extrabold text-stone-900">{formatCurrency(simTotalCost)}</span>
          </div>

          <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-3.5 rounded-2xl text-white shadow-md shadow-pink-200">
            <span className="text-[11px] text-pink-100 font-bold block">Precio de Venta Sugerido</span>
            <span className="text-xl font-black font-serif-brand">{formatCurrency(simRecommendedPrice)}</span>
            <span className="text-[10px] text-pink-100 block mt-0.5">
              Ganancia neta: {formatCurrency(simNetProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
