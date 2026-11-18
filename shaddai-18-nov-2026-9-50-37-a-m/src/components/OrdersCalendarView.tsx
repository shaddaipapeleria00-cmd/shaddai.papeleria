import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, DeliveryMethod } from '../types';
import { formatCurrency, formatDate, getLocalTodayString } from '../utils/exportUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageCircle,
  FileText,
  Edit,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  Truck,
  CalendarPlus,
} from 'lucide-react';

interface OrdersCalendarViewProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onEditOrder: (order: Order) => void;
  onAssignDeliveryDate: (orderId: string, deliveryDate: string) => void;
  onCreateOrderForDate: (deliveryDate: string) => void;
  onOpenReceipt: (order: Order) => void;
  onOpenWaModal: (order: Order) => void;
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS_SHORT_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAYS_FULL_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

function toYmd(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  return { year: y, month: m - 1, day: d };
}

function formatReadableSpanishDate(ymd: string): string {
  const { year, month, day } = parseYmd(ymd);
  const local = new Date(year, month, day);
  const weekday = WEEKDAYS_FULL_ES[local.getDay()];
  const monthName = MONTH_NAMES_ES[month]?.toLowerCase() || '';
  return `${weekday} ${day} de ${monthName} de ${year}`;
}

export const OrdersCalendarView: React.FC<OrdersCalendarViewProps> = ({
  orders,
  onStatusChange,
  onEditOrder,
  onAssignDeliveryDate,
  onCreateOrderForDate,
  onOpenReceipt,
  onOpenWaModal,
}) => {
  const todayStr = getLocalTodayString();
  const initialParsed = parseYmd(todayStr);

  const [viewYear, setViewYear] = useState<number>(initialParsed.year);
  const [viewMonth, setViewMonth] = useState<number>(initialParsed.month);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showUnscheduled, setShowUnscheduled] = useState<boolean>(true);

  const statusStyles: Record<
    OrderStatus,
    { label: string; pill: string; dot: string; selectBg: string }
  > = {
    pendiente: {
      label: 'Pendiente',
      pill: 'bg-amber-100 text-amber-900 border-amber-200',
      dot: 'bg-amber-500',
      selectBg: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    en_produccion: {
      label: 'En Producción',
      pill: 'bg-purple-100 text-purple-900 border-purple-200',
      dot: 'bg-purple-500',
      selectBg: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    listo: {
      label: 'Listo p/ Entrega',
      pill: 'bg-blue-100 text-blue-900 border-blue-200',
      dot: 'bg-blue-500',
      selectBg: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    entregado: {
      label: 'Entregado',
      pill: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      dot: 'bg-emerald-500',
      selectBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    cancelado: {
      label: 'Cancelado',
      pill: 'bg-stone-100 text-stone-500 border-stone-200 line-through',
      dot: 'bg-stone-400',
      selectBg: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  };

  const deliveryLabels: Record<DeliveryMethod, string> = {
    retirar: 'Retiro en taller',
    domicilio: 'Envío a domicilio',
    correo_argentino: 'Correo Argentino',
  };

  // Group orders by deliveryDate (YYYY-MM-DD)
  const ordersByDate = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach((order) => {
      if (!order.deliveryDate) return;
      const key = order.deliveryDate.slice(0, 10);
      const list = map.get(key) || [];
      list.push(order);
      map.set(key, list);
    });
    // Sort orders inside each day: active first, delivered/cancelled after
    map.forEach((list, key) => {
      list.sort((a, b) => {
        const aDone = a.status === 'entregado' || a.status === 'cancelado' ? 1 : 0;
        const bDone = b.status === 'entregado' || b.status === 'cancelado' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.orderNumber.localeCompare(b.orderNumber);
      });
      map.set(key, list);
    });
    return map;
  }, [orders]);

  // Summary counters for quick planning
  const summaryStats = useMemo(() => {
    const todayObj = new Date(initialParsed.year, initialParsed.month, initialParsed.day);
    const in7DaysObj = new Date(todayObj);
    in7DaysObj.setDate(todayObj.getDate() + 7);
    const in7DaysStr = toYmd(
      in7DaysObj.getFullYear(),
      in7DaysObj.getMonth(),
      in7DaysObj.getDate()
    );

    let dueToday = 0;
    let upcoming7 = 0;
    let overdue = 0;
    const unscheduledActive: Order[] = [];
    let firstOverdueDate: string | null = null;

    orders.forEach((o) => {
      const isActive = o.status !== 'entregado' && o.status !== 'cancelado';
      if (!isActive) return;

      if (!o.deliveryDate) {
        unscheduledActive.push(o);
        return;
      }

      const d = o.deliveryDate.slice(0, 10);
      if (d === todayStr) {
        dueToday += 1;
      } else if (d > todayStr && d <= in7DaysStr) {
        upcoming7 += 1;
      } else if (d < todayStr) {
        overdue += 1;
        if (!firstOverdueDate || d < firstOverdueDate) {
          firstOverdueDate = d;
        }
      }
    });

    unscheduledActive.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { dueToday, upcoming7, overdue, unscheduledActive, firstOverdueDate };
  }, [orders, todayStr, initialParsed.year, initialParsed.month, initialParsed.day]);

  // Build calendar cells for current month (Monday-first 6-row or 5-row grid)
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // JS getDay(): Sun=0, Mon=1..Sat=6 -> convert to Mon=0..Sun=6
    const startOffset = (firstOfMonth.getDay() + 6) % 7;

    const cells: Array<{
      ymd: string;
      day: number;
      inCurrentMonth: boolean;
    }> = [];

    // Previous month trailing days
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    const prevMonthYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      cells.push({
        ymd: toYmd(prevMonthYear, prevMonthIdx, dayNum),
        day: dayNum,
        inCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        ymd: toYmd(viewYear, viewMonth, d),
        day: d,
        inCurrentMonth: true,
      });
    }

    // Next month leading days to complete full weeks
    const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        ymd: toYmd(nextMonthYear, nextMonthIdx, nextDay),
        day: nextDay,
        inCurrentMonth: false,
      });
      nextDay += 1;
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const jumpToDate = (ymd: string) => {
    const parsed = parseYmd(ymd);
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    setSelectedDate(ymd);
  };

  const selectedDayOrders = ordersByDate.get(selectedDate) || [];

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Planning Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => jumpToDate(todayStr)}
          className="text-left bg-white p-3.5 rounded-2xl border border-pink-200 shadow-xs hover:border-pink-400 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-bold text-pink-600 uppercase tracking-wide flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" />
            Entregas Hoy
          </span>
          <span className="text-2xl font-bold font-serif-brand text-stone-900 mt-1 block">
            {summaryStats.dueToday}
          </span>
          <span className="text-[11px] text-stone-400">Tocar para ver hoy</span>
        </button>

        <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Próximos 7 días
          </span>
          <span className="text-2xl font-bold font-serif-brand text-purple-800 mt-1 block">
            {summaryStats.upcoming7}
          </span>
          <span className="text-[11px] text-stone-400">Entregas programadas</span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (summaryStats.firstOverdueDate) {
              jumpToDate(summaryStats.firstOverdueDate);
            }
          }}
          className={`text-left p-3.5 rounded-2xl border shadow-xs transition-all ${
            summaryStats.overdue > 0
              ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400 cursor-pointer'
              : 'bg-white border-emerald-100'
          }`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${
              summaryStats.overdue > 0 ? 'text-rose-700' : 'text-emerald-600'
            }`}
          >
            {summaryStats.overdue > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Atrasados
          </span>
          <span
            className={`text-2xl font-bold font-serif-brand mt-1 block ${
              summaryStats.overdue > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {summaryStats.overdue}
          </span>
          <span className="text-[11px] text-stone-500">
            {summaryStats.overdue > 0 ? 'Tocar para ir al primero' : 'Todo al día'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowUnscheduled((v) => !v)}
          className="text-left bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
            <CalendarPlus className="w-3.5 h-3.5" />
            Sin Fecha Asignada
          </span>
          <span className="text-2xl font-bold font-serif-brand text-amber-700 mt-1 block">
            {summaryStats.unscheduledActive.length}
          </span>
          <span className="text-[11px] text-stone-400">Pedidos activos por agendar</span>
        </button>
      </div>

      {/* Main Calendar Grid + Selected Day Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Monthly Grid */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl border border-pink-100 shadow-xs p-4 sm:p-5 space-y-4">
          {/* Calendar Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-serif-brand font-bold text-xl sm:text-2xl text-stone-900">
                {MONTH_NAMES_ES[viewMonth]} {viewYear}
              </h3>
              <p className="text-[11px] text-stone-500">
                Tocá un día para ver los pedidos a entregar o agendar uno nuevo
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 bg-stone-50 hover:bg-pink-50 text-stone-600 hover:text-pink-700 rounded-xl border border-stone-200 transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => jumpToDate(todayStr)}
                className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl border border-pink-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 bg-stone-50 hover:bg-pink-50 text-stone-600 hover:text-pink-700 rounded-xl border border-stone-200 transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
            {WEEKDAYS_SHORT_ES.map((dayName) => (
              <div
                key={dayName}
                className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase py-1"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell) => {
              const dayOrders = ordersByDate.get(cell.ymd) || [];
              const activeCount = dayOrders.filter(
                (o) => o.status !== 'entregado' && o.status !== 'cancelado'
              ).length;
              const isToday = cell.ymd === todayStr;
              const isSelected = cell.ymd === selectedDate;
              const hasOverdue =
                cell.ymd < todayStr && activeCount > 0;

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => {
                    setSelectedDate(cell.ymd);
                    if (!cell.inCurrentMonth) {
                      const p = parseYmd(cell.ymd);
                      setViewYear(p.year);
                      setViewMonth(p.month);
                    }
                  }}
                  className={`min-h-[60px] sm:min-h-[92px] p-1 sm:p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-pink-500 bg-pink-50/80 ring-2 ring-pink-200 shadow-xs'
                      : isToday
                      ? 'border-rose-300 bg-rose-50/40 hover:border-pink-400'
                      : cell.inCurrentMonth
                      ? 'border-stone-200/80 bg-white hover:border-pink-200 hover:bg-stone-50/60'
                      : 'border-stone-100 bg-stone-50/50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[11px] sm:text-xs font-bold inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${
                        isToday
                          ? 'bg-pink-600 text-white'
                          : isSelected
                          ? 'bg-pink-200 text-pink-900'
                          : cell.inCurrentMonth
                          ? 'text-stone-700'
                          : 'text-stone-400'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {dayOrders.length > 0 && (
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                          hasOverdue
                            ? 'bg-rose-600 text-white'
                            : activeCount > 0
                            ? 'bg-pink-600 text-white'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {dayOrders.length}
                      </span>
                    )}
                  </div>

                  {/* Mobile dots */}
                  {dayOrders.length > 0 && (
                    <div className="flex sm:hidden flex-wrap gap-0.5 mt-1">
                      {dayOrders.slice(0, 4).map((o) => {
                        const st = statusStyles[o.status] || statusStyles.pendiente;
                        return (
                          <span
                            key={o.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              cell.ymd < todayStr &&
                              o.status !== 'entregado' &&
                              o.status !== 'cancelado'
                                ? 'bg-rose-600'
                                : st.dot
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Desktop mini order chips */}
                  {dayOrders.length > 0 && (
                    <div className="hidden sm:flex flex-col gap-0.5 mt-1 w-full">
                      {dayOrders.slice(0, 2).map((o) => {
                        const st = statusStyles[o.status] || statusStyles.pendiente;
                        const isOverdueItem =
                          cell.ymd < todayStr &&
                          o.status !== 'entregado' &&
                          o.status !== 'cancelado';
                        return (
                          <div
                            key={o.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md border truncate font-semibold ${
                              isOverdueItem
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : st.pill
                            }`}
                            title={`#${o.orderNumber} - ${o.clientName} (${st.label})`}
                          >
                            {o.clientName}
                          </div>
                        );
                      })}
                      {dayOrders.length > 2 && (
                        <span className="text-[9px] font-bold text-pink-700 pl-1">
                          +{dayOrders.length - 2} más
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Status Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pendiente
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> En Producción
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Listo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Entregado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Atrasado
            </span>
          </div>
        </div>

        {/* Selected Day Agenda Panel */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-pink-100 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-pink-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 block">
                {selectedDate === todayStr ? 'Entregas de Hoy' : 'Agenda del Día'}
              </span>
              <h4 className="font-serif-brand font-bold text-lg text-stone-900 capitalize leading-snug">
                {formatReadableSpanishDate(selectedDate)}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                {selectedDayOrders.length === 0
                  ? 'No hay pedidos agendados para esta fecha'
                  : `${selectedDayOrders.length} pedido(s) para entregar`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onCreateOrderForDate(selectedDate)}
              className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-xs shrink-0 cursor-pointer transition-all"
              title="Crear nuevo pedido para entregar en esta fecha"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anotar</span>
            </button>
          </div>

          {selectedDayOrders.length === 0 ? (
            <div className="py-10 text-center space-y-3 bg-stone-50/70 rounded-2xl border border-dashed border-stone-200 px-4">
              <CalendarIcon className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-xs text-stone-500">
                No tenés entregas registradas para el{' '}
                <span className="font-bold text-stone-700">{formatDate(selectedDate)}</span>.
              </p>
              <button
                type="button"
                onClick={() => onCreateOrderForDate(selectedDate)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold border border-pink-200 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Anotar pedido para esta fecha</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-0.5">
              {selectedDayOrders.map((order) => {
                const st = statusStyles[order.status] || statusStyles.pendiente;
                const isPaid =
                  order.balanceDue <= 0 || (order.amountPaid || 0) >= order.totalAmount;
                const isOverdue =
                  selectedDate < todayStr &&
                  order.status !== 'entregado' &&
                  order.status !== 'cancelado';

                return (
                  <div
                    key={order.id}
                    className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
                      isOverdue
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-stone-50/60 border-stone-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-extrabold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                            #{order.orderNumber}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full">
                              Atrasado
                            </span>
                          )}
                        </div>
                        <h5 className="font-extrabold text-stone-900 text-sm mt-1 truncate">
                          {order.clientName}
                        </h5>
                        <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                          <Truck className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>{deliveryLabels[order.deliveryMethod] || order.deliveryMethod}</span>
                        </p>
                      </div>

                      <select
                        value={order.status}
                        onChange={(e) =>
                          onStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className={`text-[11px] font-bold px-2 py-1 rounded-xl border outline-hidden cursor-pointer shrink-0 ${st.selectBg}`}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_produccion">En Producción</option>
                        <option value="listo">Listo p/ Entrega</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>

                    {/* Items summary */}
                    <div className="bg-white p-2 rounded-xl border border-stone-200/70 text-[11px] text-stone-700 space-y-0.5">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="truncate">
                          <span className="font-bold">{it.quantity}x</span> {it.productName}
                          {it.selectedVariants &&
                            Object.keys(it.selectedVariants).length > 0 && (
                              <span className="text-pink-600 text-[10px] ml-1">
                                ({Object.values(it.selectedVariants).join(', ')})
                              </span>
                            )}
                        </div>
                      ))}
                      {order.notes && (
                        <p className="text-[10px] text-stone-500 italic pt-1 border-t border-stone-100">
                          "{order.notes}"
                        </p>
                      )}
                    </div>

                    {/* Total & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="text-xs">
                        <span className="font-serif-brand font-bold text-stone-900">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        <span
                          className={`block text-[10px] font-bold ${
                            isPaid ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {isPaid
                            ? '✅ Pagado'
                            : `Resta ${formatCurrency(order.balanceDue)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenWaModal(order)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(order)}
                          className="p-1.5 bg-white hover:bg-pink-50 text-pink-600 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                          title="Ver comprobante"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditOrder(order)}
                          className="px-2 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Editar pedido o cambiar fecha de entrega"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Orders Without Scheduled Delivery Date */}
      {showUnscheduled && summaryStats.unscheduledActive.length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200/80 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h4 className="font-serif-brand font-bold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <span>Pedidos activos sin fecha de entrega ({summaryStats.unscheduledActive.length})</span>
              </h4>
              <p className="text-xs text-stone-500">
                Elegí una fecha en cualquiera de estos pedidos para pasarlo directamente al calendario
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {summaryStats.unscheduledActive.map((order) => (
              <div
                key={order.id}
                className="p-3 bg-amber-50/40 rounded-2xl border border-amber-200/70 flex flex-col justify-between gap-2.5 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-pink-700">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Pedido el {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <p className="font-bold text-stone-900 text-sm truncate mt-0.5">
                    {order.clientName}
                  </p>
                  <p className="text-[11px] text-stone-600 truncate">
                    {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                  <label className="text-[10px] font-bold text-amber-900 shrink-0">
                    Agendar entrega:
                  </label>
                  <input
                    type="date"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        onAssignDeliveryDate(order.id, val);
                        jumpToDate(val);
                      }
                    }}
                    className="flex-1 p-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-stone-800 outline-hidden focus:border-pink-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
