import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AppData,
  Product,
  Material,
  Order,
  Client,
  Supplier,
  Transaction,
  CostSettings,
  CatalogSettings,
  OrderItem,
  PaymentMethod,
  ProductCategory,
  WhatsAppTemplate,
  ProductVariant,
} from '../types';
import { INITIAL_DATA } from '../data/initialData';
import { safeLocalStorage } from '../utils/storage';
import { getLocalTodayString } from '../utils/exportUtils';
import {
  testFirestoreConnection,
  seedInitialDataIfEmpty,
  subscribeToFirestoreStore,
  firestoreSaveCatalogSettings,
  firestoreSaveCategories,
  firestoreSaveCostSettings,
  firestoreSaveProduct,
  firestoreDeleteProduct,
  firestoreSaveMaterial,
  firestoreDeleteMaterial,
  firestoreSaveOrder,
  firestoreDeleteOrder,
  firestoreSaveTransaction,
  firestoreDeleteTransaction,
  firestoreSaveClient,
  firestoreDeleteClient,
  firestoreSaveSupplier,
  firestoreDeleteSupplier,
} from '../services/firebaseService';

const LOCAL_STORAGE_KEY = 'shaddai_app_data_v3';
const ADMIN_AUTH_KEY = 'shaddai_admin_session_v3';
const ADMIN_TOKEN_KEY = 'shaddai_admin_token_v3';

// Correct credentials requested by user:
const ADMIN_EMAIL = 'shaddai.papeleria00@gmail.com';
const ADMIN_PASS = 'Diosesamor00';

// Defensive normalizer to guarantee no missing arrays or properties cause blank screen crashes
export function normalizeAppData(raw: any): AppData {
  const fallback = INITIAL_DATA;
  if (!raw || typeof raw !== 'object') return fallback;

  return {
    catalogSettings: {
      appName: raw.catalogSettings?.appName || fallback.catalogSettings.appName,
      appTagline: raw.catalogSettings?.appTagline || fallback.catalogSettings.appTagline,
      headerBadge: raw.catalogSettings?.headerBadge || fallback.catalogSettings.headerBadge,
      welcomeDescription: raw.catalogSettings?.welcomeDescription || fallback.catalogSettings.welcomeDescription,
      bannerType: raw.catalogSettings?.bannerType || fallback.catalogSettings.bannerType,
      bannerUrl: raw.catalogSettings?.bannerUrl || fallback.catalogSettings.bannerUrl,
      businessWhatsApp: raw.catalogSettings?.businessWhatsApp || fallback.catalogSettings.businessWhatsApp,
      businessEmail: raw.catalogSettings?.businessEmail || fallback.catalogSettings.businessEmail,
      bankInfo: {
        banco: raw.catalogSettings?.bankInfo?.banco || fallback.catalogSettings.bankInfo.banco,
        titular: raw.catalogSettings?.bankInfo?.titular || fallback.catalogSettings.bankInfo.titular,
        cbu: raw.catalogSettings?.bankInfo?.cbu || fallback.catalogSettings.bankInfo.cbu,
        alias: raw.catalogSettings?.bankInfo?.alias || fallback.catalogSettings.bankInfo.alias,
        cuit: raw.catalogSettings?.bankInfo?.cuit || fallback.catalogSettings.bankInfo.cuit,
        tipoCuenta: raw.catalogSettings?.bankInfo?.tipoCuenta || fallback.catalogSettings.bankInfo.tipoCuenta,
      },
      whatsappTemplates: {
        orderGreeting: raw.catalogSettings?.whatsappTemplates?.orderGreeting || fallback.catalogSettings.whatsappTemplates.orderGreeting,
        inProduction: raw.catalogSettings?.whatsappTemplates?.inProduction || fallback.catalogSettings.whatsappTemplates.inProduction,
        readyForDelivery: raw.catalogSettings?.whatsappTemplates?.readyForDelivery || fallback.catalogSettings.whatsappTemplates.readyForDelivery,
        receiptReminder: raw.catalogSettings?.whatsappTemplates?.receiptReminder || fallback.catalogSettings.whatsappTemplates.receiptReminder,
      },
      customTemplates: Array.isArray(raw.catalogSettings?.customTemplates)
        ? raw.catalogSettings.customTemplates
        : fallback.catalogSettings.customTemplates || [],
    },
    categories: Array.isArray(raw.categories) ? raw.categories : fallback.categories,
    productCategories: Array.isArray(raw.productCategories)
      ? raw.productCategories
      : fallback.productCategories,
    materialCategories: Array.isArray(raw.materialCategories)
      ? raw.materialCategories
      : fallback.materialCategories,
    variantSuggestions: Array.isArray(raw.variantSuggestions)
      ? raw.variantSuggestions
      : fallback.variantSuggestions,
    products: Array.isArray(raw.products)
      ? raw.products.map((p: any) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : [],
          variants: Array.isArray(p.variants) ? p.variants : [],
          materialsUsed: Array.isArray(p.materialsUsed) ? p.materialsUsed : [],
        }))
      : fallback.products,
    materials: Array.isArray(raw.materials) ? raw.materials : fallback.materials,
    orders: Array.isArray(raw.orders)
      ? raw.orders.map((o: any) => ({
          ...o,
          items: Array.isArray(o.items) ? o.items : [],
          partialPayments: Array.isArray(o.partialPayments) ? o.partialPayments : [],
        }))
      : fallback.orders,
    clients: Array.isArray(raw.clients) ? raw.clients : fallback.clients,
    suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : fallback.suppliers,
    transactions: Array.isArray(raw.transactions) ? raw.transactions : fallback.transactions,
    costSettings: {
      targetMonthlySalary: raw.costSettings?.targetMonthlySalary ?? fallback.costSettings.targetMonthlySalary,
      workingDaysPerMonth: raw.costSettings?.workingDaysPerMonth ?? fallback.costSettings.workingDaysPerMonth,
      workingHoursPerDay: raw.costSettings?.workingHoursPerDay ?? fallback.costSettings.workingHoursPerDay,
      calculatedHourlyRate: raw.costSettings?.calculatedHourlyRate ?? fallback.costSettings.calculatedHourlyRate,
      calculatedOverheadPerHour: raw.costSettings?.calculatedOverheadPerHour ?? fallback.costSettings.calculatedOverheadPerHour,
      defaultProfitMargin: raw.costSettings?.defaultProfitMargin ?? fallback.costSettings.defaultProfitMargin,
      invisibleExpenses: Array.isArray(raw.costSettings?.invisibleExpenses)
        ? raw.costSettings.invisibleExpenses
        : fallback.costSettings.invisibleExpenses,
    },
  };
}

