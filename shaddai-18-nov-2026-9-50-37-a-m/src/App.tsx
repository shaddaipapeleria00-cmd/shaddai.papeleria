/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { CatalogView } from './components/CatalogView';
import { OrdersView } from './components/OrdersView';
import { TallerManager } from './components/TallerManager';
import { FinancesView } from './components/FinancesView';
import { ClientsSuppliersView } from './components/ClientsSuppliersView';
import { SettingsView } from './components/SettingsView';
import { CartDrawer } from './components/CartDrawer';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminMobileBottomBar } from './components/AdminMobileBottomBar';
import { APP_LOGO_SRC } from './data/initialData';
import { getWhatsAppUrl } from './utils/whatsappUtils';
import { Heart, MessageCircle, Mail } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAdmin, adminAuthenticated, currentTab, data } = useApp();

  const renderActiveView = () => {
    if (!isAdmin) {
      return <CatalogView />;
    }

    switch (currentTab) {
      case 'catalogo':
        return <CatalogView />;
      case 'pedidos':
        return <OrdersView />;
      case 'productos':
      case 'materiales':
      case 'costos':
        return <TallerManager />;
      case 'finanzas':
        return <FinancesView />;
      case 'clientes':
      case 'proveedores':
        return <ClientsSuppliersView />;
      case 'configuracion':
        return <SettingsView />;
      default:
        return <CatalogView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50/40 text-stone-800">
      <Navbar />
      

      <main className={`flex-1 w-full max-w-full overflow-x-hidden ${isAdmin && adminAuthenticated ? 'pb-28 sm:pb-32 md:pb-8' : 'pb-16 md:pb-6'}`}>
        {renderActiveView()}
      </main>

      {/* Cart & Modals */}
      <CartDrawer />
      <AdminLoginModal />

      {/* Admin Mobile Tools Menu (Fixed flush to bottom on mobile, hidden on PC) */}
      <AdminMobileBottomBar />

      {/* Footer */}
      <footer className="bg-white border-t border-pink-100 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-pink-200 shadow-2xs bg-white">
              <img src={APP_LOGO_SRC} alt="SHADDAI" className="w-full h-full object-cover" />
            </div>
            <div>
              <span
                className="font-brand-cursive font-bold text-pink-600 text-2xl block leading-tight italic"
                style={{ fontFamily: "'Great Vibes', 'Alex Brush', 'Dancing Script', 'Parisienne', 'Satisfy', cursive" }}
              >
                {data.catalogSettings.appName.toUpperCase() === 'SHADDAI'
                  ? 'Shaddai'
                  : data.catalogSettings.appName.toUpperCase() === 'ZOHAR'
                  ? 'Zohar'
                  : data.catalogSettings.appName.length > 1 && data.catalogSettings.appName === data.catalogSettings.appName.toUpperCase()
                  ? data.catalogSettings.appName.charAt(0).toUpperCase() + data.catalogSettings.appName.slice(1).toLowerCase()
                  : data.catalogSettings.appName}
              </span>
              <span className="text-[11px] text-stone-400">
                {data.catalogSettings.appTagline} • Hecho con <Heart className="w-3 h-3 text-pink-500 inline fill-pink-500" />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={getWhatsAppUrl(data.catalogSettings.businessWhatsApp, '¡Hola! Me comunico desde el catálogo web de Shaddai.')}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-stone-600 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            <a
              href={`mailto:${data.catalogSettings.businessEmail}`}
              className="flex items-center gap-1.5 text-stone-600 hover:text-pink-600 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-pink-500" />
              <span>{data.catalogSettings.businessEmail}</span>
            </a>
          </div>

          <div className="text-stone-400 text-[11px]">
            © {new Date().getFullYear()} SHADDAI. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
