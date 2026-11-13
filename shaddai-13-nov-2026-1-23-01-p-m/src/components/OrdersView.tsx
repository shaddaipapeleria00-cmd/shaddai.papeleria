import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Order, OrderItem, OrderStatus, PaymentMethod, DeliveryMethod, Product } from '../types';
import {
  formatCurrency,
  formatDate,
  exportOrdersPDF,
  exportOrdersCSV,
  getLocalTodayString,
  generateOrderReceiptPDF,
} from '../utils/exportUtils';
import { openWhatsAppDirect, getWhatsAppUrl, WhatsAppAppType } from '../utils/whatsappUtils';
import {
  FileDown,
  Filter,
  Plus,
  Search,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  XCircle,
  Eye,
  List,
  DollarSign,
  AlertCircle,
  Trash2,
  Calendar,
  Edit,
  X,
  UserPlus,
  Users,
  FileText,
  Share2,
  Printer,
  Download,
  Send,
  Briefcase,
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const {
    data,
    addOrder,
    updateOrder,
    deleteOrder,
    addPartialPayment,
    updatePartialPaymentDate,
    deletePartialPayment,
    addCustomWhatsAppTemplate,
    ordersCompactView,
    setOrdersCompactView,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Manual Order Creation Modal
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('new');
  const [newOrderClientName, setNewOrderClientName] = useState('');
  const [newOrderClientPhone, setNewOrderClientPhone] = useState('');
  const [newOrderClientAddress, setNewOrderClientAddress] = useState('');
  const [newOrderClientEmail, setNewOrderClientEmail] = useState('');
  const [newOrderDate, setNewOrderDate] = useState(() => getLocalTodayString());
  const [newOrderDeliveryMethod, setNewOrderDeliveryMethod] = useState<DeliveryMethod>('retirar');
  const [newOrderShippingCost, setNewOrderShippingCost] = useState('0');
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('pendiente');
  const [newOrderItems, setNewOrderItems] = useState<OrderItem[]>([]);
  const [pickerProductId, setPickerProductId] = useState('');
  const [pickerVariant, setPickerVariant] = useState<Record<string, string>>({});
  const [pickerQuantity, setPickerQuantity] = useState(1);
  const [pickerPrice, setPickerPrice] = useState('');
  const [newOrderPaymentAmount, setNewOrderPaymentAmount] = useState('');
  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [newOrderPaymentDate, setNewOrderPaymentDate] = useState(() => getLocalTodayString());
  const [newOrderNotes, setNewOrderNotes] = useState('');

  // Digital Receipt Modal
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);

  // Reliable Delete Order Modal (works in iframes and mobile without window.confirm)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Partial Payment Modal
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [paymentDate, setPaymentDate] = useState(() => getLocalTodayString());
  const [paymentNote, setPaymentNote] = useState('');

  // Payment date editing state
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [tempPaymentDate, setTempPaymentDate] = useState('');

  // WhatsApp quick contact modal with custom template and live editing
  const [waModalOrder, setWaModalOrder] = useState<Order | null>(null);
  const [waCustomMessage, setWaCustomMessage] = useState('');
  const [activeTemplateTitle, setActiveTemplateTitle] = useState('Saludo Inicial');
  const [isAddingNewTemplate, setIsAddingNewTemplate] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');

  // Edit Order Modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientAddress, setEditClientAddress] = useState('');
  const [editDeliveryMethod, setEditDeliveryMethod] = useState<DeliveryMethod>('retirar');
  const [editShippingCost, setEditShippingCost] = useState('0');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editNotes, setEditNotes] = useState('');

  // Product to add inside Edit Order Modal
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [selectedVariantToAdd, setSelectedVariantToAdd] = useState<Record<string, string>>({});

  // Filter orders
  const filteredOrders = useMemo(() => {
    let list = [...data.orders];

    if (statusFilter !== 'todos') {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.clientName.toLowerCase().includes(q) ||
          o.clientPhone.includes(q)
      );
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data.orders, statusFilter, searchQuery]);

  // Financial Metrics
  const metrics = useMemo(() => {
    let totalBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let inProductionCount = 0;

    data.orders.forEach((o) => {
      if (o.status !== 'cancelado') {
        totalBilled += o.totalAmount;
        totalCollected += o.amountPaid || 0;
        totalPending += o.balanceDue || 0;
        if (o.status === 'en_produccion') {
          inProductionCount += 1;
        }
      }
    });

    return { totalBilled, totalCollected, totalPending, inProductionCount };
  }, [data.orders]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrder(orderId, { status: newStatus });
  };

  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPayment) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Ingresá un monto válido');
      return;
    }

    addPartialPayment(
      selectedOrderForPayment.id,
      amountNum,
      paymentMethod,
      paymentNote,
      paymentDate
    );
    setSelectedOrderForPayment(null);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentDate(getLocalTodayString());
  };

  // Open Manual Order Modal
  const handleOpenCreateOrderModal = () => {
    setSelectedClientId('new');
    setNewOrderClientName('');
    setNewOrderClientPhone('');
    setNewOrderClientAddress('');
    setNewOrderClientEmail('');
    setNewOrderDate(getLocalTodayString());
    setNewOrderDeliveryMethod('retirar');
    setNewOrderShippingCost('0');
    setNewOrderStatus('pendiente');
    setNewOrderItems([]);
    setPickerProductId('');
    setPickerVariant({});
    setPickerQuantity(1);
    setPickerPrice('');
    setNewOrderPaymentAmount('');
    setNewOrderPaymentMethod('transferencia');
    setNewOrderPaymentDate(getLocalTodayString());
    setNewOrderNotes('');
    setIsCreateOrderModalOpen(true);
  };

  const handleClientSelectChange = (val: string) => {
    setSelectedClientId(val);
    if (val !== 'new') {
      const found = data.clients.find((c) => c.id === val);
      if (found) {
        setNewOrderClientName(found.name);
        setNewOrderClientPhone(found.phone);
        setNewOrderClientAddress(found.address || '');
        setNewOrderClientEmail(found.email || '');
      }
    } else {
      setNewOrderClientName('');
      setNewOrderClientPhone('');
      setNewOrderClientAddress('');
      setNewOrderClientEmail('');
    }
  };

  const handleSelectProductToNewOrder = (prodId: string) => {
    setPickerProductId(prodId);
    setPickerVariant({}); // Allow user to choose only the variant(s) the customer chose
    const prod = data.products.find((p) => p.id === prodId);
    if (prod) {
      setPickerPrice(String(prod.finalPrice));
    } else {
      setPickerPrice('');
    }
  };

  // Calculate variant option price taking into account current product offer (fixed or percentage)
  const calculateOptionPrice = (
    prod: Product,
    opt: { name: string; price?: number; finalPrice?: number } | string
  ): number => {
    if (typeof opt === 'string') {
      return prod.finalPrice;
    }
    if (opt.finalPrice && opt.finalPrice > 0) {
      return opt.finalPrice;
    }
    if (opt.price && opt.price > 0) {
      if (prod.promoActive) {
        if (prod.promoType === 'fixed' && prod.promoDiscountFixed && prod.promoDiscountFixed > 0) {
          return Math.max(0, opt.price - prod.promoDiscountFixed);
        } else if (prod.promoDiscountPercent && prod.promoDiscountPercent > 0) {
          return Math.round(opt.price * (1 - prod.promoDiscountPercent / 100));
        }
      }
      return opt.price;
    }
    return prod.finalPrice;
  };

  const handleSendDirectReceiptWhatsApp = (order: Order, appType: WhatsAppAppType = 'business') => {
    const isPaid = order.balanceDue <= 0 || (order.amountPaid || 0) >= order.totalAmount;
    const itemsList = order.items
      .map(
        (it) =>
          `• ${it.quantity}x ${it.productName}${
            it.selectedVariants && Object.keys(it.selectedVariants).length > 0
              ? ` (${Object.values(it.selectedVariants).join(', ')})`
              : ''
          } - ${formatCurrency(it.price * it.quantity)}`
      )
      .join('\n');
    const bankDetails =
      !isPaid && (data.catalogSettings.bankInfo?.cbu || data.catalogSettings.bankInfo?.alias)
        ? `\n\n*Datos para transferir:*\n${
            data.catalogSettings.bankInfo.alias ? `Alias: ${data.catalogSettings.bankInfo.alias}\n` : ''
          }${data.catalogSettings.bankInfo.cbu ? `CBU: ${data.catalogSettings.bankInfo.cbu}\n` : ''}${
            data.catalogSettings.bankInfo.titular ? `Titular: ${data.catalogSettings.bankInfo.titular}` : ''
          }`
        : '';
    const msg = `¡Hola ${order.clientName}! 💕 Te compartimos el comprobante de tu pedido *#${order.orderNumber}* de Shaddai Papelería:\n\n*Productos:*\n${itemsList}\n\n*Total del Pedido:* ${formatCurrency(
      order.totalAmount
    )}\n*Total Abonado:* ${formatCurrency(
      order.amountPaid || 0
    )}\n*Estado:* ${
      isPaid ? '✅ PAGADO EN SU TOTALIDAD' : `Saldo pendiente: ${formatCurrency(order.balanceDue)}`
    }${bankDetails}\n\n¡Muchas gracias por elegirnos! 🌸`;
    openWhatsAppDirect(order.clientPhone, msg, appType);
  };

  const handleAddItemToNewOrder = () => {
    if (!pickerProductId) return;
    const prod = data.products.find((p) => p.id === pickerProductId);
    if (!prod) return;

    let unitPrice = parseFloat(pickerPrice);
    if (isNaN(unitPrice)) unitPrice = prod.finalPrice;

    const newItem: OrderItem = {
      productId: prod.id,
      productName: prod.name,
      price: unitPrice,
      quantity: Math.max(1, pickerQuantity),
      productImage: prod.images?.[0],
      type: prod.type,
      selectedVariants: Object.keys(pickerVariant).length > 0 ? { ...pickerVariant } : undefined,
    };

    setNewOrderItems((prev) => [...prev, newItem]);
    setPickerProductId('');
    setPickerVariant({});
    setPickerQuantity(1);
    setPickerPrice('');
  };

  const handleRemoveNewOrderItem = (idx: number) => {
    setNewOrderItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateNewOrderItemQty = (idx: number, delta: number) => {
    setNewOrderItems((prev) =>
      prev
        .map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  // Calculations for manual order
  const newOrderSubtotal = useMemo(() => {
    return newOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [newOrderItems]);

  const newOrderShipping = useMemo(() => {
    return Math.max(0, parseFloat(newOrderShippingCost) || 0);
  }, [newOrderShippingCost]);

  const newOrderTotal = useMemo(() => {
    return newOrderSubtotal + newOrderShipping;
  }, [newOrderSubtotal, newOrderShipping]);

  const newOrderPaid = useMemo(() => {
    return Math.max(0, parseFloat(newOrderPaymentAmount) || 0);
  }, [newOrderPaymentAmount]);

  const newOrderBalance = useMemo(() => {
    return Math.max(0, newOrderTotal - newOrderPaid);
  }, [newOrderTotal, newOrderPaid]);

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderClientName.trim() || !newOrderClientPhone.trim()) {
      alert('Ingresá el nombre y teléfono del cliente.');
      return;
    }
    if (newOrderItems.length === 0) {
      alert('Agregá al menos un producto al pedido.');
      return;
    }

    const initialPayments = [];
    if (newOrderPaid > 0) {
      initialPayments.push({
        id: `pay-${Date.now()}`,
        date: newOrderPaymentDate || getLocalTodayString(),
        amount: newOrderPaid,
        method: newOrderPaymentMethod,
        note: 'Pago / Seña inicial registrada manualmente',
      });
    }

    await addOrder({
      clientName: newOrderClientName.trim(),
      clientPhone: newOrderClientPhone.trim(),
      clientAddress: newOrderClientAddress.trim() || undefined,
      clientEmail: newOrderClientEmail.trim() || undefined,
      items: newOrderItems,
      subtotal: newOrderSubtotal,
      shippingCost: newOrderShipping,
      totalAmount: newOrderTotal,
      amountPaid: newOrderPaid,
      balanceDue: newOrderBalance,
      status: newOrderStatus,
      deliveryMethod: newOrderDeliveryMethod,
      paymentMethod: newOrderPaymentMethod,
      notes: newOrderNotes.trim() || undefined,
      partialPayments: initialPayments,
      createdAt: newOrderDate ? `${newOrderDate}T12:00:00.000Z` : undefined,
    });

    setIsCreateOrderModalOpen(false);
  };

  // Open Edit Order Modal
  const handleOpenEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditClientName(order.clientName);
    setEditClientPhone(order.clientPhone);
    setEditClientAddress(order.clientAddress || '');
    setEditDeliveryMethod(order.deliveryMethod || 'retirar');
    setEditShippingCost(String(order.shippingCost || 0));
    setEditItems([...order.items]);
    setEditNotes(order.notes || '');
    setSelectedProductToAdd('');
    setSelectedVariantToAdd({});
  };

  const handleAddProductToEditedOrder = () => {
    if (!selectedProductToAdd) return;
    const prod = data.products.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;

    const newItem: OrderItem = {
      productId: prod.id,
      productName: prod.name,
      price: prod.finalPrice,
      quantity: 1,
      productImage: prod.images?.[0],
      type: prod.type,
      selectedVariants: { ...selectedVariantToAdd },
    };

    setEditItems((prev) => [...prev, newItem]);
    setSelectedProductToAdd('');
    setSelectedVariantToAdd({});
  };

  const handleRemoveProductFromEditedOrder = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveProductFromEditedOrder(index);
      return;
    }
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: newQty } : item))
    );
  };

  const handleSaveEditedOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (editItems.length === 0) {
      alert('El pedido debe contener al menos un producto.');
      return;
    }

    const subtotal = editItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const shipping = parseFloat(editShippingCost) || 0;
    const totalAmount = subtotal + shipping;

    updateOrder(editingOrder.id, {
      clientName: editClientName.trim(),
      clientPhone: editClientPhone.trim(),
      clientAddress: editClientAddress.trim() || undefined,
      deliveryMethod: editDeliveryMethod,
      items: editItems,
      subtotal,
      shippingCost: shipping,
      totalAmount,
      balanceDue: Math.max(0, totalAmount - (editingOrder.amountPaid || 0)),
      notes: editNotes.trim() || undefined,
    });

    setEditingOrder(null);
  };

  const handleOpenWaModal = (order: Order) => {
    setWaModalOrder(order);
    setActiveTemplateTitle('Saludo Inicial');
    const defaultGreeting = `¡Hola ${order.clientName}! 💕 Te contactamos de Shaddai Papelería respecto a tu pedido *#${order.orderNumber}*. ¡Muchas gracias por tu compra!`;
    setWaCustomMessage(defaultGreeting);
  };

  const handleSelectTemplate = (title: string, rawText: string) => {
    if (!waModalOrder) return;
    setActiveTemplateTitle(title);
    const populated = rawText
      .replace(/\{cliente\}/g, waModalOrder.clientName)
      .replace(/\{pedido\}/g, waModalOrder.orderNumber)
      .replace(/\{saldo\}/g, formatCurrency(waModalOrder.balanceDue))
      .replace(/\{alias\}/g, data.catalogSettings.bankInfo.alias);
    setWaCustomMessage(populated);
  };

  const handleSendWaMessage = (appType: WhatsAppAppType = 'business') => {
    if (!waModalOrder) return;
    openWhatsAppDirect(waModalOrder.clientPhone, waCustomMessage, appType);
    setWaModalOrder(null);
  };

  const statusColors: Record<OrderStatus, { bg: string; text: string; label: string }> = {
    pendiente: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-700', label: 'Pendiente' },
    en_produccion: { bg: 'bg-purple-50 text-purple-800 border-purple-200', text: 'text-purple-700', label: 'En Producción' },
    listo: { bg: 'bg-blue-50 text-blue-800 border-blue-200', text: 'text-blue-700', label: 'Listo p/ Entrega' },
    entregado: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-700', label: 'Entregado' },
    cancelado: { bg: 'bg-rose-50 text-rose-800 border-rose-200', text: 'text-rose-700', label: 'Cancelado' },
  };

  const deliveryMethodLabels: Record<DeliveryMethod, string> = {
    retirar: 'Retiro en taller gratis',
    domicilio: 'Envío a domicilio (cotizado por WhatsApp)',
    correo_argentino: 'Envío por Correo Argentino',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900">
            Control de Pedidos
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Seguimiento de pedidos, edición de productos agregados, pagos parciales y comunicación por WhatsApp
          </p>
        </div>

        {/* Action Buttons: Manual Order, Export PDF/CSV & Toggle View */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenCreateOrderModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Pedido Manual</span>
          </button>

          <button
            onClick={() => setOrdersCompactView(!ordersCompactView)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              ordersCompactView
                ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <List className="w-4 h-4" />
            <span>{ordersCompactView ? 'Visión Reducida Activa' : 'Activar Visión Reducida'}</span>
          </button>

          <button
            onClick={() => exportOrdersPDF(filteredOrders)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-pink-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-pink-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => exportOrdersCSV(filteredOrders)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-pink-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-pink-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs">
          <span className="text-xs text-stone-500 font-medium block">Total Facturado</span>
          <span className="text-xl sm:text-2xl font-bold font-serif-brand text-stone-900 mt-1 block">
            {formatCurrency(metrics.totalBilled)}
          </span>
          <span className="text-[11px] text-stone-400">Total ventas registradas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <span className="text-xs text-emerald-600 font-medium block">Total Cobrado</span>
          <span className="text-xl sm:text-2xl font-bold font-serif-brand text-emerald-700 mt-1 block">
            {formatCurrency(metrics.totalCollected)}
          </span>
          <span className="text-[11px] text-emerald-600/70">Ingreso real percibido</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
          <span className="text-xs text-amber-600 font-medium block">Saldo por Cobrar</span>
          <span className="text-xl sm:text-2xl font-bold font-serif-brand text-amber-700 mt-1 block">
            {formatCurrency(metrics.totalPending)}
          </span>
          <span className="text-[11px] text-amber-600/70">Señas o pagos pendientes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
          <span className="text-xs text-purple-600 font-medium block">En Producción</span>
          <span className="text-xl sm:text-2xl font-bold font-serif-brand text-purple-700 mt-1 block">
            {metrics.inProductionCount} pedido(s)
          </span>
          <span className="text-[11px] text-purple-600/70">En confección de taller</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-pink-100 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por Nº de pedido, cliente o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-stone-400 font-semibold px-1 text-[11px]">Estado:</span>
          {['todos', 'pendiente', 'en_produccion', 'listo', 'entregado', 'cancelado'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-pink-50 hover:text-pink-600'
              }`}
            >
              {st === 'todos' ? 'Todos' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-pink-100">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h4 className="font-bold text-stone-700">No hay pedidos con este filtro</h4>
          <p className="text-xs text-stone-400 mt-1">
            Los pedidos enviados desde el catálogo por los clientes aparecerán acá automáticamente.
          </p>
        </div>
      ) : ordersCompactView ? (
        /* Reduced View (Visión Reducida Mobile-Optimized) */
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const stInfo = statusColors[order.status] || statusColors.pendiente;
            const isFullyPaid = order.balanceDue <= 0 || (order.amountPaid || 0) >= order.totalAmount;
            return (
              <div
                key={order.id}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-pink-100/90 shadow-xs hover:border-pink-300 transition-all space-y-2.5"
              >
                {/* Header Row: Order Number, Date, Status Dropdown */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm font-extrabold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-100">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[11px] text-stone-400 flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border outline-hidden cursor-pointer ${stInfo.bg}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_produccion">En Producción</option>
                      <option value="listo">Listo</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Client Information */}
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs">
                      {order.clientName ? order.clientName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-stone-900 text-sm sm:text-base block truncate">
                        {order.clientName}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                        <a
                          href={getWhatsAppUrl(order.clientPhone, `¡Hola ${order.clientName}! Te contactamos de Shaddai Papelería por tu pedido #${order.orderNumber}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>{order.clientPhone}</span>
                        </a>
                        <span>•</span>
                        <span className="text-[11px] text-stone-500 truncate max-w-[150px] sm:max-w-none">
                          🚚 {deliveryMethodLabels[order.deliveryMethod] || order.deliveryMethod}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-100 text-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                    Productos ({order.items.reduce((s, it) => s + it.quantity, 0)}):
                  </span>
                  <p className="text-stone-700 leading-snug">
                    {order.items.map((it, idx) => (
                      <span key={idx} className="inline-block mr-2 font-medium">
                        {it.quantity}x {it.productName}
                        {it.selectedVariants && Object.keys(it.selectedVariants).length > 0 && (
                          <span className="text-pink-600 text-[10px] ml-1">
                            ({Object.values(it.selectedVariants).join(', ')})
                          </span>
                        )}
                      </span>
                    ))}
                  </p>
                </div>

                {/* Financial Summary & Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 flex-wrap">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Total:</span>
                      <span className="font-serif-brand font-bold text-stone-900 text-sm sm:text-base">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>

                    {isFullyPaid ? (
                      <div className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs flex items-center gap-1 border border-emerald-200 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✅ Pagado</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] text-amber-600 font-medium block">Resta cobrar:</span>
                        <span className="font-bold text-amber-700 text-xs sm:text-sm">
                          {formatCurrency(order.balanceDue)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar ml-auto py-0.5 max-w-full">
                    {/* 1. Eliminar pedido */}
                    <button
                      type="button"
                      onClick={() => setOrderToDelete(order)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-stone-200 shrink-0 cursor-pointer"
                      title="Eliminar pedido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* 2. Ver Comprobante */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForReceipt(order)}
                      className="px-2.5 py-1.5 bg-stone-100 hover:bg-pink-50 hover:text-pink-700 text-stone-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-stone-200 shrink-0 cursor-pointer"
                      title="Ver Comprobante del pedido"
                    >
                      <FileText className="w-3.5 h-3.5 text-pink-600" />
                      <span>Comprobante</span>
                    </button>

                    {/* 3. Descargar PDF del comprobante */}
                    <button
                      type="button"
                      onClick={() => generateOrderReceiptPDF(order, data.catalogSettings)}
                      className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-pink-200 shrink-0 cursor-pointer"
                      title="Descargar comprobante en PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-pink-600" />
                      <span>PDF</span>
                    </button>

                    {/* 4. Enviar mensaje por WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleOpenWaModal(order)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
                      title="Elegir plantilla y enviar por WhatsApp Business o Común"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {/* 5. Cobrar / Seña */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderForPayment(order);
                        setPaymentAmount(order.balanceDue > 0 ? String(order.balanceDue) : '');
                        setPaymentDate(getLocalTodayString());
                      }}
                      className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-stone-200 shrink-0 cursor-pointer"
                      title="Anotar cobro o seña"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-stone-600" />
                      <span>Cobrar</span>
                    </button>

                    {/* 6. Modificar */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditOrder(order)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200 shrink-0 cursor-pointer"
                      title="Modificar pedido"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const stInfo = statusColors[order.status] || statusColors.pendiente;
            return (
              <div
                key={order.id}
                className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-pink-600">
                          {order.orderNumber}
                        </span>
                        <button
                          onClick={() => handleOpenEditOrder(order)}
                          className="text-[11px] text-pink-600 hover:text-pink-700 underline font-semibold flex items-center gap-0.5"
                          title="Editar productos o datos del pedido"
                        >
                          <Edit className="w-3 h-3" /> Editar
                        </button>
                      </div>
                      <h3 className="font-bold text-base text-stone-800">
                        {order.clientName}
                      </h3>
                      <p className="text-xs text-stone-500">{order.clientPhone}</p>
                    </div>

                    <div className="text-right">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border outline-hidden cursor-pointer ${stInfo.bg}`}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_produccion">En Producción</option>
                        <option value="listo">Listo p/ Entrega</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <span className="text-[10px] text-stone-400 block mt-1">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Delivery & Payment Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11px]">
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-lg">
                      🚚 {deliveryMethodLabels[order.deliveryMethod] || order.deliveryMethod}
                    </span>
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-lg capitalize">
                      💳 {order.paymentMethod}
                    </span>
                    {order.clientAddress && (
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-lg truncate max-w-xs">
                        📍 {order.clientAddress}
                      </span>
                    )}
                  </div>

                  {/* Products in this order */}
                  <div className="mt-3 space-y-1.5 bg-stone-50/70 p-3 rounded-2xl border border-stone-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      Productos:
                    </span>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-stone-700">
                        <div>
                          <span className="font-medium">
                            {item.quantity}x {item.productName}
                          </span>
                          {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                            <span className="text-[10px] text-pink-700 block ml-2">
                              {Object.entries(item.selectedVariants)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' | ')}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold shrink-0 ml-2">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {order.notes && (
                      <p className="text-[11px] text-stone-500 italic pt-1 border-t border-stone-200">
                        Nota: "{order.notes}"
                      </p>
                    )}
                  </div>

                  {/* Balances and Partial Payments with Date Edit & Delete (Requested by user) */}
                  <div className="mt-3 p-3 bg-pink-50/50 rounded-2xl border border-pink-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Total facturado:</span>
                      <span className="font-bold text-stone-800">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Total cobrado (señas):</span>
                      <span className="font-bold">{formatCurrency(order.amountPaid || 0)}</span>
                    </div>
                    {(order.balanceDue <= 0 || (order.amountPaid || 0) >= order.totalAmount) ? (
                      <div className="flex justify-between items-center text-emerald-800 font-extrabold pt-1.5 border-t border-emerald-200 bg-emerald-50/80 px-2 py-1.5 rounded-xl mt-1">
                        <span className="flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Estado de cobro:
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-2xs">
                          ✅ PAGADO
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-amber-700 font-bold pt-1 border-t border-pink-200">
                        <span>Saldo por cobrar:</span>
                        <span className="text-amber-800 font-extrabold">{formatCurrency(order.balanceDue || 0)}</span>
                      </div>
                    )}

                    {order.partialPayments && order.partialPayments.length > 0 && (
                      <div className="pt-2 mt-1 border-t border-pink-200 text-xs space-y-1.5 text-stone-600">
                        <span className="font-bold block text-stone-700 text-[11px]">
                          Historial de pagos recibidos:
                        </span>
                        {order.partialPayments.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 bg-white/95 rounded-xl border border-pink-100 text-[11px] space-y-1 shadow-2xs w-full max-w-full overflow-hidden"
                          >
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {editingPaymentId === p.id ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <input
                                      type="date"
                                      value={tempPaymentDate}
                                      onChange={(e) => setTempPaymentDate(e.target.value)}
                                      className="p-1 bg-white border border-pink-300 rounded-lg text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (tempPaymentDate) {
                                          updatePartialPaymentDate(order.id, p.id, tempPaymentDate);
                                        }
                                        setEditingPaymentId(null);
                                      }}
                                      className="px-2 py-0.5 bg-pink-600 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                    >
                                      OK
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPaymentId(null)}
                                      className="text-stone-400 hover:text-stone-600 text-xs px-1 cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPaymentId(p.id);
                                      setTempPaymentDate(p.date);
                                    }}
                                    className="font-semibold text-stone-700 hover:text-pink-600 flex items-center gap-1 cursor-pointer bg-stone-50 hover:bg-pink-50 px-2 py-0.5 rounded-md border border-stone-200"
                                    title="Editar fecha de este pago"
                                  >
                                    <Calendar className="w-3 h-3 text-pink-500" />
                                    <span>{formatDate(p.date)}</span>
                                    <span className="text-[9px] text-pink-500 font-normal">✏️</span>
                                  </button>
                                )}
                                <span className="capitalize text-stone-500 text-[10px] bg-stone-100 px-1.5 py-0.5 rounded">
                                  {p.method}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                <span className="font-extrabold text-emerald-700 text-xs">
                                  +{formatCurrency(p.amount)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `¿Eliminar este pago de ${formatCurrency(p.amount)}? El saldo se actualizará automáticamente.`
                                      )
                                    ) {
                                      deletePartialPayment(order.id, p.id);
                                    }
                                  }}
                                  className="text-stone-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Eliminar este pago"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {p.note && (
                              <p className="text-[10px] text-stone-500 italic bg-stone-50/80 p-1 rounded-md border border-stone-100">
                                "{p.note}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions in One Single Row */}
                <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar pt-2 border-t border-stone-100 w-full">
                  {/* 1. Eliminar pedido */}
                  <button
                    type="button"
                    onClick={() => setOrderToDelete(order)}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-stone-200 shrink-0 cursor-pointer"
                    title="Eliminar pedido"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* 2. Ver Comprobante */}
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForReceipt(order)}
                    className="px-2.5 py-1.5 bg-stone-100 hover:bg-pink-50 hover:text-pink-700 text-stone-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-stone-200 shrink-0 cursor-pointer"
                    title="Ver Comprobante del pedido"
                  >
                    <FileText className="w-3.5 h-3.5 text-pink-600" />
                    <span>Comprobante</span>
                  </button>

                  {/* 3. Descargar PDF del comprobante */}
                  <button
                    type="button"
                    onClick={() => generateOrderReceiptPDF(order, data.catalogSettings)}
                    className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-pink-200 shrink-0 cursor-pointer"
                    title="Descargar comprobante en PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-pink-600" />
                    <span>PDF</span>
                  </button>

                  {/* 4. Enviar mensaje por WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleOpenWaModal(order)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
                    title="Elegir plantilla y enviar por WhatsApp Business o Común"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  {/* 5. Cobrar / Seña */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderForPayment(order);
                      setPaymentAmount(order.balanceDue > 0 ? String(order.balanceDue) : '');
                      setPaymentDate(getLocalTodayString());
                    }}
                    className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-stone-200 shrink-0 cursor-pointer"
                    title="Anotar cobro o seña"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-stone-600" />
                    <span>Cobrar</span>
                  </button>

                  {/* 6. Modificar */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditOrder(order)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200 shrink-0 cursor-pointer"
                    title="Modificar pedido"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Existing Order Modal (Requested by user) */}
      {editingOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-pink-100 p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100 shrink-0">
              <div>
                <h3 className="font-serif-brand font-bold text-xl text-stone-900">
                  Editar Pedido #{editingOrder.orderNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  Agregá o eliminá productos, cambiá cantidades o variantes
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedOrder} className="flex-1 overflow-y-auto space-y-4 pr-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Cliente *</label>
                    <input
                      type="text"
                      required
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={editClientPhone}
                      onChange={(e) => setEditClientPhone(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                </div>

              {/* Items in Order */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 block">
                  Productos en este pedido
                </label>

                <div className="space-y-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  {editItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2 bg-white rounded-xl border border-stone-200 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-stone-800 block truncate">
                          {item.productName}
                        </span>
                        {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                          <span className="text-[10px] text-pink-700 block">
                            {Object.entries(item.selectedVariants)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </span>
                        )}
                        <span className="text-[11px] text-pink-600 font-semibold">
                          {formatCurrency(item.price)} c/u
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                          className="w-6 h-6 bg-stone-100 hover:bg-stone-200 rounded font-bold text-stone-600"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                          className="w-6 h-6 bg-stone-100 hover:bg-stone-200 rounded font-bold text-stone-600"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="font-serif-brand font-bold block">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductFromEditedOrder(idx)}
                          className="text-[10px] text-red-500 hover:underline"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new product to this order */}
                <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-200 space-y-2">
                  <span className="text-xs font-bold text-pink-900 block">
                    + Agregar otro producto al pedido:
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedProductToAdd}
                      onChange={(e) => {
                        setSelectedProductToAdd(e.target.value);
                        setSelectedVariantToAdd({});
                      }}
                      className="flex-1 p-2 bg-white border border-pink-200 rounded-xl text-xs outline-hidden"
                    >
                      <option value="">-- Seleccionar producto del catálogo --</option>
                      {data.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {formatCurrency(p.finalPrice)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddProductToEditedOrder}
                      disabled={!selectedProductToAdd}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0"
                    >
                      Añadir al Pedido
                    </button>
                  </div>

                  {/* If product has variants, allow selecting them */}
                  {selectedProductToAdd && (
                    (() => {
                      const selProd = data.products.find((p) => p.id === selectedProductToAdd);
                      if (!selProd?.variants || selProd.variants.length === 0) return null;
                      return (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {selProd.variants.map((v, vIdx) => (
                            <div key={`${v.name}-${vIdx}`}>
                              <label className="text-[10px] font-semibold text-stone-600 block">
                                {v.name}:
                              </label>
                              <select
                                value={
                                  selectedVariantToAdd[v.name] ||
                                  (typeof v.options[0] === 'string'
                                    ? v.options[0]
                                    : v.options[0]?.name || '')
                                }
                                onChange={(e) =>
                                  setSelectedVariantToAdd((prev) => ({
                                    ...prev,
                                    [v.name]: e.target.value,
                                  }))
                                }
                                className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                              >
                                {v.options.map((opt, optIdx) => {
                                  const optName = typeof opt === 'string' ? opt : opt.name;
                                  const optPrice = typeof opt === 'string' ? undefined : opt.price;
                                  return (
                                    <option key={`${optName}-${optIdx}`} value={optName}>
                                      {optName} {optPrice ? `(+${formatCurrency(optPrice)})` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Delivery & Shipping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Método de Entrega
                  </label>
                  <select
                    value={editDeliveryMethod}
                    onChange={(e) => setEditDeliveryMethod(e.target.value as DeliveryMethod)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  >
                    <option value="retirar">Retiro en taller gratis</option>
                    <option value="domicilio">Envío a domicilio</option>
                    <option value="correo_argentino">Envíos por Correo Argentino</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Costo de Envío Acordado ($)
                  </label>
                    <input
                      type="number"
                      min="0"
                      value={editShippingCost === '0' ? '' : editShippingCost}
                      placeholder="0"
                      onChange={(e) => setEditShippingCost(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Dirección de Entrega
                  </label>
                  <input
                    type="text"
                    value={editClientAddress}
                    onChange={(e) => setEditClientAddress(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Notas / Aclaraciones
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden resize-none"
                  />
                </div>

                <div className="p-3 bg-stone-100 rounded-2xl flex items-center justify-between text-xs font-bold">
                  <span>Nuevo Total Calculado:</span>
                  <span className="font-serif-brand text-base text-pink-700">
                    {formatCurrency(
                      editItems.reduce((acc, it) => acc + it.price * it.quantity, 0) +
                        (parseFloat(editShippingCost) || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex gap-2 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="flex-1 py-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 transition-all cursor-pointer"
                >
                  Guardar Cambios del Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
        )}

        {/* Partial Payment Modal */}
        {selectedOrderForPayment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-pink-100 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-stone-50/70 shrink-0">
                <div>
                  <h3 className="font-serif-brand font-bold text-lg text-stone-800">
                    Registrar Pago / Seña
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pedido #{selectedOrderForPayment.orderNumber} - {selectedOrderForPayment.clientName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrderForPayment(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPaymentSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="p-3 bg-pink-50 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-600">Total del pedido:</span>
                      <span className="font-bold text-stone-800">
                        {formatCurrency(selectedOrderForPayment.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Total ya abonado:</span>
                      <span className="font-bold">
                        {formatCurrency(selectedOrderForPayment.amountPaid || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-pink-200 pt-1 font-bold text-pink-700">
                      <span>Saldo pendiente actual:</span>
                      <span className="font-extrabold">
                        {formatCurrency(selectedOrderForPayment.balanceDue)}
                      </span>
                    </div>
                  </div>

                  {selectedOrderForPayment.partialPayments && selectedOrderForPayment.partialPayments.length > 0 && (
                    <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1 max-h-28 overflow-y-auto">
                      <span className="font-bold text-stone-600 text-[10px] uppercase block">
                        Pagos previos registrados:
                      </span>
                      {selectedOrderForPayment.partialPayments.map((p) => (
                        <div key={p.id} className="flex justify-between text-[11px] text-stone-600">
                          <span>{formatDate(p.date)} ({p.method})</span>
                          <span className="font-bold text-emerald-700">+{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      Monto recibido ($) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder={String(selectedOrderForPayment.balanceDue)}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-pink-500 outline-hidden font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      Fecha del pago *
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:border-pink-500 outline-hidden font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      Método de pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                    >
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      Detalle / Nota
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Seña del 50%, Comprobante MP"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:border-pink-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex gap-2 shrink-0 z-10 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForPayment(null)}
                    className="flex-1 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 cursor-pointer"
                  >
                    Confirmar Pago
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* WhatsApp Quick Message Modal with Live Editing & Custom Templates */}
        {waModalOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-pink-100 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-stone-50/70 shrink-0">
                <div>
                  <h3 className="font-serif-brand font-bold text-lg text-stone-800">
                    Mensaje de WhatsApp para {waModalOrder.clientName}
                  </h3>
                  <p className="text-xs text-stone-500">
                    #{waModalOrder.orderNumber} • Tel: {waModalOrder.clientPhone}
                  </p>
                </div>
                <button
                  onClick={() => setWaModalOrder(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Template selector pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block">
                    Elegir plantilla de mensaje:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectTemplate(
                          'Saludo Inicial',
                          data.catalogSettings.whatsappTemplates.orderGreeting ||
                            '¡Hola {cliente}! 💕 Te contactamos de Shaddai Papelería respecto a tu pedido *#{pedido}*. ¡Muchas gracias por tu compra!'
                        )
                      }
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTemplateTitle === 'Saludo Inicial'
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-pink-50'
                      }`}
                    >
                      💬 Saludo
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSelectTemplate(
                          'En Producción',
                          data.catalogSettings.whatsappTemplates.inProduction ||
                            '¡Hola {cliente}! ✨ Tu pedido *#{pedido}* ya ingresó a etapa de *producción artesanal* en el taller. En breve te avisamos cuando esté terminado 🌸.'
                        )
                      }
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTemplateTitle === 'En Producción'
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-pink-50'
                      }`}
                    >
                      ✨ En Producción
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSelectTemplate(
                          'Listo para Entrega',
                          data.catalogSettings.whatsappTemplates.readyForDelivery ||
                            '¡Hola {cliente}! 📦 Tu pedido *#{pedido}* ya está *LISTO* para retirar o coordinar envío. ¡Quedó hermoso!'
                        )
                      }
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTemplateTitle === 'Listo para Entrega'
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-pink-50'
                      }`}
                    >
                      📦 Listo
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSelectTemplate(
                          'Recordatorio Pago',
                          data.catalogSettings.whatsappTemplates.receiptReminder ||
                            'Hola {cliente}, ¿cómo estás? Te recordamos que tenés un saldo pendiente de *{saldo}* para tu pedido *#{pedido}*. Podés transferir al Alias: *{alias}*. ¡Muchas gracias!'
                        )
                      }
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTemplateTitle === 'Recordatorio Pago'
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-pink-50'
                      }`}
                    >
                      💳 Recordatorio Pago
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!waModalOrder) return;
                        setActiveTemplateTitle('Comprobante Completo');
                        const isPaid =
                          waModalOrder.balanceDue <= 0 ||
                          (waModalOrder.amountPaid || 0) >= waModalOrder.totalAmount;
                        const itemsList = waModalOrder.items
                          .map(
                            (it) =>
                              `• ${it.quantity}x ${it.productName}${
                                it.selectedVariants && Object.keys(it.selectedVariants).length > 0
                                  ? ` (${Object.values(it.selectedVariants).join(', ')})`
                                  : ''
                              } - ${formatCurrency(it.price * it.quantity)}`
                          )
                          .join('\n');
                        const bankDetails =
                          !isPaid && (data.catalogSettings.bankInfo?.cbu || data.catalogSettings.bankInfo?.alias)
                            ? `\n\n*Datos para transferir:*\n${
                                data.catalogSettings.bankInfo.alias ? `Alias: ${data.catalogSettings.bankInfo.alias}\n` : ''
                              }${data.catalogSettings.bankInfo.cbu ? `CBU: ${data.catalogSettings.bankInfo.cbu}\n` : ''}${
                                data.catalogSettings.bankInfo.titular ? `Titular: ${data.catalogSettings.bankInfo.titular}` : ''
                              }`
                            : '';
                        const msg = `¡Hola ${waModalOrder.clientName}! 💕 Te compartimos el comprobante de tu pedido *#${waModalOrder.orderNumber}* de Shaddai Papelería:\n\n*Productos:*\n${itemsList}\n\n*Total del Pedido:* ${formatCurrency(
                          waModalOrder.totalAmount
                        )}\n*Total Abonado:* ${formatCurrency(
                          waModalOrder.amountPaid || 0
                        )}\n*Estado:* ${
                          isPaid ? '✅ PAGADO EN SU TOTALIDAD' : `Saldo pendiente: ${formatCurrency(waModalOrder.balanceDue)}`
                        }${bankDetails}\n\n¡Muchas gracias por elegirnos! 🌸`;
                        setWaCustomMessage(msg);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTemplateTitle === 'Comprobante Completo'
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-pink-50'
                      }`}
                    >
                      🧾 Comprobante
                    </button>

                    {/* Custom templates */}
                    {(data.catalogSettings.customTemplates || []).map((ct) => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => handleSelectTemplate(ct.title, ct.message)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          activeTemplateTitle === ct.title
                            ? 'bg-pink-600 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-700 hover:bg-pink-50'
                        }`}
                      >
                        ★ {ct.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Editable Textarea */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Texto del mensaje (podés editarlo antes de enviarlo):
                  </label>
                  <textarea
                    rows={4}
                    value={waCustomMessage}
                    onChange={(e) => setWaCustomMessage(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs focus:bg-white focus:border-pink-500 outline-hidden leading-relaxed"
                  />
                </div>

                {/* Add current text as new template */}
                <div className="pt-1">
                  {isAddingNewTemplate ? (
                    <div className="flex items-center gap-2 p-2.5 bg-pink-50 rounded-2xl border border-pink-200">
                      <input
                        type="text"
                        placeholder="Título de la nueva plantilla (ej: Envío Despachado)..."
                        value={newTemplateTitle}
                        onChange={(e) => setNewTemplateTitle(e.target.value)}
                        className="flex-1 p-1.5 bg-white border border-pink-300 rounded-xl text-xs outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTemplateTitle.trim() && waCustomMessage.trim()) {
                            addCustomWhatsAppTemplate(newTemplateTitle, waCustomMessage);
                            setIsAddingNewTemplate(false);
                            setNewTemplateTitle('');
                          }
                        }}
                        className="px-3 py-1.5 bg-pink-600 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewTemplate(false)}
                        className="text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewTemplate(true)}
                      className="text-[11px] font-semibold text-pink-600 hover:underline cursor-pointer"
                    >
                      + Guardar este texto como nueva plantilla reutilizable
                    </button>
                  )}
                </div>
              </div>

              {/* Sticky footer action buttons with WhatsApp Business or Standard choice */}
              <div className="sticky bottom-0 bg-white border-t border-stone-200 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setWaModalOrder(null)}
                  className="py-2.5 px-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold cursor-pointer order-last sm:order-first"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWaMessage('business')}
                  className="flex-1 py-2.5 sm:py-3 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  title="Enviar abriendo la aplicación WhatsApp Business"
                >
                  <Briefcase className="w-4 h-4 text-emerald-200" />
                  <span>WhatsApp Business</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWaMessage('standard')}
                  className="flex-1 py-2.5 sm:py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  title="Enviar abriendo la aplicación WhatsApp estándar / común"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-100" />
                  <span>WhatsApp Común</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Order Creation Modal */}
        {isCreateOrderModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-pink-100 p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-pink-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-pink-200">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif-brand font-bold text-xl text-stone-900">
                      Crear Nuevo Pedido Manual
                    </h3>
                    <p className="text-xs text-stone-500">
                      Registrá un pedido recibido en el taller, por WhatsApp o en persona
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOrderModalOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrderSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Client Picker: Existing Client or New Client */}
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-pink-600" />
                        <span>Cliente para el pedido</span>
                      </label>
                      <span className="text-[10px] text-stone-400">
                        {selectedClientId === 'new' ? 'Registrando cliente nuevo' : 'Cliente existente seleccionado'}
                      </span>
                    </div>

                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientSelectChange(e.target.value)}
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:border-pink-500 outline-hidden"
                    >
                      <option value="new">+ Escribir datos de un cliente nuevo</option>
                      {data.clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}) - {c.totalOrders || 0} pedidos anteriores
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-xs font-semibold text-stone-600 block mb-1">Nombre y Apellido *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Luciana Gómez"
                          value={newOrderClientName}
                          onChange={(e) => setNewOrderClientName(e.target.value)}
                          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-600 block mb-1">WhatsApp / Teléfono *</label>
                        <input
                          type="tel"
                          required
                          placeholder="Ej: 1123456789"
                          value={newOrderClientPhone}
                          onChange={(e) => setNewOrderClientPhone(e.target.value)}
                          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-600 block mb-1">Dirección / Localidad</label>
                        <input
                          type="text"
                          placeholder="Ej: Av. San Martín 1234, Ramos Mejía"
                          value={newOrderClientAddress}
                          onChange={(e) => setNewOrderClientAddress(e.target.value)}
                          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-600 block mb-1">Email (opcional)</label>
                        <input
                          type="email"
                          placeholder="cliente@ejemplo.com"
                          value={newOrderClientEmail}
                          onChange={(e) => setNewOrderClientEmail(e.target.value)}
                          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Order Date and Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-pink-600" />
                        <span>Fecha del Pedido *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={newOrderDate}
                        onChange={(e) => setNewOrderDate(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:border-pink-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">Estado Inicial del Pedido</label>
                      <select
                        value={newOrderStatus}
                        onChange={(e) => setNewOrderStatus(e.target.value as OrderStatus)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:border-pink-500 outline-hidden"
                      >
                        <option value="pendiente">Pendiente (por confirmar)</option>
                        <option value="en_produccion">En Producción (taller)</option>
                        <option value="listo">Listo para entregar</option>
                        <option value="entregado">Entregado / Finalizado</option>
                      </select>
                    </div>
                  </div>

                  {/* Product items picker */}
                  <div className="p-3.5 bg-pink-50/50 rounded-2xl border border-pink-100 space-y-3">
                    <span className="text-xs font-bold text-pink-900 block flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-pink-600" />
                      <span>Agregar Productos al Pedido</span>
                    </span>

                    {/* 1. Seleccionar Producto y Cantidad */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-8">
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          1. Elegir Producto del Catálogo
                        </label>
                        <select
                          value={pickerProductId}
                          onChange={(e) => handleSelectProductToNewOrder(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden"
                        >
                          <option value="">-- Seleccionar producto del catálogo --</option>
                          {data.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} - {formatCurrency(p.finalPrice)}
                              {p.promoActive ? ' (¡En Oferta!)' : ''}
                              {p.type === 'stock' ? ` [Stock: ${p.stockQuantity}]` : ' [Por Encargo]'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          2. Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={pickerQuantity}
                          onChange={(e) => setPickerQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs text-center font-bold outline-hidden"
                        />
                      </div>
                    </div>

                    {/* 2. Variantes al final (con cálculo automático de oferta en pesos o %) */}
                    {pickerProductId && (() => {
                      const prod = data.products.find((p) => p.id === pickerProductId);
                      if (!prod) return null;

                      return (
                        <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-200/80 space-y-2 mt-2">
                          {prod.variants && prod.variants.length > 0 && (
                            <div>
                              <span className="text-[11px] font-bold text-pink-700 block mb-1.5">
                                3. Elegí la variante del producto (opcional):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {prod.variants.map((v, vIdx) => (
                                  <div key={`${v.name}-${vIdx}`} className="bg-white p-2 rounded-xl border border-pink-100">
                                    <label className="text-[10px] text-stone-500 font-bold block mb-1">{v.name}:</label>
                                    <select
                                      value={pickerVariant[v.name] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setPickerVariant((prev) => {
                                          const next = { ...prev };
                                          if (!val) {
                                            delete next[v.name];
                                          } else {
                                            next[v.name] = val;
                                          }
                                          return next;
                                        });

                                        if (val) {
                                          const optObj = v.options.find((o) => (typeof o === 'string' ? o : o.name) === val);
                                          if (optObj) {
                                            const finalOptPrice = calculateOptionPrice(prod, optObj);
                                            setPickerPrice(String(finalOptPrice));
                                          }
                                        } else {
                                          // Revert back to base product final price if deselected
                                          setPickerPrice(String(prod.finalPrice));
                                        }
                                      }}
                                      className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                                    >
                                      <option value="">-- Sin variante / Estándar ({formatCurrency(prod.finalPrice)}) --</option>
                                      {v.options.map((opt, optIdx) => {
                                        const optName = typeof opt === 'string' ? opt : opt.name;
                                        const optCalcPrice = calculateOptionPrice(prod, opt);
                                        return (
                                          <option key={`${optName}-${optIdx}`} value={optName}>
                                            {optName} — {formatCurrency(optCalcPrice)}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 4. Precio Unitario Final y Botón Agregar */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-1">
                            <div className="sm:col-span-6">
                              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                                Precio Unitario Calculado ($)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-stone-400 font-bold text-xs">$</span>
                                <input
                                  type="number"
                                  value={pickerPrice}
                                  onChange={(e) => setPickerPrice(e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-6 pr-2 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-pink-500"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-6">
                              <button
                                type="button"
                                onClick={handleAddItemToNewOrder}
                                disabled={!pickerProductId}
                                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-pink-200 cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Agregar al Pedido</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* List of items added */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wide block">
                        Productos en este pedido ({newOrderItems.length}):
                      </span>
                      {newOrderItems.length === 0 ? (
                        <p className="text-xs text-stone-400 italic">No hay productos agregados todavía.</p>
                      ) : (
                        newOrderItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-white rounded-xl border border-stone-200 text-xs gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-stone-800 block truncate">
                                {item.productName}
                              </span>
                              {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                <span className="text-[10px] text-pink-600 block">
                                  {Object.entries(item.selectedVariants)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(' | ')}
                                </span>
                              )}
                              <span className="text-[11px] text-stone-400">
                                {formatCurrency(item.price)} c/u
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateNewOrderItemQty(idx, -1)}
                                className="w-6 h-6 bg-stone-100 hover:bg-stone-200 rounded-lg font-bold text-stone-600 flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-bold text-stone-800">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateNewOrderItemQty(idx, 1)}
                                className="w-6 h-6 bg-stone-100 hover:bg-stone-200 rounded-lg font-bold text-stone-600 flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <span className="font-bold text-pink-700 w-20 text-right shrink-0">
                              {formatCurrency(item.price * item.quantity)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveNewOrderItem(idx)}
                              className="p-1 text-stone-400 hover:text-red-500 rounded-lg"
                              title="Quitar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Delivery & Shipping */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">
                        Método de Entrega
                      </label>
                      <select
                        value={newOrderDeliveryMethod}
                        onChange={(e) => setNewOrderDeliveryMethod(e.target.value as DeliveryMethod)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                      >
                        <option value="retirar">Retiro en taller gratis</option>
                        <option value="domicilio">Envío a domicilio</option>
                        <option value="correo_argentino">Envíos por Correo Argentino</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">
                        Costo de Envío Acordado ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newOrderShippingCost === '0' ? '' : newOrderShippingCost}
                        placeholder="0"
                        onChange={(e) => setNewOrderShippingCost(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Initial Payment / Seña */}
                  <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3">
                    <span className="text-xs font-bold text-emerald-900 block flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Pago Inicial / Seña Recibida (Opcional)</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">Monto Cobrado ($)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0 (si aún no pagó)"
                          value={newOrderPaymentAmount}
                          onChange={(e) => setNewOrderPaymentAmount(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold outline-hidden focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">Forma de Pago</label>
                        <select
                          value={newOrderPaymentMethod}
                          onChange={(e) => setNewOrderPaymentMethod(e.target.value as PaymentMethod)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden"
                        >
                          <option value="transferencia">Transferencia Bancaria</option>
                          <option value="efectivo">Efectivo</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">Fecha del Cobro</label>
                        <input
                          type="date"
                          value={newOrderPaymentDate}
                          onChange={(e) => setNewOrderPaymentDate(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Notas / Observaciones</label>
                    <textarea
                      rows={2}
                      placeholder="Detalles sobre personalización, fecha límite de entrega, etc."
                      value={newOrderNotes}
                      onChange={(e) => setNewOrderNotes(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden resize-none"
                    />
                  </div>

                  {/* Financial Summary */}
                  <div className="p-3.5 bg-stone-100/90 rounded-2xl text-xs space-y-1.5 font-semibold">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal productos:</span>
                      <span>{formatCurrency(newOrderSubtotal)}</span>
                    </div>
                    {newOrderShipping > 0 && (
                      <div className="flex justify-between text-stone-600">
                        <span>Costo de envío:</span>
                        <span>{formatCurrency(newOrderShipping)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-stone-900 font-bold text-sm pt-1 border-t border-stone-200">
                      <span>Total del pedido:</span>
                      <span className="font-serif-brand font-extrabold text-pink-700 text-base">
                        {formatCurrency(newOrderTotal)}
                      </span>
                    </div>
                    {newOrderPaid > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Monto abonado:</span>
                        <span>{formatCurrency(newOrderPaid)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                      <span>Estado del cobro:</span>
                      {newOrderBalance <= 0 && newOrderTotal > 0 ? (
                        <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full">
                          ✅ PAGADO
                        </span>
                      ) : (
                        <span className="text-amber-700 font-extrabold">
                          Saldo restante: {formatCurrency(newOrderBalance)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex gap-2 shrink-0 z-10 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateOrderModalOpen(false)}
                    className="flex-1 py-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 transition-all cursor-pointer"
                  >
                    Guardar y Registrar Pedido
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Digital Receipt Modal (Comprobante de Pedido - Ticket Exacto de Referencia, Zero-Scroll) */}
        {selectedOrderForReceipt && (() => {
          const isPaid =
            selectedOrderForReceipt.balanceDue <= 0 ||
            (selectedOrderForReceipt.amountPaid || 0) >= selectedOrderForReceipt.totalAmount;

          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 p-4 sm:p-5 flex flex-col justify-between max-h-[96vh] overflow-hidden">
                {/* Modal Top Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-pink-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-stone-900">
                      Comprobante #{selectedOrderForReceipt.orderNumber}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedOrderForReceipt(null)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Voucher Ticket Box (Style exactly matching reference image) */}
                <div className="my-2 p-3.5 bg-white rounded-2xl border border-pink-200/90 font-mono text-[11px] sm:text-xs text-stone-800 space-y-2 overflow-y-auto max-h-[68vh] shadow-xs">
                  {/* Brand Header */}
                  <div className="text-center space-y-0.5">
                    <h2 className="font-bold text-base text-pink-600 tracking-wider">
                      ✨ {data.catalogSettings.appName || 'SHADDAI'} ✨
                    </h2>
                    <p className="text-[10px] text-stone-500 font-sans">
                      {data.catalogSettings.appTagline || 'Hecho con amor, creado con propósito 💖✨'}
                    </p>
                    <p className="text-[9px] text-stone-400">
                      Factura/Comprobante #{selectedOrderForReceipt.orderNumber}
                    </p>
                  </div>

                  {/* Pink Dashed Line */}
                  <div className="border-b border-dashed border-pink-200 my-1" />

                  {/* Client Info */}
                  <div className="space-y-0.5 text-stone-700">
                    <div>
                      <span className="text-stone-500">Cliente: </span>
                      <span className="font-bold text-stone-900">{selectedOrderForReceipt.clientName}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Tel: </span>
                      <span>{selectedOrderForReceipt.clientPhone}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Fecha: </span>
                      <span>{formatDate(selectedOrderForReceipt.createdAt)}</span>
                    </div>
                    {selectedOrderForReceipt.clientAddress && (
                      <div className="truncate">
                        <span className="text-stone-500">Entrega: </span>
                        <span>{selectedOrderForReceipt.clientAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Pink Dashed Line */}
                  <div className="border-b border-dashed border-pink-200 my-1" />

                  {/* Items list */}
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {selectedOrderForReceipt.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-1">
                        <div className="min-w-0 flex-1 truncate">
                          <span>{it.quantity}x {it.productName}</span>
                          {it.selectedVariants && Object.keys(it.selectedVariants).length > 0 && (
                            <span className="text-pink-600 text-[10px] ml-1">
                              ({Object.values(it.selectedVariants).join(', ')})
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 font-bold text-stone-900">
                          {formatCurrency(it.price * it.quantity)}
                        </span>
                      </div>
                    ))}
                    {selectedOrderForReceipt.shippingCost && selectedOrderForReceipt.shippingCost > 0 ? (
                      <div className="flex justify-between items-center text-stone-500">
                        <span>Envío</span>
                        <span>{formatCurrency(selectedOrderForReceipt.shippingCost)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Pink Dashed Line */}
                  <div className="border-b border-dashed border-pink-200 my-1" />

                  {/* Totals Block */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm font-black text-stone-900">
                      <span>Total del Pedido:</span>
                      <span className="text-base">{formatCurrency(selectedOrderForReceipt.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 font-bold">
                      <span>Abonado:</span>
                      <span>{formatCurrency(selectedOrderForReceipt.amountPaid || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center font-black">
                      <span>Saldo Restante:</span>
                      {isPaid ? (
                        <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✅ $ 0 (PAGADO)
                        </span>
                      ) : (
                        <span className="text-pink-600 font-black">
                          {formatCurrency(selectedOrderForReceipt.balanceDue)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bank Info */}
                  {(data.catalogSettings.bankInfo?.alias || data.catalogSettings.bankInfo?.cbu) && (
                    <>
                      <div className="border-b border-dashed border-pink-200 my-1" />
                      <div className="text-[10px] text-stone-600 space-y-0.5 pt-0.5">
                        <p className="font-bold text-stone-700">Datos para transferencia:</p>
                        {data.catalogSettings.bankInfo.alias && (
                          <p>Alias: <span className="font-bold text-stone-800">{data.catalogSettings.bankInfo.alias}</span></p>
                        )}
                        {data.catalogSettings.bankInfo.cbu && (
                          <p>CBU: <span className="font-bold text-stone-800">{data.catalogSettings.bankInfo.cbu}</span></p>
                        )}
                        {data.catalogSettings.bankInfo.titular && (
                          <p>Titular: <span>{data.catalogSettings.bankInfo.titular}</span></p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom Two Big Action Buttons (Matching Screenshot) */}
                <div className="flex gap-2 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => generateOrderReceiptPDF(selectedOrderForReceipt, data.catalogSettings)}
                    className="flex-1 py-2.5 sm:py-3 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-pink-200 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendDirectReceiptWhatsApp(selectedOrderForReceipt, 'business')}
                    className="flex-1 py-2.5 sm:py-3 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-200 cursor-pointer transition-colors"
                    title="Enviar comprobante por WhatsApp Business"
                  >
                    <Briefcase className="w-4 h-4 text-emerald-200" />
                    <span>WA Business</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendDirectReceiptWhatsApp(selectedOrderForReceipt, 'standard')}
                    className="flex-1 py-2.5 sm:py-3 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-200 cursor-pointer transition-colors"
                    title="Enviar comprobante por WhatsApp Común"
                  >
                    <Send className="w-4 h-4" />
                    <span>WA Común</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Reliable Delete Order Confirmation Modal (Works in iFrames & Mobile) */}
        {orderToDelete && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-red-100 p-5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-serif-brand font-bold text-lg text-stone-900">
                  ¿Eliminar Pedido #{orderToDelete.orderNumber}?
                </h3>
                <p className="text-xs text-stone-600">
                  Vas a eliminar el pedido de <span className="font-bold text-stone-800">{orderToDelete.clientName}</span> por un total de <span className="font-bold text-pink-700">{formatCurrency(orderToDelete.totalAmount)}</span>.
                </p>
                <p className="text-[11px] text-red-500 font-medium">
                  Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteOrder(orderToDelete.id);
                    setOrderToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-200 transition-colors cursor-pointer"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