// Dynamic engine for product price calculation based on minutes
export function calculateProductPrices(
  product: Product,
  currentMaterials: Material[],
  globalHourlyRate?: number,
  globalOverheadPerHour?: number
): Product {
  const materialsMap = new Map<string, Material>();
  (currentMaterials || []).forEach((m) => materialsMap.set(m.id, m));

  const updatedMaterialsUsed = (product.materialsUsed || []).map((usage) => {
    const liveMat = materialsMap.get(usage.materialId);
    const unitCost = liveMat ? liveMat.unitCost : usage.unitCost;
    return {
      ...usage,
      unitCost,
      materialName: liveMat ? liveMat.name : usage.materialName,
    };
  });

  const materialsCost = updatedMaterialsUsed.reduce(
    (sum, m) => sum + (m.quantity || 0) * (m.unitCost || 0),
    0
  );

  // Minutes-based calculation
  const laborMinutes = product.laborMinutes !== undefined
    ? product.laborMinutes
    : (product.laborHours ? Math.round(product.laborHours * 60) : 45);
  const laborHours = laborMinutes / 60;

  const hourlyRate = globalHourlyRate !== undefined ? globalHourlyRate : (product.hourlyRate || 3400);
  const laborCost = laborHours * hourlyRate;

  // Invisible expenses calculated automatically based on minutes of work
  const overheadPerHour = globalOverheadPerHour !== undefined ? globalOverheadPerHour : 1590;
  const invisibleCost = Math.round(laborHours * overheadPerHour);

  const calculatedCost = Math.round(materialsCost + laborCost + invisibleCost);

  const marginPct = product.profitMarginPercent || 0;
  let rawBasePrice = calculatedCost * (1 + marginPct / 100);

  // Manual subtraction to reach round number
  if (product.subtractionAmount && product.subtractionAmount > 0) {
    rawBasePrice = Math.max(0, rawBasePrice - product.subtractionAmount);
  }

  let basePrice = Math.round(rawBasePrice);
  if (product.roundToCleanNumbers) {
    basePrice = Math.round(basePrice / 10) * 10;
  }

  // Promo discount
  let finalPrice = basePrice;
  if (product.promoActive) {
    if (product.promoType === 'fixed' && product.promoDiscountFixed) {
      finalPrice = Math.max(0, basePrice - product.promoDiscountFixed);
    } else if (product.promoDiscountPercent && product.promoDiscountPercent > 0) {
      finalPrice = Math.max(0, basePrice * (1 - product.promoDiscountPercent / 100));
    }
    if (product.roundToCleanNumbers) {
      finalPrice = Math.round(finalPrice / 10) * 10;
    } else {
      finalPrice = Math.round(finalPrice);
    }
  }

  // Recalculate variants if present
  const updatedVariants = (product.variants || []).map((v) => ({
    ...v,
    options: v.options.map((opt) => {
      if (typeof opt === 'string') return { name: opt };
      let optPrice = opt.price;
      let optUpdatedMats = opt.materialsUsed;
      if (opt.materialsUsed && opt.materialsUsed.length > 0) {
        optUpdatedMats = opt.materialsUsed.map((u) => {
          const liveMat = materialsMap.get(u.materialId);
          return {
            ...u,
            unitCost: liveMat ? liveMat.unitCost : u.unitCost,
            materialName: liveMat ? liveMat.name : u.materialName,
          };
        });
        const optMatsCost = optUpdatedMats.reduce((sum, m) => sum + (m.quantity || 0) * (m.unitCost || 0), 0);
        const optMinutes = opt.laborMinutes !== undefined ? opt.laborMinutes : laborMinutes;
        const optLaborHours = optMinutes / 60;
        const optLaborCost = optLaborHours * hourlyRate;
        const optInvisibleCost = Math.round(optLaborHours * overheadPerHour);
        const optTotalCost = optMatsCost + optLaborCost + optInvisibleCost;
        const optMargin = opt.profitMarginPercent !== undefined ? opt.profitMarginPercent : marginPct;
        let optCalculated = Math.round(optTotalCost * (1 + optMargin / 100));
        if (opt.subtractionAmount && opt.subtractionAmount > 0) {
          optCalculated = Math.max(0, optCalculated - opt.subtractionAmount);
        }
        if (product.roundToCleanNumbers) {
          optCalculated = Math.round(optCalculated / 10) * 10;
        }
        optPrice = optCalculated;
      }

      let optFinalPrice = optPrice;
      if (optPrice && optPrice > 0) {
        if (opt.promoDiscountPercent && opt.promoDiscountPercent > 0) {
          optFinalPrice = Math.round(optPrice * (1 - opt.promoDiscountPercent / 100));
        } else if (opt.promoDiscountFixed && opt.promoDiscountFixed > 0) {
          optFinalPrice = Math.max(0, optPrice - opt.promoDiscountFixed);
        } else if (product.promoActive) {
          if (product.promoType === 'fixed' && product.promoDiscountFixed) {
            optFinalPrice = Math.max(0, optPrice - product.promoDiscountFixed);
          } else if (product.promoDiscountPercent && product.promoDiscountPercent > 0) {
            optFinalPrice = Math.round(optPrice * (1 - product.promoDiscountPercent / 100));
          }
        }
        if (product.roundToCleanNumbers && optFinalPrice) {
          optFinalPrice = Math.round(optFinalPrice / 10) * 10;
        }
      }

      return {
        ...opt,
        ...(optUpdatedMats ? { materialsUsed: optUpdatedMats } : {}),
        price: optPrice,
        finalPrice: optFinalPrice,
      };
    }),
  }));

  return {
    ...product,
    materialsUsed: updatedMaterialsUsed,
    variants: updatedVariants,
    laborMinutes,
    laborHours,
    hourlyRate,
    invisibleExpenseFixed: invisibleCost,
    calculatedCost,
    basePrice,
    finalPrice,
  };
}

interface AppContextType {
  data: AppData;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  adminAuthenticated: boolean;
  adminToken: string;
  isRealtimeConnected: boolean;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  ordersCompactView: boolean;
  setOrdersCompactView: (val: boolean) => void;

