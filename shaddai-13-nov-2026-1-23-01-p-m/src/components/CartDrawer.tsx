import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/exportUtils';
import { openWhatsAppDirect } from '../utils/whatsappUtils';
import { DeliveryMethod, PaymentMethod } from '../types';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Send,
  Truck,
  CreditCard,
  Banknote,
  Copy,
  Check,
  ShoppingBag,
  MapPin,
  User,
  Phone,
  FileText,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    data,
    addOrder,
  } = useApp();

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPostalCode, setClientPostalCode] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('retirar');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [orderSentSuccess, setOrderSentSuccess] = useState(false);

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Delivery descriptions requested by user:
  // - Retiro en taller gratis.
  // - Envío a domicilio: El costo depende de la zona y el precio es enviado y cotizado por WhatsApp.
  // - Envíos por Correo Argentino: Se realiza envío a cualquier provincia por Correo Argentino y el costo de encomienda se cotiza según tu código postal y se abona también por vía WhatsApp.
  const deliveryOptions = [
    {
      id: 'retirar' as DeliveryMethod,
      title: 'Retiro en taller',
      badge: 'Gratis',
      description: 'Retiro personal y sin cargo por nuestro taller coordinando día y horario.',
    },
    {
      id: 'domicilio' as DeliveryMethod,
      title: 'Envío a domicilio',
      badge: 'Cotizar por WhatsApp',
      description: 'El costo depende de la zona y el precio es enviado y cotizado por WhatsApp.',
    },
    {
      id: 'correo_argentino' as DeliveryMethod,
      title: 'Envíos por Correo Argentino',
      badge: 'Cotizar según C.P.',
      description: 'Se realiza envío a cualquier provincia por Correo Argentino y el costo de encomienda se cotiza según tu código postal y se abona también por vía WhatsApp.',
    },
  ];

  const totalAmount = subtotal; // Base product subtotal; shipping is quoted via WhatsApp if applicable

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getItemKey = (productId: string, selectedVariants?: Record<string, string>) => {
    if (!selectedVariants || Object.keys(selectedVariants).length === 0) return productId;
    return `${productId}_${JSON.stringify(selectedVariants)}`;
  };

  const handleSendOrder = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      alert('Por favor completá tu nombre y teléfono de contacto para el pedido.');
      return;
    }

    if (cart.length === 0) return;

    let shippingNote = '';
    if (deliveryMethod === 'domicilio') {
      shippingNote = 'A cotizar por WhatsApp según zona';
    } else if (deliveryMethod === 'correo_argentino') {
      shippingNote = `A cotizar por WhatsApp para CP: ${clientPostalCode || 'A informar'}`;
    }

    // 1. Create order in system
    const newOrder = await addOrder({
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientAddress: clientAddress.trim() || undefined,
      items: cart,
      subtotal,
      shippingCost: 0,
      shippingNote,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      status: 'pendiente',
      deliveryMethod,
      paymentMethod,
      notes: clientNotes.trim() || undefined,
      partialPayments: [],
    });

    // 2. Format WhatsApp Message
    const deliveryLabels: Record<DeliveryMethod, string> = {
      retirar: 'Retiro en taller gratis',
      domicilio: 'Envío a domicilio (Costo a cotizar por WhatsApp según zona)',
      correo_argentino: `Envío por Correo Argentino (Costo a cotizar según CP: ${clientPostalCode || 'no indicado'})`,
    };

    const paymentLabels: Record<PaymentMethod, string> = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia Bancaria',
    };

    let msg = `*¡HOLA SHADDAI PAPELERÍA!* 💕\nQuiero realizar el siguiente pedido:\n`;
    msg += `📋 *Pedido:* ${newOrder.orderNumber}\n\n`;
    msg += `*PRODUCTOS:*\n`;

    cart.forEach((item) => {
      let variantsStr = '';
      if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
        variantsStr = ` [${Object.entries(item.selectedVariants)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}]`;
      }
      msg += `• ${item.quantity}x ${item.productName}${variantsStr} - ${formatCurrency(item.price * item.quantity)}\n`;
    });

    msg += `\n*Subtotal Productos:* ${formatCurrency(subtotal)}\n`;
    msg += `🚚 *Método de entrega:* ${deliveryLabels[deliveryMethod]}\n`;

    if (deliveryMethod === 'domicilio') {
      msg += `_(El costo de envío a domicilio se cotizará por este chat)_\n`;
    } else if (deliveryMethod === 'correo_argentino') {
      msg += `_(El costo de Correo Argentino se cotizará con el C.P.: ${clientPostalCode || 'consultar'})_\n`;
    }

    msg += `💳 *Forma de pago:* ${paymentLabels[paymentMethod]}\n\n`;

    msg += `*DATOS DEL CLIENTE:*\n`;
    msg += `👤 *Nombre:* ${clientName.trim()}\n`;
    msg += `📱 *Teléfono:* ${clientPhone.trim()}\n`;

    if (clientAddress.trim()) {
      msg += `📍 *Dirección:* ${clientAddress.trim()}\n`;
    }
    if (clientPostalCode.trim()) {
      msg += `📮 *Código Postal:* ${clientPostalCode.trim()}\n`;
    }

    if (paymentMethod === 'transferencia') {
      msg += `\n_Abonaré mediante transferencia bancaria (CBU: ${data.catalogSettings.bankInfo.cbu || 'a convenir'})_\n`;
    }

    if (clientNotes.trim()) {
      msg += `\n📝 *Aclaraciones / Personalización:* ${clientNotes.trim()}\n`;
    }

    msg += `\n¡Aguardo su confirmación y cotización! Muchas gracias 🌸`;

    openWhatsAppDirect(data.catalogSettings.businessWhatsApp, msg);

    setOrderSentSuccess(true);
    clearCart();
    setTimeout(() => {
      setOrderSentSuccess(false);
      setIsCartOpen(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-stone-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-stone-800 text-base">Carrito de Compras</h2>
              <p className="text-xs text-stone-500">
                {cart.length === 0 ? 'Sin productos' : `${cart.length} item(s) agregado(s)`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {orderSentSuccess ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="font-serif-brand text-xl font-bold text-stone-800">
                ¡Pedido Enviado a WhatsApp!
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Tu pedido se registró exitosamente y se abrió el chat de WhatsApp con Shaddai Papelería.
              </p>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 bg-pink-50 text-pink-400 rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-medium text-stone-700">Tu carrito está vacío</h3>
              <p className="text-xs text-stone-400 max-w-xs mx-auto">
                Explorá nuestro catálogo y seleccioná los cuadernos, agendas o detalles que más te gusten.
              </p>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-600 pb-1 border-b border-stone-100">
                  <span>Productos seleccionados</span>
                  <button
                    onClick={clearCart}
                    className="text-pink-600 hover:text-pink-700 flex items-center gap-1 font-normal text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" /> Vaciar
                  </button>
                </div>

                {cart.map((item) => {
                  const key = getItemKey(item.productId, item.selectedVariants);
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100"
                    >
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-14 h-14 object-cover rounded-xl border border-stone-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center text-pink-400 shrink-0">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-stone-800 truncate">
                          {item.productName}
                        </h4>

                        {/* Selected Variants Pill */}
                        {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.selectedVariants).map(([vName, vVal]) => (
                              <span
                                key={vName}
                                className="text-[10px] bg-pink-100/80 text-pink-800 px-1.5 py-0.2 rounded font-medium"
                              >
                                {vName}: {vVal}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-[11px] text-pink-600 font-semibold mt-1">
                          {formatCurrency(item.price)}
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 bg-white px-1.5 py-1 rounded-xl border border-stone-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1, key)}
                          className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-pink-600 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={999}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (!isNaN(v) && v >= 1) {
                              updateCartQuantity(item.productId, v, key);
                            }
                          }}
                          className="w-10 text-center font-bold text-xs text-stone-800 bg-stone-50 border border-stone-200 rounded-md py-0.5 focus:outline-hidden focus:border-pink-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1, key)}
                          className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-pink-600 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId, key)}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Selection */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                  <Truck className="w-3.5 h-3.5 text-pink-600" />
                  <span>Método de entrega</span>
                </label>
                <div className="space-y-2 text-xs">
                  {deliveryOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                        deliveryMethod === opt.id
                          ? 'border-pink-500 bg-pink-50/50 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-pink-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="deliveryMethod"
                            value={opt.id}
                            checked={deliveryMethod === opt.id}
                            onChange={() => setDeliveryMethod(opt.id)}
                            className="text-pink-600 focus:ring-pink-500"
                          />
                          <span className="font-bold text-stone-800">{opt.title}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            opt.id === 'retirar'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 pl-5 leading-relaxed">
                        {opt.description}
                      </p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                  <CreditCard className="w-3.5 h-3.5 text-pink-600" />
                  <span>Forma de pago</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transferencia')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-medium transition-all ${
                      paymentMethod === 'transferencia'
                        ? 'border-pink-500 bg-pink-50 text-pink-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-pink-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-pink-600" />
                    <span>Transferencia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-medium transition-all ${
                      paymentMethod === 'efectivo'
                        ? 'border-pink-500 bg-pink-50 text-pink-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-pink-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Efectivo</span>
                  </button>
                </div>

                {/* If Transferencia: Show bank info with one click copy */}
                {paymentMethod === 'transferencia' && (
                  <div className="mt-2 p-3 bg-pink-50/70 rounded-2xl border border-pink-200 space-y-2 text-xs text-stone-700">
                    <p className="font-bold text-pink-900 text-xs">
                      Datos de la cuenta bancaria:
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">Banco:</span>
                        <span className="font-semibold">{data.catalogSettings.bankInfo.banco}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">Titular:</span>
                        <span className="font-semibold">{data.catalogSettings.bankInfo.titular}</span>
                      </div>
                      <div className="flex items-center justify-between bg-white/80 p-1.5 rounded-lg border border-pink-100">
                        <div>
                          <span className="text-[10px] text-stone-400 block">ALIAS:</span>
                          <span className="font-mono font-bold text-pink-700 text-xs">
                            {data.catalogSettings.bankInfo.alias}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(data.catalogSettings.bankInfo.alias, 'alias')}
                          className="flex items-center gap-1 text-[11px] bg-pink-100 text-pink-700 px-2 py-1 rounded-md hover:bg-pink-200 transition-colors"
                        >
                          {copiedField === 'alias' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'alias' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-white/80 p-1.5 rounded-lg border border-pink-100">
                        <div>
                          <span className="text-[10px] text-stone-400 block">CBU:</span>
                          <span className="font-mono text-[11px] text-stone-700">
                            {data.catalogSettings.bankInfo.cbu}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(data.catalogSettings.bankInfo.cbu, 'cbu')}
                          className="flex items-center gap-1 text-[11px] bg-stone-100 text-stone-600 px-2 py-1 rounded-md hover:bg-stone-200 transition-colors"
                        >
                          {copiedField === 'cbu' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'cbu' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Client Info Fields */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-stone-700 block">Tus datos para el pedido</span>
                <div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="Nombre y Apellido *"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-pink-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="tel"
                      required
                      placeholder="Teléfono / WhatsApp de contacto *"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-pink-500 outline-hidden"
                    />
                  </div>
                </div>

                {deliveryMethod !== 'retirar' && (
                  <div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Dirección de entrega, Ciudad / Localidad"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-pink-500 outline-hidden"
                      />
                    </div>
                  </div>
                )}

                {deliveryMethod === 'correo_argentino' && (
                  <div>
                    <input
                      type="text"
                      placeholder="Código Postal (para cotizar encomienda) *"
                      value={clientPostalCode}
                      onChange={(e) => setClientPostalCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-pink-500 outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                    <textarea
                      rows={2}
                      placeholder="Aclaraciones (nombre para personalizar la tapa, detalles)..."
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-pink-500 outline-hidden resize-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer: Fixed shrink-0 with safe area padding */}
        {cart.length > 0 && !orderSentSuccess && (
          <div className="p-4 sm:p-5 border-t border-pink-100 bg-white space-y-3 shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal Productos:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Envío:</span>
                <span className="font-semibold text-pink-700">
                  {deliveryMethod === 'retirar'
                    ? 'Gratis'
                    : 'A cotizar por WhatsApp'}
                </span>
              </div>
              <div className="flex justify-between text-stone-800 font-bold text-base pt-1 border-t border-stone-100">
                <span>Total Productos:</span>
                <span className="text-pink-600 font-serif-brand text-lg">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <button
              onClick={handleSendOrder}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
            >
              <Send className="w-4 h-4" />
              <span>Pedir por WhatsApp</span>
            </button>
            <p className="text-[11px] text-center text-stone-400">
              Se enviará el detalle del pedido a WhatsApp para coordinar entrega y pago
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
