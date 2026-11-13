import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import {
  formatCurrency,
  formatDate,
  exportFinancePDF,
  exportTransactionsCSV,
} from '../utils/exportUtils';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  FileDown,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  PieChart,
  BarChart3,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';

export const FinancesView: React.FC = () => {
  const { data, addTransaction, updateTransaction, deleteTransaction } = useApp();

  const [viewMode, setViewMode] = useState<'mes' | 'dia' | 'anio' | 'flujo'>('mes');
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string>(currentDate.toISOString().slice(0, 10));

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<TransactionType>('egreso');
  const [txDate, setTxDate] = useState(currentDate.toISOString().slice(0, 10));
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Compra insumos');
  const [txDescription, setTxDescription] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>('transferencia');

  // Transaction Filters (Requested by user: "opción de elegir ver solamente los ingresos o los egresos. También debo poder filtrarlos por texto")
  const [searchTx, setSearchTx] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'ingreso' | 'egreso'>('todos');
  const [ledgerDisplayMode, setLedgerDisplayMode] = useState<'tarjetas' | 'tabla'>('tarjetas');

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // Month-by-month cashflow with previous month rollover
  const annualCashFlow = useMemo(() => {
    let runningBalance = 0;
    const monthsData = [];

    const yearTx = data.transactions
      .filter((t) => t.date.startsWith(String(selectedYear)))
      .sort((a, b) => a.date.localeCompare(b.date));

    const prevYearsTx = data.transactions.filter(
      (t) => parseInt(t.date.slice(0, 4)) < selectedYear
    );
    prevYearsTx.forEach((t) => {
      if (t.type === 'ingreso') runningBalance += t.amount;
      else runningBalance -= t.amount;
    });

    for (let m = 1; m <= 12; m++) {
      const monthPrefix = `${selectedYear}-${String(m).padStart(2, '0')}`;
      const mTx = yearTx.filter((t) => t.date.startsWith(monthPrefix));

      const income = mTx
        .filter((t) => t.type === 'ingreso')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = mTx
        .filter((t) => t.type === 'egreso')
        .reduce((sum, t) => sum + t.amount, 0);
      const net = income - expenses;
      const opening = runningBalance;
      const closing = opening + net;
      runningBalance = closing;

      monthsData.push({
        monthNumber: m,
        monthName: monthNames[m - 1],
        openingBalance: opening,
        income,
        expenses,
        netProfit: net,
        closingBalance: closing,
        txCount: mTx.length,
      });
    }

    return monthsData;
  }, [data.transactions, selectedYear]);

  const currentMonthData = useMemo(() => {
    return (
      annualCashFlow.find((m) => m.monthNumber === selectedMonth) || {
        openingBalance: 0,
        income: 0,
        expenses: 0,
        netProfit: 0,
        closingBalance: 0,
      }
    );
  }, [annualCashFlow, selectedMonth]);

  // Visible transactions
  const visibleTransactions = useMemo(() => {
    let list = [...data.transactions];

    if (viewMode === 'mes') {
      const prefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      list = list.filter((t) => t.date.startsWith(prefix));
    } else if (viewMode === 'dia') {
      list = list.filter((t) => t.date === selectedDay);
    } else if (viewMode === 'anio') {
      list = list.filter((t) => t.date.startsWith(String(selectedYear)));
    }

    if (typeFilter !== 'todos') {
      list = list.filter((t) => t.type === typeFilter);
    }

    if (searchTx.trim()) {
      const q = searchTx.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [data.transactions, viewMode, selectedYear, selectedMonth, selectedDay, typeFilter, searchTx]);

  // Expenses category distribution
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    visibleTransactions
      .filter((t) => t.type === 'egreso')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [visibleTransactions]);

  const periodIncome = useMemo(() => {
    return visibleTransactions
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [visibleTransactions]);

  const periodExpenses = useMemo(() => {
    return visibleTransactions
      .filter((t) => t.type === 'egreso')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [visibleTransactions]);

  const periodNet = periodIncome - periodExpenses;

  const handleOpenAdd = (type: TransactionType = 'egreso') => {
    setEditingTxId(null);
    setTxType(type);
    setTxDate(new Date().toISOString().slice(0, 10));
    setTxAmount('');
    setTxCategory(type === 'ingreso' ? 'Venta de pedidos' : 'Compra insumos');
    setTxDescription('');
    setTxPaymentMethod('transferencia');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    setEditingTxId(t.id);
    setTxType(t.type);
    setTxDate(t.date);
    setTxAmount(String(t.amount));
    setTxCategory(t.category);
    setTxDescription(t.description);
    setTxPaymentMethod(t.paymentMethod as any);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Ingresá un monto válido');
      return;
    }

    const payload = {
      type: txType,
      date: txDate,
      amount: amountNum,
      category: txCategory.trim() || 'General',
      description: txDescription.trim() || (txType === 'ingreso' ? 'Ingreso' : 'Gasto'),
      paymentMethod: txPaymentMethod,
    };

    if (editingTxId) {
      updateTransaction(editingTxId, payload);
    } else {
      addTransaction(payload);
    }

    setIsModalOpen(false);
  };

  const handleExportPDF = () => {
    const label = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    exportFinancePDF(
      label,
      currentMonthData.income,
      currentMonthData.expenses,
      currentMonthData.netProfit,
      currentMonthData.openingBalance,
      currentMonthData.closingBalance,
      visibleTransactions,
      expensesByCategory
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & View Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900">
            Control de Finanzas & Flujo de Caja
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Seguimiento detallado diario, mensual y anual con impacto acumulativo mes a mes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-stone-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('dia')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'dia' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Diario
            </button>
            <button
              onClick={() => setViewMode('mes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'mes' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setViewMode('anio')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'anio' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Anual
            </button>
            <button
              onClick={() => setViewMode('flujo')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'flujo' ? 'bg-pink-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Hoja Flujo de Caja
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-pink-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-pink-600" />
            <span>PDF Mensual</span>
          </button>

          <button
            onClick={() => exportTransactionsCSV(visibleTransactions)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-pink-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-pink-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Period Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-pink-100 shadow-xs">
        <div className="flex items-center gap-2">
          {viewMode === 'mes' && (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-hidden"
              >
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-hidden"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}

          {viewMode === 'dia' && (
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-hidden"
            />
          )}

          {(viewMode === 'anio' || viewMode === 'flujo') && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-hidden"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Año {y}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quick Add Income / Expense */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('ingreso')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anotar Ingreso</span>
          </button>

          <button
            onClick={() => handleOpenAdd('egreso')}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-rose-600" />
            <span>Anotar Egreso / Gasto</span>
          </button>
        </div>
      </div>

      {/* Month Rollover Cards */}
      {viewMode === 'mes' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[11px] text-stone-400 font-semibold block">
              Saldo Inicial (Mes anterior)
            </span>
            <span className="text-lg font-bold font-serif-brand text-stone-800 mt-1 block">
              {formatCurrency(currentMonthData.openingBalance)}
            </span>
            <span className="text-[10px] text-stone-400">Impacto arrastrado</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
            <span className="text-[11px] text-emerald-600 font-semibold block">
              (+) Ingresos del Mes
            </span>
            <span className="text-lg font-bold font-serif-brand text-emerald-700 mt-1 block">
              +{formatCurrency(currentMonthData.income)}
            </span>
            <span className="text-[10px] text-emerald-600/70">Ventas & señas</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
            <span className="text-[11px] text-rose-600 font-semibold block">
              (-) Egresos del Mes
            </span>
            <span className="text-lg font-bold font-serif-brand text-rose-700 mt-1 block">
              -{formatCurrency(currentMonthData.expenses)}
            </span>
            <span className="text-[10px] text-rose-600/70">Insumos & fijos</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs">
            <span className="text-[11px] text-pink-700 font-semibold block">
              (=) Ganancia Neta
            </span>
            <span
              className={`text-lg font-bold font-serif-brand mt-1 block ${
                currentMonthData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(currentMonthData.netProfit)}
            </span>
            <span className="text-[10px] text-stone-400">Ingresos - Egresos</span>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-4 rounded-2xl text-white shadow-md shadow-pink-200 col-span-2 lg:col-span-1">
            <span className="text-[11px] text-pink-100 font-semibold block">
              (=) Saldo Final Acumulado
            </span>
            <span className="text-xl font-black font-serif-brand mt-1 block">
              {formatCurrency(currentMonthData.closingBalance)}
            </span>
            <span className="text-[10px] text-pink-100 block">
              Pasa al mes siguiente ➔
            </span>
          </div>
        </div>
      )}

      {/* Day or Year View Summary */}
      {(viewMode === 'dia' || viewMode === 'anio') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
            <span className="text-xs text-emerald-600 font-semibold block">Total Ingresos</span>
            <span className="text-2xl font-bold font-serif-brand text-emerald-700 mt-1 block">
              +{formatCurrency(periodIncome)}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
            <span className="text-xs text-rose-600 font-semibold block">Total Egresos</span>
            <span className="text-2xl font-bold font-serif-brand text-rose-700 mt-1 block">
              -{formatCurrency(periodExpenses)}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs">
            <span className="text-xs text-pink-700 font-semibold block">Balance Neto</span>
            <span className="text-2xl font-bold font-serif-brand text-stone-900 mt-1 block">
              {formatCurrency(periodNet)}
            </span>
          </div>
        </div>
      )}

      {/* Flujo de Caja Mes a Mes */}
      {viewMode === 'flujo' ? (
        <div className="bg-white rounded-3xl border border-pink-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif-brand font-bold text-xl text-stone-800">
                Hoja de Flujo de Caja Anual ({selectedYear})
              </h3>
              <p className="text-xs text-stone-500">
                El saldo final de cada mes se traslada automáticamente como saldo inicial del mes siguiente
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-rose-50/70 border-b border-pink-100 text-stone-700">
                <tr>
                  <th className="py-3 px-3 font-bold">Mes</th>
                  <th className="py-3 px-3 font-bold text-right">Saldo Inicial</th>
                  <th className="py-3 px-3 font-bold text-right text-emerald-700">(+) Ingresos</th>
                  <th className="py-3 px-3 font-bold text-right text-rose-700">(-) Egresos</th>
                  <th className="py-3 px-3 font-bold text-right">(=) Ganancia Neta</th>
                  <th className="py-3 px-3 font-bold text-right text-pink-700">(=) Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {annualCashFlow.map((row) => (
                  <tr
                    key={row.monthNumber}
                    className={`hover:bg-rose-50/30 transition-colors ${
                      row.monthNumber === selectedMonth ? 'bg-pink-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-stone-800">
                      {row.monthName}
                    </td>
                    <td className="py-3 px-3 text-right text-stone-600 font-serif-brand">
                      {formatCurrency(row.openingBalance)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-serif-brand">
                      +{formatCurrency(row.income)}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 font-serif-brand">
                      -{formatCurrency(row.expenses)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-serif-brand ${
                        row.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatCurrency(row.netProfit)}
                    </td>
                    <td className="py-3 px-3 text-right font-serif-brand font-bold text-pink-800">
                      {formatCurrency(row.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Period Summary & Category Breakdown */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Balance Summary Card */}
            <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Balance del Período
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    periodNet >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {periodNet >= 0 ? 'Superávit' : 'Déficit'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Resultado Neto</span>
                <span
                  className={`text-2xl font-black font-serif-brand ${
                    periodNet >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(periodNet)}
                </span>
              </div>
              <div className="pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">Total Ingresos</span>
                  <span className="font-bold text-emerald-600 block">
                    +{formatCurrency(periodIncome)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-stone-400 block text-[10px]">Total Egresos</span>
                  <span className="font-bold text-rose-600 block">
                    -{formatCurrency(periodExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expenses by Category */}
            <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-pink-600" />
                <h4 className="font-bold text-sm text-stone-800">
                  Distribución de Egresos
                </h4>
              </div>

              {expensesByCategory.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  Sin egresos registrados en este período.
                </p>
              ) : (
                <div className="space-y-3">
                  {expensesByCategory.map((cat, i) => {
                    const pct = Math.round((cat.amount / (periodExpenses || 1)) * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs text-stone-700">
                          <span className="font-medium truncate">{cat.category}</span>
                          <span className="font-bold">{formatCurrency(cat.amount)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Desplazado al costado): Historial de Movimientos Muy Detallado y Despejado */}
          <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-pink-50 rounded-xl text-pink-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-stone-800">
                    Historial de Movimientos Detallado
                  </h4>
                  <p className="text-xs text-stone-400">
                    {visibleTransactions.length} registro(s) en este período
                  </p>
                </div>
              </div>

              {/* View layout switch */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setLedgerDisplayMode('tarjetas')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ledgerDisplayMode === 'tarjetas'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Tarjetas
                </button>
                <button
                  onClick={() => setLedgerDisplayMode('tabla')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ledgerDisplayMode === 'tabla'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Tabla
                </button>
              </div>
            </div>

            {/* Filter Buttons & Real-Time Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <button
                  onClick={() => setTypeFilter('todos')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    typeFilter === 'todos'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Todos ({data.transactions.length})
                </button>
                <button
                  onClick={() => setTypeFilter('ingreso')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    typeFilter === 'ingreso'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  🟢 Sólo Ingresos
                </button>
                <button
                  onClick={() => setTypeFilter('egreso')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    typeFilter === 'egreso'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  🔴 Sólo Egresos
                </button>
              </div>

              {/* Text Search */}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar por texto, fecha, categoría..."
                  value={searchTx}
                  onChange={(e) => setSearchTx(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-pink-500 transition-colors"
                />
              </div>
            </div>

            {/* List Content */}
            {visibleTransactions.length === 0 ? (
              <div className="py-12 text-center bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                <DollarSign className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-600">
                  No se encontraron movimientos
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Probá ajustando los filtros o anotá un nuevo ingreso o egreso.
                </p>
              </div>
            ) : ledgerDisplayMode === 'tarjetas' ? (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {visibleTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl border border-stone-100 hover:border-pink-200 bg-white hover:bg-pink-50/20 transition-all shadow-2xs space-y-3"
                  >
                    {/* Top Row: Type Badge, Category, Date, Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            tx.type === 'ingreso'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tx.type === 'ingreso' ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5" /> Ingreso
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-3.5 h-3.5" /> Egreso / Gasto
                            </>
                          )}
                        </span>

                        <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold">
                          {tx.category}
                        </span>

                        {tx.isAutoFromOrder && (
                          <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-700 text-[11px] font-bold">
                            Venta Pedido
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-stone-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(tx.date)}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 text-stone-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                            title="Editar este registro"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar transacción "${tx.description}"?`)) {
                                deleteTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar este registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Full Description (No truncation) & Amount */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-stone-50">
                      <p className="text-sm font-semibold text-stone-800 leading-snug">
                        {tx.description}
                      </p>

                      <div className="text-left sm:text-right shrink-0">
                        <span
                          className={`font-serif-brand font-black text-lg ${
                            tx.type === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.type === 'ingreso' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Payment Method Pill */}
                    <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
                      <span className="text-[11px] text-stone-400">Método de pago:</span>
                      <span className="capitalize font-semibold text-stone-700 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200">
                        {tx.paymentMethod}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Detailed Table View */
              <div className="overflow-x-auto rounded-2xl border border-stone-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-3">Fecha</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Descripción</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3">Método</th>
                      <th className="py-3 px-3 text-right">Monto</th>
                      <th className="py-3 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {visibleTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-pink-50/30 transition-colors">
                        <td className="py-3 px-3 font-medium text-stone-600 whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              tx.type === 'ingreso'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.type === 'ingreso' ? '🟢 Ingreso' : '🔴 Egreso'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-stone-800 min-w-[180px]">
                          {tx.description}
                        </td>
                        <td className="py-3 px-3 text-stone-600 whitespace-nowrap">
                          {tx.category}
                        </td>
                        <td className="py-3 px-3 capitalize text-stone-600 whitespace-nowrap">
                          {tx.paymentMethod}
                        </td>
                        <td
                          className={`py-3 px-3 font-serif-brand font-bold text-sm text-right whitespace-nowrap ${
                            tx.type === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.type === 'ingreso' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="p-1 text-stone-400 hover:text-pink-600 rounded"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar transacción "${tx.description}"?`)) {
                                  deleteTransaction(tx.id);
                                }
                              }}
                              className="p-1 text-stone-400 hover:text-red-500 rounded"
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
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-pink-100 space-y-4 max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            <h3 className="font-serif-brand font-bold text-xl text-stone-800">
              {editingTxId
                ? 'Editar Registro de Finanzas'
                : txType === 'ingreso'
                ? 'Registrar Nuevo Ingreso'
                : 'Registrar Nuevo Egreso / Gasto'}
            </h3>

            <form onSubmit={handleSaveTransaction} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Tipo de movimiento
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('ingreso')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      txType === 'ingreso'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500'
                        : 'bg-stone-50 text-stone-600'
                    }`}
                  >
                    🟢 + Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('egreso')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      txType === 'egreso'
                        ? 'bg-rose-50 text-rose-800 border-rose-500'
                        : 'bg-stone-50 text-stone-600'
                    }`}
                  >
                    🔴 - Egreso / Gasto
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Monto ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ej: 15000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Luz, Insumos, Seña..."
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Descripción del movimiento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Compra de cartón gris y resmas Chambril"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Método de pago
                </label>
                <select
                  value={txPaymentMethod}
                  onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                >
                  <option value="transferencia">Transferencia Bancaria / Alias</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta de Débito / Crédito</option>
                  <option value="otro">Mercado Pago / Billetera Virtual</option>
                </select>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-stone-100 pt-3 pb-1 flex gap-2 shrink-0">
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
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