  // Shopping cart
  cart: OrderItem[];
  addToCart: (product: Product, quantity?: number, selectedVariants?: Record<string, string>, unitPriceOverride?: number) => void;
  removeFromCart: (productId: string, variantKey?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, variantKey?: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (val: boolean) => void;

  // Admin auth
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (val: boolean) => void;
  loginAsAdmin: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: () => void;

  // Cloud & Real-time sync
  isSyncing: boolean;
  lastSyncTime: Date | null;
  refreshFromCloud: () => Promise<void>;
  liveSyncAlert: string | null;

  // Products
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  duplicateProduct: (id: string) => void;
  deleteProduct: (id: string) => void;

  // Categories & Subcategories
  addProductCategory: (category: string) => void;
  renameProductCategory: (oldName: string, newName: string) => void;
  deleteProductCategory: (category: string) => void;
  addSubcategory: (categoryName: string, subcategoryName: string) => void;
  renameSubcategory: (categoryName: string, oldSub: string, newSub: string) => void;
  deleteSubcategory: (categoryName: string, subcategoryName: string) => void;

  // Material Categories
  addMaterialCategory: (category: string) => void;
  renameMaterialCategory: (oldName: string, newName: string) => void;
  deleteMaterialCategory: (category: string) => void;

  // Materials
  addMaterial: (material: Omit<Material, 'id' | 'updatedAt'>) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;

  // Orders
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'> & { createdAt?: string }) => Promise<Order>;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  addPartialPayment: (orderId: string, amount: number, method: PaymentMethod, note?: string, paymentDate?: string) => void;
  updatePartialPaymentDate: (orderId: string, paymentId: string, newDate: string) => void;
  deletePartialPayment: (orderId: string, paymentId: string) => void;

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Settings
  updateCostSettings: (settings: Partial<CostSettings>) => void;
  setGlobalHourlyRate: (newRate: number) => void;
  updateCatalogSettings: (settings: Partial<CatalogSettings>) => void;

  // WhatsApp Templates
  addCustomWhatsAppTemplate: (title: string, message: string) => void;
  updateCustomWhatsAppTemplate: (id: string, title: string, message: string) => void;
  deleteCustomWhatsAppTemplate: (id: string) => void;

  // Variant Suggestions
  removeVariantSuggestion: (suggestion: string) => void;
  addVariantSuggestion: (suggestion: string) => void;

  // Clients & Suppliers
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'totalOrders' | 'totalSpent'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addMultipleClients: (clients: Partial<Client>[]) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize data with safeLocalStorage and normalizer
  const [data, setData] = useState<AppData>(() => {
    const saved = safeLocalStorage.getItem<any>(LOCAL_STORAGE_KEY, null);
    return normalizeAppData(saved || INITIAL_DATA);
  });

  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(() => {
    return safeLocalStorage.getItem<boolean>(ADMIN_AUTH_KEY, false);
  });
  const [adminToken, setAdminToken] = useState<string>(() => {
    return safeLocalStorage.getItem<string>(ADMIN_TOKEN_KEY, '');
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<string>('catalogo');
  const [ordersCompactView, setOrdersCompactView] = useState<boolean>(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  // Cart
  const [cart, setCart] = useState<OrderItem[]>(() => {
    return safeLocalStorage.getItem<OrderItem[]>('shaddai_cart_v3', []);
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [liveSyncAlert, setLiveSyncAlert] = useState<string | null>(null);

  // Ref to hold current dataVersion to avoid redundant fetches
  const localVersionRef = useRef<number>(0);
  const isUpdatingLocallyRef = useRef<boolean>(false);

  // Save data to safeLocalStorage whenever it changes
  useEffect(() => {
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, data);
  }, [data]);

  useEffect(() => {
    safeLocalStorage.setItem('shaddai_cart_v3', cart);
  }, [cart]);

  // Synchronize state with cloud backend
  const refreshFromCloud = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/store?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const normalized = normalizeAppData(json.data);
          setData(normalized);
          localVersionRef.current = json.version || Date.now();
          setLastSyncTime(new Date());
          return;
        }
      }
    } catch (err) {
      console.warn('[Sync] Backend fetch offline, using safe local cache.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Cloud Firestore Real-time synchronization across ALL devices and browsers
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    let isSubscribed = true;

    const setupFirestoreSync = async () => {
      try {
        await testFirestoreConnection();
        // Seed initial data if database is brand new
        await seedInitialDataIfEmpty(INITIAL_DATA);

        if (!isSubscribed) return;

        unsubFirestore = subscribeToFirestoreStore({
          onCatalogSettings: (settings) => {
            setData((prev) => ({
              ...prev,
              catalogSettings: { ...prev.catalogSettings, ...settings },
            }));
            setIsRealtimeConnected(true);
            setLastSyncTime(new Date());
          },
          onCategoriesData: (catData) => {
            setData((prev) => ({
              ...prev,
              categories: Array.isArray(catData.categories) ? catData.categories : prev.categories,
              productCategories: Array.isArray(catData.productCategories) ? catData.productCategories : prev.productCategories,
              materialCategories: Array.isArray(catData.materialCategories) ? catData.materialCategories : prev.materialCategories,
              variantSuggestions: Array.isArray(catData.variantSuggestions) ? catData.variantSuggestions : prev.variantSuggestions,
            }));
            setIsRealtimeConnected(true);
            setLastSyncTime(new Date());
          },
          onCostSettings: (cost) => {
            setData((prev) => ({
              ...prev,
              costSettings: { ...prev.costSettings, ...cost },
            }));
            setIsRealtimeConnected(true);
          },
          onProducts: (products) => {
            setData((prev) => ({ ...prev, products: Array.isArray(products) ? products : [] }));
            setIsRealtimeConnected(true);
            setLastSyncTime(new Date());
          },
          onMaterials: (materials) => {
            setData((prev) => ({ ...prev, materials: Array.isArray(materials) ? materials : [] }));
          },
          onOrders: (orders) => {
            setData((prev) => ({ ...prev, orders: Array.isArray(orders) ? orders : [] }));
            setLastSyncTime(new Date());
          },
          onTransactions: (transactions) => {
            setData((prev) => ({ ...prev, transactions: Array.isArray(transactions) ? transactions : [] }));
          },
          onClients: (clients) => {
            setData((prev) => ({ ...prev, clients: Array.isArray(clients) ? clients : [] }));
          },
          onSuppliers: (suppliers) => {
            setData((prev) => ({ ...prev, suppliers: Array.isArray(suppliers) ? suppliers : [] }));
          },
          onError: (err) => {
            console.warn('[Firestore] Sync listener notice:', err);
          },
        });
        setIsRealtimeConnected(true);
      } catch (err) {
        console.warn('[Firestore] Sync setup notice:', err);
      }
    };

    setupFirestoreSync();

    return () => {
      isSubscribed = false;
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  }, []);

  // Send update to Cloud Firestore AND backend server
  const syncToCloud = useCallback(async (updatedData: AppData) => {
    try {
      setIsSyncing(true);
      isUpdatingLocallyRef.current = true;

      // 1. Direct Firestore write for immediate cloud propagation to all devices
      try {
        await Promise.all([
          firestoreSaveCatalogSettings(updatedData.catalogSettings),
          firestoreSaveCategories({
            categories: updatedData.categories,
            productCategories: updatedData.productCategories,
            materialCategories: updatedData.materialCategories,
            variantSuggestions: updatedData.variantSuggestions,
          }),
          firestoreSaveCostSettings(updatedData.costSettings),
        ]);
      } catch (fsErr) {
        console.warn('[Firestore] Background direct save notice:', fsErr);
      }

      // 2. Push to local Express server if running
      let token = safeLocalStorage.getItem<string>(ADMIN_TOKEN_KEY, '');

      const doSave = async (authToken: string) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-admin-pass': ADMIN_PASS,
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        return fetch('/api/store', {
          method: 'POST',
          headers,
          body: JSON.stringify({ data: updatedData }),
        });
      };

      let res = await doSave(token);

      if (res.status === 401) {
        try {
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
          });
          if (loginRes.ok) {
            const loginJson = await loginRes.json();
            if (loginJson.token) {
              token = loginJson.token;
              setAdminToken(token);
              safeLocalStorage.setItem(ADMIN_TOKEN_KEY, token);
              res = await doSave(token);
            }
          }
        } catch (authErr) {}
      }

      if (res.ok) {
        const json = await res.json();
        if (json.version) {
          localVersionRef.current = json.version;
        }
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Sync] Offline notice, stored locally and queued.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        isUpdatingLocallyRef.current = false;
      }, 300);
    }
  }, []);

  // Update local state and trigger sync cleanly outside reducer
  const updateAllData = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const updated = normalizeAppData(updater(prev));
        // Trigger cloud push asynchronously without blocking UI render
        setTimeout(() => syncToCloud(updated), 0);
        return updated;
      });
    },
    [syncToCloud]
  );

  // Admin login check with server authentication + token
  const loginAsAdmin = async (email: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const token = json.token;
        setAdminToken(token);
        setAdminAuthenticated(true);
        setIsAdmin(true);
        safeLocalStorage.setItem(ADMIN_AUTH_KEY, true);
        safeLocalStorage.setItem(ADMIN_TOKEN_KEY, token);
        setIsLoginModalOpen(false);
        return { success: true, message: 'Acceso autorizado al panel de administración.' };
      }
      return { success: false, message: json.message || 'Credenciales inválidas.' };
    } catch (netErr) {
      // Offline fallback
      if (cleanEmail === ADMIN_EMAIL.toLowerCase() && cleanPass === ADMIN_PASS) {
        setAdminAuthenticated(true);
        setIsAdmin(true);
        safeLocalStorage.setItem(ADMIN_AUTH_KEY, true);
        setIsLoginModalOpen(false);
        return { success: true, message: 'Acceso autorizado (modo sin conexión).' };
      }
      return { success: false, message: 'Credenciales inválidas. Verificá correo y contraseña.' };
    }
  };

  const logoutAdmin = () => {
    const token = safeLocalStorage.getItem<string>(ADMIN_TOKEN_KEY, '');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setAdminToken('');
    setCurrentTab('catalogo');
    safeLocalStorage.removeItem(ADMIN_AUTH_KEY);
    safeLocalStorage.removeItem(ADMIN_TOKEN_KEY);
  };

  // Cart operations
  const getCartItemKey = (productId: string, selectedVariants?: Record<string, string>) => {
    if (!selectedVariants || Object.keys(selectedVariants).length === 0) {
      return productId;
    }
    return `${productId}_${JSON.stringify(selectedVariants)}`;
  };

  const addToCart = (
    product: Product,
    quantity = 1,
    selectedVariants?: Record<string, string>,
    unitPriceOverride?: number
  ) => {
    if (product.type === 'stock' && (product.stockQuantity || 0) <= 0) {
      alert('Este producto se encuentra actualmente agotado / sin stock.');
      return;
    }

    const price = unitPriceOverride !== undefined ? unitPriceOverride : product.finalPrice;

    setCart((prev) => {
      const targetKey = getCartItemKey(product.id, selectedVariants);
      const existing = prev.find(
        (item) => getCartItemKey(item.productId, item.selectedVariants) === targetKey
      );

      if (existing) {
        return prev.map((item) =>
          getCartItemKey(item.productId, item.selectedVariants) === targetKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price,
          quantity,
          productImage: product.images?.[0],
          type: product.type,
          selectedVariants,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, variantKey?: string) => {
    setCart((prev) =>
      prev.filter((item) => {
        const key = getCartItemKey(item.productId, item.selectedVariants);
        return variantKey ? key !== variantKey : item.productId !== productId;
      })
    );
  };

  const updateCartQuantity = (productId: string, quantity: number, variantKey?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantKey);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        const key = getCartItemKey(item.productId, item.selectedVariants);
        if (variantKey ? key === variantKey : item.productId === productId) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Products
  const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const tempProd: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const newProduct = calculateProductPrices(
      tempProd,
      data.materials,
      data.costSettings.calculatedHourlyRate,
      data.costSettings.calculatedOverheadPerHour
    );

    firestoreSaveProduct(newProduct).catch((err) =>
      console.warn('[Firestore] addProduct error:', err)
    );

    updateAllData((prev) => ({
      ...prev,
      products: [newProduct, ...prev.products],
    }));
  };

  const updateProduct = (id: string, updatedFields: Partial<Product>) => {
    const now = new Date().toISOString();
    updateAllData((prev) => {
      const existing = prev.products.find((p) => p.id === id);
      if (!existing) return prev;

      const merged: Product = { ...existing, ...updatedFields, updatedAt: now };
      const recalculated = calculateProductPrices(
        merged,
        prev.materials,
        prev.costSettings.calculatedHourlyRate,
        prev.costSettings.calculatedOverheadPerHour
      );

      firestoreSaveProduct(recalculated).catch((err) =>
        console.warn('[Firestore] updateProduct error:', err)
      );

      return {
        ...prev,
        products: prev.products.map((p) => (p.id === id ? recalculated : p)),
      };
    });
  };

  const duplicateProduct = (id: string) => {
    const now = new Date().toISOString();
    const source = data.products.find((p) => p.id === id);
    if (!source) return;

    const cloned: Product = {
      ...source,
      id: `prod-${Date.now()}`,
      name: `${source.name} (Copia)`,
      createdAt: now,
      updatedAt: now,
    };

    firestoreSaveProduct(cloned).catch((err) =>
      console.warn('[Firestore] duplicateProduct error:', err)
    );

    updateAllData((prev) => ({
      ...prev,
      products: [cloned, ...prev.products],
    }));
  };

  const deleteProduct = (id: string) => {
    firestoreDeleteProduct(id).catch((err) =>
      console.warn('[Firestore] deleteProduct error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  // Categories & Subcategories
  const addProductCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    updateAllData((prev) => {
      if (prev.productCategories.includes(trimmed)) return prev;
      const newCategoryObj: ProductCategory = {
        id: `cat-${Date.now()}`,
        name: trimmed,
        subcategories: [],
      };
      return {
        ...prev,
        productCategories: [...prev.productCategories, trimmed],
        categories: [...(prev.categories || []), newCategoryObj],
      };
    });
  };

  const renameProductCategory = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    updateAllData((prev) => ({
      ...prev,
      productCategories: prev.productCategories.map((c) => (c === oldName ? trimmed : c)),
      categories: (prev.categories || []).map((cat) =>
        cat.name === oldName ? { ...cat, name: trimmed } : cat
      ),
      products: prev.products.map((p) => (p.category === oldName ? { ...p, category: trimmed } : p)),
    }));
  };

  const deleteProductCategory = (category: string) => {
    updateAllData((prev) => ({
      ...prev,
      productCategories: prev.productCategories.filter((c) => c !== category),
      categories: (prev.categories || []).filter((c) => c.name !== category),
    }));
  };

  const addSubcategory = (categoryName: string, subcategoryName: string) => {
    const trimmed = subcategoryName.trim();
    if (!trimmed) return;
    updateAllData((prev) => {
      const updatedCategories = (prev.categories || []).map((cat) => {
        if (cat.name === categoryName) {
          if (cat.subcategories.includes(trimmed)) return cat;
          return { ...cat, subcategories: [...cat.subcategories, trimmed] };
        }
        return cat;
      });
      return { ...prev, categories: updatedCategories };
    });
  };

  const renameSubcategory = (categoryName: string, oldSub: string, newSub: string) => {
    const trimmed = newSub.trim();
    if (!trimmed || trimmed === oldSub) return;
    updateAllData((prev) => {
      const updatedCategories = (prev.categories || []).map((cat) => {
        if (cat.name === categoryName) {
          return {
            ...cat,
            subcategories: cat.subcategories.map((s) => (s === oldSub ? trimmed : s)),
          };
        }
        return cat;
      });
      const updatedProducts = prev.products.map((p) =>
        p.category === categoryName && p.subcategory === oldSub
          ? { ...p, subcategory: trimmed }
          : p
      );
      return { ...prev, categories: updatedCategories, products: updatedProducts };
    });
  };

  const deleteSubcategory = (categoryName: string, subcategoryName: string) => {
    updateAllData((prev) => {
      const updatedCategories = (prev.categories || []).map((cat) => {
        if (cat.name === categoryName) {
          return {
            ...cat,
            subcategories: cat.subcategories.filter((s) => s !== subcategoryName),
          };
        }
        return cat;
      });
      const updatedProducts = prev.products.map((p) =>
        p.category === categoryName && p.subcategory === subcategoryName
          ? { ...p, subcategory: undefined }
          : p
      );
      return { ...prev, categories: updatedCategories, products: updatedProducts };
    });
  };

  // Material Categories
  const addMaterialCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    updateAllData((prev) => {
      if (prev.materialCategories.includes(trimmed)) return prev;
      return {
        ...prev,
        materialCategories: [...prev.materialCategories, trimmed],
      };
    });
  };

  const renameMaterialCategory = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    updateAllData((prev) => ({
      ...prev,
      materialCategories: prev.materialCategories.map((c) => (c === oldName ? trimmed : c)),
      materials: prev.materials.map((m) => (m.category === oldName ? { ...m, category: trimmed } : m)),
    }));
  };

  const deleteMaterialCategory = (category: string) => {
    updateAllData((prev) => ({
      ...prev,
      materialCategories: prev.materialCategories.filter((c) => c !== category),
    }));
  };

  // Materials & Auto Recalculation
  const addMaterial = (material: Omit<Material, 'id' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newMaterial: Material = {
      ...material,
      id: `mat-${Date.now()}`,
      updatedAt: now,
    };
    firestoreSaveMaterial(newMaterial).catch((err) =>
      console.warn('[Firestore] addMaterial error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      materials: [...prev.materials, newMaterial].sort((a, b) =>
        a.name.localeCompare(b.name, 'es')
      ),
    }));
  };

  const updateMaterial = (id: string, fields: Partial<Material>) => {
    const now = new Date().toISOString();
    updateAllData((prev) => {
      const updatedMaterials = prev.materials
        .map((m) => {
          if (m.id === id) {
            const updated = { ...m, ...fields, updatedAt: now };
            firestoreSaveMaterial(updated).catch((err) =>
              console.warn('[Firestore] updateMaterial error:', err)
            );
            return updated;
          }
          return m;
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));

      const recalculatedProducts = prev.products.map((p) => {
        const usesMatInBase = (p.materialsUsed || []).some((m) => m.materialId === id);
        const usesMatInVariant = (p.variants || []).some((v) =>
          v.options.some(
            (o) => typeof o !== 'string' && (o.materialsUsed || []).some((m) => m.materialId === id)
          )
        );
        const recalculated = calculateProductPrices(
          p,
          updatedMaterials,
          prev.costSettings.calculatedHourlyRate,
          prev.costSettings.calculatedOverheadPerHour
        );
        if (usesMatInBase || usesMatInVariant) {
          const toSave = { ...recalculated, updatedAt: now };
          firestoreSaveProduct(toSave).catch((err) =>
            console.warn('[Firestore] updateMaterial product sync error:', err)
          );
          return toSave;
        }
        return recalculated;
      });

      return {
        ...prev,
        materials: updatedMaterials,
        products: recalculatedProducts,
      };
    });
  };

  const deleteMaterial = (id: string) => {
    firestoreDeleteMaterial(id).catch((err) =>
      console.warn('[Firestore] deleteMaterial error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m.id !== id),
    }));
  };

  const setGlobalHourlyRate = (newRate: number) => {
    const now = new Date().toISOString();
    updateAllData((prev) => {
      const updatedCostSettings = {
        ...prev.costSettings,
        calculatedHourlyRate: newRate,
      };
      firestoreSaveCostSettings(updatedCostSettings).catch((err) =>
        console.warn('[Firestore] setGlobalHourlyRate costSettings error:', err)
      );
      const recalculatedProducts = prev.products.map((p) => {
        const recalculated = calculateProductPrices(
          p,
          prev.materials,
          newRate,
          prev.costSettings.calculatedOverheadPerHour
        );
        if (recalculated.finalPrice !== p.finalPrice || recalculated.calculatedCost !== p.calculatedCost) {
          const toSave = { ...recalculated, updatedAt: now };
          firestoreSaveProduct(toSave).catch((err) =>
            console.warn('[Firestore] setGlobalHourlyRate product sync error:', err)
          );
          return toSave;
        }
        return recalculated;
      });
      return {
        ...prev,
        costSettings: updatedCostSettings,
        products: recalculatedProducts,
      };
    });
  };

  // Orders: Add order WITH AUTOMATIC SERVER SUBMISSION & REAL-TIME SYNC
  const addOrder = async (
    order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'> & { createdAt?: string }
  ): Promise<Order> => {
    const now = new Date().toISOString();
    const orderCreatedAt = order.createdAt
      ? (order.createdAt.length === 10 ? `${order.createdAt}T12:00:00.000Z` : order.createdAt)
      : now;
    const orderCount = data.orders.length + 1;
    const orderNumber = `PED-${String(orderCount + 100).padStart(3, '0')}`;
    const newOrder: Order = {
      ...order,
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: orderCreatedAt,
      updatedAt: now,
    };

    // First attempt server order submission
    try {
      const res = await fetch('/api/orders/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.order) {
          // Trigger instant refresh
          setTimeout(() => refreshFromCloud(), 50);
          return json.order;
        }
      }
    } catch (err) {
      console.warn('[Orders] Direct server submit offline, saving to local store');
    }

    // Direct Cloud Firestore write
    firestoreSaveOrder(newOrder).catch((err) =>
      console.warn('[Firestore] direct addOrder error:', err)
    );

    // Update local store immediately
    updateAllData((prev) => {
      // Automatic Stock Deduction
      const updatedProducts = prev.products.map((prod) => {
        if (prod.type === 'stock') {
          const itemInOrder = order.items.find((it) => it.productId === prod.id);
          if (itemInOrder) {
            const newStock = Math.max(0, (prod.stockQuantity || 0) - itemInOrder.quantity);
            const deductedProd = { ...prod, stockQuantity: newStock, updatedAt: now };
            firestoreSaveProduct(deductedProd).catch((e) => console.warn('[Firestore] stock deduction save:', e));
            return deductedProd;
          }
        }
        return prod;
      });

      // Update or link client with phone/name deduplication
      const normDigits = (s?: string) => (s || '').replace(/\D/g, '').slice(-10);
      const cleanOrderPhone = normDigits(order.clientPhone);
      const existingClient = prev.clients.find((c) => {
        const cleanClientPhone = normDigits(c.phone);
        if (cleanOrderPhone && cleanClientPhone && cleanOrderPhone.length >= 8 && cleanOrderPhone === cleanClientPhone) {
          return true;
        }
        if (order.clientName && c.name && c.name.trim().toLowerCase() === order.clientName.trim().toLowerCase()) {
          return true;
        }
        return false;
      });

      let updatedClients = prev.clients;

      if (existingClient) {
        const updatedClient: Client = {
          ...existingClient,
          totalOrders: (existingClient.totalOrders || 0) + 1,
          totalSpent: (existingClient.totalSpent || 0) + order.totalAmount,
          address: order.clientAddress || existingClient.address,
          email: order.clientEmail || existingClient.email,
          phone: order.clientPhone || existingClient.phone,
        };
        firestoreSaveClient(updatedClient).catch((e) => console.warn('[Firestore] client update save:', e));
        updatedClients = prev.clients.map((c) => (c.id === existingClient.id ? updatedClient : c));
      } else if (order.clientName) {
        const newClient: Client = {
          id: `cli-${Date.now()}`,
          name: order.clientName,
          phone: order.clientPhone,
          email: order.clientEmail,
          address: order.clientAddress,
          totalOrders: 1,
          totalSpent: order.totalAmount,
          createdAt: getLocalTodayString(),
        };
        firestoreSaveClient(newClient).catch((e) => console.warn('[Firestore] client create save:', e));
        updatedClients = [newClient, ...prev.clients];
      }

      let updatedTransactions = prev.transactions;
      if (order.amountPaid > 0) {
        const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          type: 'ingreso',
          date: orderCreatedAt.slice(0, 10),
          amount: order.amountPaid,
          category: `Venta pedido ${orderNumber}`,
          description: `Cobro de pedido para ${order.clientName}`,
          paymentMethod: order.paymentMethod,
          orderId: newOrder.id,
          isAutoFromOrder: true,
        };
        firestoreSaveTransaction(newTx).catch((e) => console.warn('[Firestore] order transaction save:', e));
        updatedTransactions = [newTx, ...prev.transactions];
      }

      return {
        ...prev,
        products: updatedProducts,
        orders: [newOrder, ...prev.orders],
        clients: updatedClients,
        transactions: updatedTransactions,
      };
    });

    return newOrder;
  };

  const updateOrder = (id: string, fields: Partial<Order>) => {
    const now = new Date().toISOString();
    updateAllData((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== id) return o;
        const updated = { ...o, ...fields, updatedAt: now };
        if (fields.totalAmount !== undefined || fields.amountPaid !== undefined) {
          updated.balanceDue = Math.max(0, updated.totalAmount - (updated.amountPaid || 0));
        }
        firestoreSaveOrder(updated).catch((err) =>
          console.warn('[Firestore] updateOrder error:', err)
        );
        return updated;
      }),
    }));
  };

  const deleteOrder = (id: string) => {
    firestoreDeleteOrder(id).catch((err) =>
      console.warn('[Firestore] deleteOrder error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== id),
      transactions: prev.transactions.filter((t) => t.orderId !== id),
    }));
  };

  const addPartialPayment = (
    orderId: string,
    amount: number,
    method: PaymentMethod,
    note?: string,
    paymentDate?: string
  ) => {
    const now = new Date().toISOString();
    const effectiveDate = paymentDate || getLocalTodayString();
    const targetOrder = data.orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const paymentId = `pay-${Date.now()}`;
    const newPayment = {
      id: paymentId,
      date: effectiveDate,
      amount,
      method,
      note,
    };

    const newAmountPaid = (targetOrder.amountPaid || 0) + amount;
    const newBalance = Math.max(0, targetOrder.totalAmount - newAmountPaid);
    const updatedStatus = newBalance === 0 && targetOrder.status === 'pendiente' ? 'en_produccion' : targetOrder.status;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'ingreso',
      date: effectiveDate,
      amount,
      category: `Cobro pedido ${targetOrder.orderNumber}`,
      description: note || `Pago parcial para ${targetOrder.clientName}`,
      paymentMethod: method,
      orderId: targetOrder.id,
      isAutoFromOrder: true,
    };

    firestoreSaveTransaction(newTx).catch((err) =>
      console.warn('[Firestore] addPartialPayment tx error:', err)
    );

    updateAllData((prev) => {
      const updatedOrders = prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        const updated: Order = {
          ...o,
          amountPaid: newAmountPaid,
          balanceDue: newBalance,
          status: updatedStatus,
          partialPayments: [...(o.partialPayments || []), newPayment],
          updatedAt: now,
        };
        firestoreSaveOrder(updated).catch((err) =>
          console.warn('[Firestore] addPartialPayment order error:', err)
        );
        return updated;
      });

      return {
        ...prev,
        orders: updatedOrders,
        transactions: [newTx, ...prev.transactions],
      };
    });
  };

  const updatePartialPaymentDate = (orderId: string, paymentId: string, newDate: string) => {
    const now = new Date().toISOString();
    updateAllData((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        const updated: Order = {
          ...o,
          partialPayments: (o.partialPayments || []).map((p) =>
            p.id === paymentId ? { ...p, date: newDate } : p
          ),
          updatedAt: now,
        };
        firestoreSaveOrder(updated).catch((err) =>
          console.warn('[Firestore] updatePartialPaymentDate error:', err)
        );
        return updated;
      }),
    }));
  };

  const deletePartialPayment = (orderId: string, paymentId: string) => {
    const now = new Date().toISOString();
    updateAllData((prev) => {
      const targetOrder = prev.orders.find((o) => o.id === orderId);
      if (!targetOrder) return prev;

      const targetPayment = targetOrder.partialPayments.find((p) => p.id === paymentId);
      const paymentAmount = targetPayment?.amount || 0;

      const updatedPayments = targetOrder.partialPayments.filter((p) => p.id !== paymentId);
      const newAmountPaid = Math.max(0, targetOrder.amountPaid - paymentAmount);
      const newBalanceDue = Math.max(0, targetOrder.totalAmount - newAmountPaid);

      const updatedOrders = prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        const updated: Order = {
          ...o,
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          partialPayments: updatedPayments,
          updatedAt: now,
        };
        firestoreSaveOrder(updated).catch((err) =>
          console.warn('[Firestore] deletePartialPayment error:', err)
        );
        return updated;
      });

      return {
        ...prev,
        orders: updatedOrders,
      };
    });
  };

  // Transactions
  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
    };
    firestoreSaveTransaction(newTx).catch((err) =>
      console.warn('[Firestore] addTransaction error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
  };

  const updateTransaction = (id: string, fields: Partial<Transaction>) => {
    updateAllData((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...fields };
          firestoreSaveTransaction(updated).catch((err) =>
            console.warn('[Firestore] updateTransaction error:', err)
          );
          return updated;
        }
        return t;
      }),
    }));
  };

  const deleteTransaction = (id: string) => {
    firestoreDeleteTransaction(id).catch((err) =>
      console.warn('[Firestore] deleteTransaction error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  // Settings
  const updateCostSettings = (settings: Partial<CostSettings>) => {
    const now = new Date().toISOString();
    updateAllData((prev) => {
      const updatedCostSettings = { ...prev.costSettings, ...settings };
      firestoreSaveCostSettings(updatedCostSettings).catch((err) =>
        console.warn('[Firestore] updateCostSettings error:', err)
      );
      const effectiveHourly = updatedCostSettings.calculatedHourlyRate;
      const effectiveOverhead = updatedCostSettings.calculatedOverheadPerHour;
      const recalculatedProducts = prev.products.map((p) => {
        const recalculated = calculateProductPrices(p, prev.materials, effectiveHourly, effectiveOverhead);
        if (recalculated.finalPrice !== p.finalPrice || recalculated.calculatedCost !== p.calculatedCost) {
          const toSave = { ...recalculated, updatedAt: now };
          firestoreSaveProduct(toSave).catch((err) =>
            console.warn('[Firestore] updateCostSettings product sync error:', err)
          );
          return toSave;
        }
        return recalculated;
      });

      return {
        ...prev,
        costSettings: updatedCostSettings,
        products: recalculatedProducts,
      };
    });
  };

  const updateCatalogSettings = (settings: Partial<CatalogSettings>) => {
    updateAllData((prev) => {
      const updatedCatalog = { ...prev.catalogSettings, ...settings };
      firestoreSaveCatalogSettings(updatedCatalog).catch((err) =>
        console.warn('[Firestore] updateCatalogSettings notice:', err)
      );
      return {
        ...prev,
        catalogSettings: updatedCatalog,
      };
    });
  };

  // WhatsApp Templates
  const addCustomWhatsAppTemplate = (title: string, message: string) => {
    const newTmpl: WhatsAppTemplate = {
      id: `tmpl-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
    };
    updateAllData((prev) => ({
      ...prev,
      catalogSettings: {
        ...prev.catalogSettings,
        customTemplates: [...(prev.catalogSettings.customTemplates || []), newTmpl],
      },
    }));
  };

  const updateCustomWhatsAppTemplate = (id: string, title: string, message: string) => {
    updateAllData((prev) => ({
      ...prev,
      catalogSettings: {
        ...prev.catalogSettings,
        customTemplates: (prev.catalogSettings.customTemplates || []).map((t) =>
          t.id === id ? { ...t, title: title.trim(), message: message.trim() } : t
        ),
      },
    }));
  };

  const deleteCustomWhatsAppTemplate = (id: string) => {
    updateAllData((prev) => {
      const updatedCatalog = {
        ...prev.catalogSettings,
        customTemplates: (prev.catalogSettings.customTemplates || []).filter((t) => t.id !== id),
      };
      firestoreSaveCatalogSettings(updatedCatalog).catch((err) =>
        console.warn('[Firestore] deleteCustomWhatsAppTemplate error:', err)
      );
      return {
        ...prev,
        catalogSettings: updatedCatalog,
      };
    });
  };

  // Variant Suggestions
  const removeVariantSuggestion = (suggestion: string) => {
    updateAllData((prev) => {
      const updatedSuggestions = (prev.variantSuggestions || []).filter((s) => s !== suggestion);
      firestoreSaveCategories({
        categories: prev.categories,
        productCategories: prev.productCategories,
        materialCategories: prev.materialCategories,
        variantSuggestions: updatedSuggestions,
      }).catch((err) => console.warn('[Firestore] removeVariantSuggestion error:', err));
      return {
        ...prev,
        variantSuggestions: updatedSuggestions,
      };
    });
  };

  const addVariantSuggestion = (suggestion: string) => {
    const trimmed = suggestion.trim();
    if (!trimmed) return;
    updateAllData((prev) => {
      if ((prev.variantSuggestions || []).includes(trimmed)) return prev;
      const updatedSuggestions = [...(prev.variantSuggestions || []), trimmed];
      firestoreSaveCategories({
        categories: prev.categories,
        productCategories: prev.productCategories,
        materialCategories: prev.materialCategories,
        variantSuggestions: updatedSuggestions,
      }).catch((err) => console.warn('[Firestore] addVariantSuggestion error:', err));
      return {
        ...prev,
        variantSuggestions: updatedSuggestions,
      };
    });
  };

  // Clients & Suppliers
  const addClient = (client: Omit<Client, 'id' | 'createdAt' | 'totalOrders' | 'totalSpent'>) => {
    const newClient: Client = {
      ...client,
      id: `cli-${Date.now()}`,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    firestoreSaveClient(newClient).catch((err) =>
      console.warn('[Firestore] addClient error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      clients: [newClient, ...prev.clients],
    }));
  };

  const updateClient = (id: string, fields: Partial<Client>) => {
    updateAllData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...fields };
          firestoreSaveClient(updated).catch((err) =>
            console.warn('[Firestore] updateClient error:', err)
          );
          return updated;
        }
        return c;
      }),
    }));
  };

  const deleteClient = (id: string) => {
    firestoreDeleteClient(id).catch((err) =>
      console.warn('[Firestore] deleteClient error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== id),
    }));
  };

  const addMultipleClients = (clients: Partial<Client>[]) => {
    const now = new Date().toISOString().slice(0, 10);
    const newClients: Client[] = clients.map((c, i) => ({
      id: `cli-${Date.now()}-${i}`,
      name: c.name || 'Sin Nombre',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || 'Importado desde contactos',
      totalOrders: 0,
      totalSpent: 0,
      createdAt: now,
    }));

    newClients.forEach((cli) => {
      firestoreSaveClient(cli).catch((err) =>
        console.warn('[Firestore] addMultipleClients item error:', err)
      );
    });

    updateAllData((prev) => ({
      ...prev,
      clients: [...newClients, ...prev.clients],
    }));
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: `sup-${Date.now()}`,
    };
    firestoreSaveSupplier(newSupplier).catch((err) =>
      console.warn('[Firestore] addSupplier error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      suppliers: [newSupplier, ...prev.suppliers],
    }));
  };

  const updateSupplier = (id: string, fields: Partial<Supplier>) => {
    updateAllData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...fields };
          firestoreSaveSupplier(updated).catch((err) =>
            console.warn('[Firestore] updateSupplier error:', err)
          );
          return updated;
        }
        return s;
      }),
    }));
  };

  const deleteSupplier = (id: string) => {
    firestoreDeleteSupplier(id).catch((err) =>
      console.warn('[Firestore] deleteSupplier error:', err)
    );
    updateAllData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
    }));
  };

  return (
    <AppContext.Provider
      value={{
        data,
        isAdmin,
        setIsAdmin,
        adminAuthenticated,
        adminToken,
        isRealtimeConnected,
        currentTab,
        setCurrentTab,
        ordersCompactView,
        setOrdersCompactView,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        isLoginModalOpen,
        setIsLoginModalOpen,
        loginAsAdmin,
        logoutAdmin,
        isSyncing,
        lastSyncTime,
        refreshFromCloud,
        liveSyncAlert,
        addProduct,
        updateProduct,
        duplicateProduct,
        deleteProduct,
        addProductCategory,
        renameProductCategory,
        deleteProductCategory,
        addSubcategory,
        renameSubcategory,
        deleteSubcategory,
        addMaterialCategory,
        renameMaterialCategory,
        deleteMaterialCategory,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        addOrder,
        updateOrder,
        deleteOrder,
        addPartialPayment,
        updatePartialPaymentDate,
        deletePartialPayment,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        updateCostSettings,
        setGlobalHourlyRate,
        updateCatalogSettings,
        addCustomWhatsAppTemplate,
        updateCustomWhatsAppTemplate,
        deleteCustomWhatsAppTemplate,
        removeVariantSuggestion,
        addVariantSuggestion,
        addClient,
        updateClient,
        deleteClient,
        addMultipleClients,
        addSupplier,
        updateSupplier,
        deleteSupplier,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
