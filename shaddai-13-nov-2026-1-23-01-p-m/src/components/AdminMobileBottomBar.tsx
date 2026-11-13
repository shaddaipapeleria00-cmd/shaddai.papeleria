import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ClipboardList,
  TrendingUp,
  Calculator,
  Store,
  Users,
  Settings,
  Package,
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeMatch: string[];
}

const ADMIN_BOTTOM_TABS: TabItem[] = [
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList, activeMatch: ['pedidos'] },
  { id: 'productos', label: 'Taller', icon: Package, activeMatch: ['productos', 'materiales', 'costos'] },
  { id: 'finanzas', label: 'Finanzas', icon: TrendingUp, activeMatch: ['finanzas'] },
  { id: 'catalogo', label: 'Catálogo', icon: Store, activeMatch: ['catalogo'] },
  { id: 'clientes', label: 'Clientes', icon: Users, activeMatch: ['clientes', 'proveedores'] },
  { id: 'configuracion', label: 'Ajustes', icon: Settings, activeMatch: ['configuracion'] },
];

export const AdminMobileBottomBar: React.FC = () => {
  const { isAdmin, adminAuthenticated, currentTab, setCurrentTab } = useApp();

  // Only visible on mobile when logged in as admin
  if (!isAdmin || !adminAuthenticated) {
    return null;
  }

  return (
    <nav
      aria-label="Menú de herramientas de administración"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 w-full bg-white border-t border-stone-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[max(0.35rem,env(safe-area-inset-bottom))] select-none"
    >
      <div className="w-full max-w-full grid grid-cols-6 items-center px-0.5 py-1">
        {ADMIN_BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.activeMatch.includes(currentTab);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setCurrentTab(tab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center justify-center py-1 px-0.5 w-full text-center active:scale-95 transition-all cursor-pointer"
              title={tab.label}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-[#e11d48]' : 'text-stone-400'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] mt-0.5 leading-none tracking-tight block truncate w-full text-center transition-colors ${
                  isActive ? 'text-[#e11d48] font-bold' : 'text-stone-500 font-normal'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
