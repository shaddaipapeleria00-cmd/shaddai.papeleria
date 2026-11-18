import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { APP_LOGO_SRC } from '../data/initialData';
import { exportCatalogPDF } from '../utils/exportUtils';
import { compressImage } from '../utils/imageCompressor';
import {
  Settings,
  CreditCard,
  MessageCircle,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Globe,
  Upload,
  FileDown,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  ShieldCheck,
  Download,
  Wifi,
  WifiOff,
  Zap,
  Smartphone,
  Monitor,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    data,
    updateCatalogSettings,
    addCustomWhatsAppTemplate,
    updateCustomWhatsAppTemplate,
    deleteCustomWhatsAppTemplate,
    isSyncing,
    isRealtimeConnected,
    refreshFromCloud,
  } = useApp();
  const { catalogSettings } = data;

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Custom WhatsApp template inputs
  const [newTmplTitle, setNewTmplTitle] = useState('');
  const [newTmplMsg, setNewTmplMsg] = useState('');
  const [editingTmplId, setEditingTmplId] = useState<string | null>(null);
  const [editingTmplTitle, setEditingTmplTitle] = useState('');
  const [editingTmplMsg, setEditingTmplMsg] = useState('');

  // Local form states
  const [appName, setAppName] = useState(catalogSettings.appName);
  const [appTagline, setAppTagline] = useState(catalogSettings.appTagline);
  const [headerBadge, setHeaderBadge] = useState(catalogSettings.headerBadge);
  const [welcomeDescription, setWelcomeDescription] = useState(catalogSettings.welcomeDescription);
  const [bannerType, setBannerType] = useState<'horizontal' | 'square'>(catalogSettings.bannerType);
  const [bannerUrl, setBannerUrl] = useState(catalogSettings.bannerUrl);

  const [businessWhatsApp, setBusinessWhatsApp] = useState(catalogSettings.businessWhatsApp);
  const [businessEmail, setBusinessEmail] = useState(catalogSettings.businessEmail);

  // Bank Info
  const [banco, setBanco] = useState(catalogSettings.bankInfo.banco);
  const [titular, setTitular] = useState(catalogSettings.bankInfo.titular);
  const [cbu, setCbu] = useState(catalogSettings.bankInfo.cbu);
  const [alias, setAlias] = useState(catalogSettings.bankInfo.alias);
  const [cuit, setCuit] = useState(catalogSettings.bankInfo.cuit);
  const [tipoCuenta, setTipoCuenta] = useState(catalogSettings.bankInfo.tipoCuenta);

  // WhatsApp Templates
  const [orderGreeting, setOrderGreeting] = useState(catalogSettings.whatsappTemplates.orderGreeting);
  const [inProduction, setInProduction] = useState(catalogSettings.whatsappTemplates.inProduction);
  const [readyForDelivery, setReadyForDelivery] = useState(catalogSettings.whatsappTemplates.readyForDelivery);
  const [receiptReminder, setReceiptReminder] = useState(catalogSettings.whatsappTemplates.receiptReminder);

  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCatalogSettings({
      appName,
      appTagline,
      headerBadge,
      welcomeDescription,
      bannerType,
      bannerUrl,
      businessWhatsApp,
      businessEmail,
      bankInfo: {
        banco,
        titular,
        cbu,
        alias,
        cuit,
        tipoCuenta,
      },
      whatsappTemplates: {
        orderGreeting,
        inProduction,
        readyForDelivery,
        receiptReminder,
      },
    });

    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1200, 600, 0.78);
      setBannerUrl(compressed);
    } catch (err) {
      console.warn('Error compressing banner:', err);
    }
    e.target.value = '';
  };

  const handleExportBackup = async () => {
    setIsExportingBackup(true);
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shaddai-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setBackupMessage('¡Copia de seguridad descargada exitosamente!');
    } catch (e) {
      setBackupMessage('Error al exportar copia de seguridad');
    } finally {
      setIsExportingBackup(false);
      setTimeout(() => setBackupMessage(null), 3000);
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || !json.catalogSettings || !Array.isArray(json.products)) {
          alert('El archivo seleccionado no tiene el formato válido de copia de seguridad de Shaddai.');
          return;
        }
        if (confirm('¿Restaurar toda la información desde este archivo de respaldo? Reemplazará la base de datos actual.')) {
          updateCatalogSettings(json.catalogSettings);
          alert('¡Copia de seguridad restaurada exitosamente!');
          window.location.reload();
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900">
              Configuración & Seguridad
            </h2>
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                isRealtimeConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={
                isRealtimeConnected
                  ? 'Conexión activa: los cambios se sincronizan en vivo entre todos tus dispositivos'
                  : 'Reconectando sincronización en tiempo real...'
              }
            >
              {isRealtimeConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>En vivo (Todos los dispositivos)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span>Conectando...</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-stone-500">
            Personalizá tu cuenta bancaria, WhatsApp, banners y administrá copias de seguridad
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Backup Buttons */}
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExportingBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            title="Descargar copia de seguridad completa de la base de datos en JSON"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Descargar Respaldo</span>
          </button>

          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors">
            <Upload className="w-3.5 h-3.5 text-stone-600" />
            <span>Restaurar Respaldo</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => refreshFromCloud()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold shadow-xs hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-pink-600' : ''}`} />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {backupMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{backupMessage}</span>
        </div>
      )}

      {savedMessage && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>¡Configuración guardada y sincronizada exitosamente con la nube!</span>
        </div>
      )}

      {/* Real-Time Multi-Device Synchronization Card (Requested by user) */}
      <div className="bg-gradient-to-br from-emerald-50/90 via-white to-pink-50/50 p-6 rounded-3xl border border-emerald-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-stone-900">
                  Sincronización en Tiempo Real Multi-Dispositivo
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500 text-white shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  ACTIVA
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Todos tus cambios se replican al instante en todos los dispositivos conectados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refreshFromCloud()}
            disabled={isSyncing}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Comprobando nube...' : 'Probar Sincronización Ahora'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-100/80 space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Celulares & Tablets</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Tus clientes y tus celulares ven al momento cualquier producto nuevo, fotos, precios actualizados o cambios de stock.
            </p>
          </div>

          <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-100/80 space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <Monitor className="w-4 h-4 text-emerald-600" />
              <span>Computadoras & PC</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              El panel de pedidos, finanzas y calculadora se sincroniza al instante con los movimientos que hagas desde el celular.
            </p>
          </div>

          <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-100/80 space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sin Recargas Manuales</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Actualización automática por eventos SSE y comprobación continua. No hace falta presionar F5 ni recargar la ventana.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Brand & Header Settings */}
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-pink-50">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-pink-200 shadow-xs bg-white shrink-0">
              <img src={APP_LOGO_SRC} alt="SHADDAI" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-800">
                Identidad de la Aplicación & Encabezado del Catálogo
              </h3>
              <p className="text-xs text-stone-500">
                Configurado como: <span className="font-bold text-pink-700">{appName}</span> - {appTagline}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Nombre Principal de la App *
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:border-pink-500 outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Descripción / Subtítulo Corto
              </label>
              <input
                type="text"
                required
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:border-pink-500 outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Etiqueta Destacada Superior (Badge)
              </label>
              <input
                type="text"
                value={headerBadge}
                onChange={(e) => setHeaderBadge(e.target.value)}
                placeholder="Ej: ✨ Papelería artesanal, cuadernos y diseño con amor"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:border-pink-500 outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Texto de Bienvenida / Descripción del Catálogo
              </label>
              <textarea
                rows={2}
                value={welcomeDescription}
                onChange={(e) => setWelcomeDescription(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:border-pink-500 outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Banner configuration (Horizontal vs Square) */}
          <div className="pt-3 border-t border-pink-50 space-y-3">
            <label className="text-xs font-bold text-stone-700 block">
              Formato de Portada / Banner del Catálogo
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBannerType('horizontal')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  bannerType === 'horizontal'
                    ? 'bg-pink-50 text-pink-900 border-pink-500 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200'
                }`}
              >
                Banner Horizontal (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setBannerType('square')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  bannerType === 'square'
                    ? 'bg-pink-50 text-pink-900 border-pink-500 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200'
                }`}
              >
                Banner Cuadrado
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="URL de la imagen de portada..."
                className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden w-full"
              />
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold shrink-0 transition-colors">
                <Upload className="w-3.5 h-3.5 text-pink-600" />
                <span>Subir imagen</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 2. Bank Information for Transfers */}
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-pink-50">
            <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-800">
                Datos de Cuenta Bancaria para Transferencias
              </h3>
              <p className="text-xs text-stone-500">
                Estos datos se muestran al cliente en el carrito con botón de copia rápida de CBU y Alias
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Banco o Billetera Virtual *
              </label>
              <input
                type="text"
                required
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ej: Banco Santander / Mercado Pago"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Titular de la Cuenta *
              </label>
              <input
                type="text"
                required
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                placeholder="Ej: Shaddai Papelería"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                ALIAS (Para transferir) *
              </label>
              <input
                type="text"
                required
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej: SHADDAI.PAPELERIA.MP"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-pink-700 outline-hidden focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                CBU o CVU (22 dígitos) *
              </label>
              <input
                type="text"
                required
                value={cbu}
                onChange={(e) => setCbu(e.target.value)}
                placeholder="07202188..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono outline-hidden focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                CUIT / CUIL
              </label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="27-..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Tipo de Cuenta
              </label>
              <input
                type="text"
                value={tipoCuenta}
                onChange={(e) => setTipoCuenta(e.target.value)}
                placeholder="Caja de Ahorro en Pesos"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* 3. WhatsApp & Contact Details */}
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-pink-50">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-800">
                Contacto & Mensajes Predefinidos de WhatsApp
              </h3>
              <p className="text-xs text-stone-500">
                Número comercial donde los clientes envían sus pedidos y plantillas de saludo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Número de WhatsApp Comercial (con código de país) *
              </label>
              <input
                type="tel"
                required
                value={businessWhatsApp}
                onChange={(e) => setBusinessWhatsApp(e.target.value)}
                placeholder="5491123456789"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500 font-semibold"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Formato sin espacios ni símbolos: ej. 5491144556677
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Correo Electrónico de Contacto
              </label>
              <input
                type="email"
                required
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
              />
            </div>

            <div className="sm:col-span-2 space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Plantilla 1: Saludo Inicial y Confirmación de Pedido
                </label>
                <textarea
                  rows={2}
                  value={orderGreeting}
                  onChange={(e) => setOrderGreeting(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Plantilla 2: Pedido en Producción
                </label>
                <textarea
                  rows={2}
                  value={inProduction}
                  onChange={(e) => setInProduction(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Plantilla 3: Listo para Retirar o Enviar
                </label>
                <textarea
                  rows={2}
                  value={readyForDelivery}
                  onChange={(e) => setReadyForDelivery(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Plantilla 4: Recordatorio de Pago / Saldo Pendiente
                </label>
                <textarea
                  rows={2}
                  value={receiptReminder}
                  onChange={(e) => setReceiptReminder(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden resize-none"
                />
              </div>
            </div>
          </div>

          {/* Custom WhatsApp Templates Manager */}
          <div className="pt-4 border-t border-pink-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-stone-800">
                  Plantillas de WhatsApp Personalizadas
                </h4>
                <p className="text-[11px] text-stone-500">
                  Creá y editá mensajes personalizados con variables como {'{cliente}'}, {'{total}'}, {'{saldo}'}, {'{alias}'}
                </p>
              </div>
            </div>

            {/* List of custom templates */}
            {catalogSettings.customTemplates && catalogSettings.customTemplates.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5">
                {catalogSettings.customTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-pink-900">{tmpl.title}</span>
                        <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-md font-semibold">
                          Personalizada
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 whitespace-pre-wrap font-sans bg-white/70 p-2 rounded-xl border border-pink-100/50">
                        {tmpl.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-start shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTmplId(tmpl.id);
                          setEditingTmplTitle(tmpl.title);
                          setEditingTmplMsg(tmpl.message);
                        }}
                        className="p-1.5 text-stone-500 hover:text-pink-600 hover:bg-white rounded-lg transition-colors"
                        title="Editar plantilla"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar plantilla "${tmpl.title}"?`)) {
                            deleteCustomWhatsAppTemplate(tmpl.id);
                          }
                        }}
                        className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">
                No hay plantillas personalizadas aún. Podés agregar una a continuación:
              </p>
            )}

            {/* Edit modal or inline form if editing */}
            {editingTmplId && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <span className="text-xs font-bold text-amber-900 block">
                  Editar Plantilla de WhatsApp
                </span>
                <input
                  type="text"
                  value={editingTmplTitle}
                  onChange={(e) => setEditingTmplTitle(e.target.value)}
                  placeholder="Título (ej: Pedido despachado por Correo)"
                  className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold outline-hidden"
                />
                <textarea
                  rows={3}
                  value={editingTmplMsg}
                  onChange={(e) => setEditingTmplMsg(e.target.value)}
                  placeholder="Texto del mensaje..."
                  className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs outline-hidden resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTmplId(null);
                      setEditingTmplTitle('');
                      setEditingTmplMsg('');
                    }}
                    className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTmplTitle.trim() && editingTmplMsg.trim()) {
                        updateCustomWhatsAppTemplate(editingTmplId, editingTmplTitle.trim(), editingTmplMsg.trim());
                        setEditingTmplId(null);
                        setEditingTmplTitle('');
                        setEditingTmplMsg('');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                  >
                    Actualizar Plantilla
                  </button>
                </div>
              </div>
            )}

            {/* Add new custom template form */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-pink-600" />
                Agregar Nueva Plantilla de WhatsApp
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Título (ej: Despacho Correo)"
                  value={newTmplTitle}
                  onChange={(e) => setNewTmplTitle(e.target.value)}
                  className="sm:col-span-1 p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500 font-semibold"
                />
                <input
                  type="text"
                  placeholder="Mensaje: ¡Hola {cliente}! Tu pedido #{pedido} ya fue despachado. Seguimiento: ..."
                  value={newTmplMsg}
                  onChange={(e) => setNewTmplMsg(e.target.value)}
                  className="sm:col-span-2 p-2 bg-white border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-stone-400">
                  Variables automáticas: {'{cliente}'}, {'{pedido}'}, {'{total}'}, {'{saldo}'}, {'{alias}'}, {'{cbu}'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (newTmplTitle.trim() && newTmplMsg.trim()) {
                      addCustomWhatsAppTemplate(newTmplTitle.trim(), newTmplMsg.trim());
                      setNewTmplTitle('');
                      setNewTmplMsg('');
                    }
                  }}
                  disabled={!newTmplTitle.trim() || !newTmplMsg.trim()}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Guardar Plantilla</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 transition-all text-sm active:scale-[0.99]"
          >
            Guardar Todos los Cambios
          </button>
        </div>
      </form>
    </div>
  );
};
