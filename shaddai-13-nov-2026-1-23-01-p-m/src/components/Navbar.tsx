import React from 'react';
import { useApp } from '../context/AppContext';
import { APP_LOGO_SRC } from '../data/initialData';
import {
  ShoppingBag,
  Store,
  ClipboardList,
  Package,
  Scissors,
  Calculator,
  TrendingUp,
  Users,
  Settings,
  RefreshCw,
  Eye,
  LogOut,
} from 'lucide-react';

// Helper to display brand name in proper Title Case for calligraphy cursive ligature
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

const ADMIN_TABS = [
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList, activeMatch: ['pedidos'] },
  { id: 'productos', label: 'Productos & Insumos', icon: Package, activeMatch: ['productos', 'materiales', 'costos'] },
  { id: 'finanzas', label: 'Finanzas', icon: TrendingUp, activeMatch: ['finanzas'] },
  { id: 'catalogo', label: 'Ver Catálogo', icon: Store, activeMatch: ['catalogo'] },
  { id: 'clientes', label: 'Clientes & Proveedores', icon: Users, activeMatch: ['clientes', 'proveedores'] },
  { id: 'configuracion', label: 'Ajustes', icon: Settings, activeMatch: ['configuracion'] },
];

export const Navbar: React.FC = () => {
  const {
    data,
    isAdmin,
    setIsAdmin,
    adminAuthenticated,
    currentTab,
    setCurrentTab,
    cart,
    setIsCartOpen,
    setIsLoginModalOpen,
    logoutAdmin,
    isSyncing,
    refreshFromCloud,
  } = useApp();

  // Discreet access: Clicking the logo opens the login modal if not logged in, or toggles admin mode
  const handleLogoClick = () => {
    if (adminAuthenticated) {
      setIsAdmin(!isAdmin);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-xs">
      {/* Top Banner Tagline */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 text-white text-xs py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center">
        <span>{data.catalogSettings.headerBadge || '✨ SHADDAI Papelería • Catálogo Online'}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand (Cursive font matching logo) */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogoClick}
              title={adminAuthenticated ? 'Alternar Modo Admin / Vista Cliente' : 'SHADDAI Papelería'}
              className="relative p-1 -m-1 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-hidden cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-pink-200 shadow-md bg-white flex items-center justify-center">
                <img
                  src={APP_LOGO_SRC}
                  alt="SHADDAI Logo"
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
            </button>

            <div>
              <div className="flex items-baseline gap-2">
                <h1
                  onClick={handleLogoClick}
                  className="font-brand-cursive text-3xl sm:text-4xl md:text-5xl font-bold tracking-normal text-pink-600 hover:text-pink-700 transition-colors cursor-pointer drop-shadow-xs italic select-none leading-none"
                  style={{ fontFamily: "'Great Vibes', 'Alex Brush', 'Satisfy', 'Dancing Script', cursive" }}
                >
                  {formatBrandTitle(data.catalogSettings.appName)}
                </h1>
                {isAdmin && adminAuthenticated && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 border border-pink-200">
                    Modo Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-medium tracking-wide">
                {data.catalogSettings.appTagline}
              </p>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* If admin is logged in, show quick switcher / logout */}
            {adminAuthenticated && (
              <div className="flex items-center gap-1.5 bg-pink-50/80 p-1 rounded-xl border border-pink-200">
                <button
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isAdmin
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-pink-900 hover:bg-pink-100'
                  }`}
                  title="Cambiar vista"
                >
                  {isAdmin ? <Store className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">
                    {isAdmin ? 'Panel Gestión' : 'Vista Cliente'}
                  </span>
                </button>

                <button
                  onClick={logoutAdmin}
                  className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                  title="Cerrar sesión de administración"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Cloud Sync Refresh Button */}
            <button
              onClick={() => refreshFromCloud()}
              disabled={isSyncing}
              title="Sincronizar con la nube"
              className="p-2 text-stone-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-pink-500' : ''}`} />
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-4 py-2 rounded-xl font-medium shadow-md shadow-pink-200 transition-all duration-200 active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-semibold">Carrito</span>
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-stone-900 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop PC Mode Admin Tabs Bar (ARRIBA en modo PC, tal como muestra la captura 2) */}
        {isAdmin && adminAuthenticated && (
          <nav className="hidden md:flex items-center justify-center gap-1.5 py-2.5 border-t border-pink-100">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.activeMatch.includes(currentTab);
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-pink-600 text-white shadow-xs font-bold -translate-y-0.5'
                      : 'text-stone-600 hover:text-pink-600 hover:bg-pink-50 font-semibold'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};
