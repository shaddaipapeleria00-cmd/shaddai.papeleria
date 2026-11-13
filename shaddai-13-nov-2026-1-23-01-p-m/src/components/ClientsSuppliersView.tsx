import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Client, Supplier } from '../types';
import { formatCurrency, formatDate, exportContactsVCard, parseVCard } from '../utils/exportUtils';
import { getWhatsAppUrl } from '../utils/whatsappUtils';
import {
  Users,
  Truck,
  Plus,
  Search,
  FileDown,
  Upload,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  X,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const ClientsSuppliersView: React.FC = () => {
  const {
    data,
    addClient,
    updateClient,
    deleteClient,
    addMultipleClients,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'clientes' | 'proveedores'>('clientes');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClientHistoryId, setExpandedClientHistoryId] = useState<string | null>(null);

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supItems, setSupItems] = useState('');
  const [supNotes, setSupNotes] = useState('');

  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Filter clients
  const filteredClients = useMemo(() => {
    let list = [...data.clients];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [data.clients, searchQuery]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    let list = [...data.suppliers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.itemsSupplied && s.itemsSupplied.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q))
      );
    }
    return list;
  }, [data.suppliers, searchQuery]);

  // Handle Client modal
  const handleOpenClientCreate = () => {
    setEditingClientId(null);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientAddress('');
    setClientNotes('');
    setIsClientModalOpen(true);
  };

  const handleOpenClientEdit = (c: Client) => {
    setEditingClientId(c.id);
    setClientName(c.name);
    setClientPhone(c.phone);
    setClientEmail(c.email || '');
    setClientAddress(c.address || '');
    setClientNotes(c.notes || '');
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      alert('Ingresá nombre y teléfono del cliente.');
      return;
    }

    const payload = {
      name: clientName.trim(),
      phone: clientPhone.trim(),
      email: clientEmail.trim() || undefined,
      address: clientAddress.trim() || undefined,
      notes: clientNotes.trim() || undefined,
    };

    if (editingClientId) {
      updateClient(editingClientId, payload);
    } else {
      addClient(payload);
    }

    setIsClientModalOpen(false);
  };

  // Handle Supplier modal
  const handleOpenSupCreate = () => {
    setEditingSupplierId(null);
    setSupName('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupItems('');
    setSupNotes('');
    setIsSupplierModalOpen(true);
  };

  const handleOpenSupEdit = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setSupName(s.name);
    setSupPhone(s.phone || '');
    setSupEmail(s.email || '');
    setSupAddress(s.address || '');
    setSupItems(s.itemsSupplied || '');
    setSupNotes(s.notes || '');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      alert('Ingresá el nombre del proveedor.');
      return;
    }

    const payload = {
      name: supName.trim(),
      phone: supPhone.trim() || undefined,
      email: supEmail.trim() || undefined,
      address: supAddress.trim() || undefined,
      itemsSupplied: supItems.trim() || undefined,
      notes: supNotes.trim() || undefined,
    };

    if (editingSupplierId) {
      updateSupplier(editingSupplierId, payload);
    } else {
      addSupplier(payload);
    }

    setIsSupplierModalOpen(false);
  };

  // Native Mobile Contact Picker API (if supported on Android Chrome / iOS)
  const handleNativeContactPicker = async () => {
    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const props = ['name', 'tel', 'email'];
        const contacts = await (navigator as any).contacts.select(props, { multiple: true });
        if (contacts && contacts.length > 0) {
          const parsedClients: Partial<Client>[] = contacts
            .map((c: any) => ({
              name: Array.isArray(c.name) ? c.name[0] : (c.name || 'Sin Nombre'),
              phone: Array.isArray(c.tel) ? c.tel[0] : (c.tel || ''),
              email: Array.isArray(c.email) ? c.email[0] : (c.email || ''),
            }))
            .filter((c: any) => c.name || c.phone);

          if (parsedClients.length > 0) {
            addMultipleClients(parsedClients);
            setImportNotice(`¡Se importaron ${parsedClients.length} contactos directamente desde tu celular!`);
            setTimeout(() => setImportNotice(null), 4000);
            return;
          }
        }
      } else {
        alert(
          'Tu navegador móvil no tiene habilitado el selector directo. Podés usar la opción "Importar Contactos (vCard/CSV)" seleccionando el archivo .vcf exportado de tu agenda del celular.'
        );
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert('Podés usar la opción "Importar Contactos (vCard/CSV)" para subir tu archivo de agenda.');
      }
    }
  };

  // Import Contacts (vCard or CSV) from mobile/PC
  const handleImportContactsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      if (file.name.endsWith('.vcf') || text.includes('BEGIN:VCARD')) {
        const parsed = parseVCard(text);
        if (parsed.length > 0) {
          addMultipleClients(parsed);
          setImportNotice(`¡Se importaron ${parsed.length} contactos desde tu archivo vCard!`);
          setTimeout(() => setImportNotice(null), 4000);
        } else {
          alert('No se pudieron leer contactos válidos en el archivo .vcf');
        }
      } else {
        // CSV parser
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        const clients: Partial<Client>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols[0]) {
            clients.push({
              name: cols[0],
              phone: cols[1] || '',
              email: cols[2] || '',
              address: cols[3] || '',
            });
          }
        }
        if (clients.length > 0) {
          addMultipleClients(clients);
          setImportNotice(`¡Se importaron ${clients.length} contactos desde tu CSV!`);
          setTimeout(() => setImportNotice(null), 4000);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900">
            Clientes y Proveedores
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Agenda de contactos, importación/exportación de agenda móvil (vCard/CSV) y comunicación por WhatsApp
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'clientes'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clientes ({data.clients.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'proveedores'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Proveedores ({data.suppliers.length})</span>
          </button>
        </div>
      </div>

      {importNotice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importNotice}</span>
        </div>
      )}

      {/* Top action bar: Search, Import/Export, Add */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-pink-100 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'clientes'
                ? 'Buscar por nombre, teléfono o correo...'
                : 'Buscar proveedor o insumo provisto...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'clientes' && (
            <>
              {/* Native Mobile contact picker button */}
              <button
                type="button"
                onClick={handleNativeContactPicker}
                className="flex items-center gap-1.5 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition-colors"
                title="Abrir agenda de contactos de tu celular"
              >
                <Phone className="w-3.5 h-3.5 text-pink-600" />
                <span>📱 Contactos del Celular</span>
              </button>

              {/* Import from Mobile contacts file */}
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors">
                <Upload className="w-3.5 h-3.5 text-pink-600" />
                <span>Importar Archivo (vCard/CSV)</span>
                <input
                  type="file"
                  accept=".vcf,.csv"
                  onChange={handleImportContactsFile}
                  className="hidden"
                />
              </label>

              {/* Export vCard */}
              <button
                onClick={() => exportContactsVCard(filteredClients)}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
                title="Descargar agenda en formato vCard para celular"
              >
                <FileDown className="w-3.5 h-3.5 text-pink-600" />
                <span>Exportar al Celular (.vcf)</span>
              </button>

              <button
                onClick={handleOpenClientCreate}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Cliente</span>
              </button>
            </>
          )}

          {activeTab === 'proveedores' && (
            <button
              onClick={handleOpenSupCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Proveedor</span>
            </button>
          )}
        </div>
      </div>

      {/* Clients View */}
      {activeTab === 'clientes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const normDigits = (s?: string) => (s || '').replace(/\D/g, '').slice(-10);
            const clientPhoneNorm = normDigits(client.phone);
            const clientOrders = (data.orders || []).filter((o) => {
              const oPhoneNorm = normDigits(o.clientPhone);
              if (clientPhoneNorm && oPhoneNorm && clientPhoneNorm.length >= 8 && clientPhoneNorm === oPhoneNorm) {
                return true;
              }
              if (client.name && o.clientName && client.name.trim().toLowerCase() === o.clientName.trim().toLowerCase()) {
                return true;
              }
              return false;
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return (
              <div
                key={client.id}
                className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <h4 className="font-bold text-stone-800 text-base">{client.name}</h4>
                    <span className="text-[10px] bg-pink-50 text-pink-700 px-2.5 py-0.5 rounded-full font-bold">
                      {clientOrders.length || client.totalOrders || 0} pedido(s)
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3 text-xs text-stone-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                    {client.notes && (
                      <p className="text-[11px] text-stone-400 italic pt-1">
                        "{client.notes}"
                      </p>
                    )}
                  </div>

                  {/* Order History Expandable Accordion */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedClientHistoryId(
                          expandedClientHistoryId === client.id ? null : client.id
                        )
                      }
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-pink-50/70 hover:bg-pink-100/80 text-pink-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-pink-600" />
                        <span>Historial de Pedidos ({clientOrders.length})</span>
                      </div>
                      {expandedClientHistoryId === client.id ? (
                        <ChevronUp className="w-3.5 h-3.5 text-pink-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-pink-600" />
                      )}
                    </button>

                    {expandedClientHistoryId === client.id && (
                      <div className="mt-2 space-y-1.5 p-2 bg-stone-50 rounded-xl border border-pink-100 max-h-48 overflow-y-auto">
                        {clientOrders.length === 0 ? (
                          <span className="text-[11px] text-stone-400 italic block text-center py-2">
                            Aún no hay pedidos registrados para este cliente.
                          </span>
                        ) : (
                          clientOrders.map((ord) => (
                            <div
                              key={ord.id}
                              className="p-2 bg-white rounded-lg border border-stone-200 text-xs space-y-1 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-pink-700">#{ord.orderNumber}</span>
                                <span className="text-[10px] text-stone-400 font-medium">
                                  {formatDate(ord.createdAt)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-stone-700">
                                <span className="truncate max-w-[150px] text-[11px]">
                                  {ord.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                                </span>
                                <span className="font-bold text-stone-900 shrink-0 ml-1">
                                  {formatCurrency(ord.totalAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="capitalize px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
                                  {ord.status.replace('_', ' ')}
                                </span>
                                {(ord.balanceDue <= 0 || (ord.amountPaid || 0) >= ord.totalAmount) ? (
                                  <span className="text-emerald-700 font-bold">✅ Pagado</span>
                                ) : (
                                  <span className="text-amber-700 font-bold">
                                    Saldo: {formatCurrency(ord.balanceDue)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

              {/* Total spent & actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block">Total consumido:</span>
                  <span className="text-sm font-bold font-serif-brand text-pink-800">
                    {formatCurrency(client.totalSpent || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={getWhatsAppUrl(client.phone, `¡Hola ${client.name}! Te contactamos de Shaddai Papelería.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleOpenClientEdit(client)}
                    className="p-2 text-stone-400 hover:text-pink-600 rounded-xl hover:bg-stone-50 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar cliente "${client.name}"?`)) {
                        deleteClient(client.id);
                      }
                    }}
                    className="p-2 text-stone-400 hover:text-red-500 rounded-xl hover:bg-stone-50 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Suppliers View */}
      {activeTab === 'proveedores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
            >
              <div>
                <h4 className="font-bold text-stone-800 text-base pb-2 border-b border-stone-100">
                  {supplier.name}
                </h4>

                <div className="space-y-1.5 mt-3 text-xs text-stone-600">
                  {supplier.itemsSupplied && (
                    <div className="p-2 bg-stone-50 rounded-xl border border-stone-100 text-[11px]">
                      <span className="font-bold text-pink-700 block">Insumos que provee:</span>
                      <span>{supplier.itemsSupplied}</span>
                    </div>
                  )}

                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                  {supplier.notes && (
                    <p className="text-[11px] text-stone-400 italic pt-1">
                      "{supplier.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-1">
                {supplier.phone && (
                  <a
                    href={getWhatsAppUrl(supplier.phone, `¡Hola ${supplier.name}! Te contactamos de Shaddai Papelería.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => handleOpenSupEdit(supplier)}
                  className="p-2 text-stone-400 hover:text-pink-600 rounded-xl hover:bg-stone-50 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar proveedor "${supplier.name}"?`)) {
                      deleteSupplier(supplier.id);
                    }
                  }}
                  className="p-2 text-stone-400 hover:text-red-500 rounded-xl hover:bg-stone-50 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-stone-50/70 shrink-0">
              <h3 className="font-serif-brand font-bold text-xl text-stone-800">
                {editingClientId ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofia Martinez"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 5491123456789"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Dirección de Entrega
                  </label>
                  <input
                    type="text"
                    placeholder="Calle, altura, localidad"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Notas sobre el cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Prefiere anillado color oro, entrega viernes..."
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex gap-2 shrink-0 z-10 mt-3">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="flex-1 py-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 cursor-pointer"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-stone-50/70 shrink-0">
              <h3 className="font-serif-brand font-bold text-xl text-stone-800">
                {editingSupplierId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Razón Social / Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Distribuidora Gráfica Norte"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Insumos que suministra
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Resmas Chambril, cartón gris 2mm, anillados"
                    value={supItems}
                    onChange={(e) => setSupItems(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      placeholder="54911..."
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="ventas@..."
                      value={supEmail}
                      onChange={(e) => setSupEmail(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    placeholder="Localidad, calle"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Condiciones / Notas (Descuentos, tiempo de entrega)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 10% descuento por pago en efectivo"
                    value={supNotes}
                    onChange={(e) => setSupNotes(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-hidden"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex gap-2 shrink-0 z-10 mt-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200 cursor-pointer"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
