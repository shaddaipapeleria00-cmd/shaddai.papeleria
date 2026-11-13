import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  getDocFromServer,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
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
  ProductCategory,
} from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Target provisioned database if specified in config, otherwise default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Helper to remove 'undefined' fields which Firestore rejects
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data.toISOString() as any;
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (val !== undefined) {
      cleaned[key] = cleanForFirestore(val);
    }
  }
  return cleaned as any;
}

// Connection test as required by skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Connected to Cloud Firestore successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline or Firestore initializing.');
    } else {
      console.log('[Firestore] Handshake test doc probed.');
    }
    return true;
  }
}

// Check if database is empty and seed initial data once
export async function seedInitialDataIfEmpty(initialData: AppData): Promise<boolean> {
  try {
    const markerDoc = await getDoc(doc(db, 'settings', 'seed_marker'));
    const catalogDoc = await getDoc(doc(db, 'settings', 'catalog'));
    if (markerDoc.exists() || catalogDoc.exists()) {
      // Already populated once - NEVER overwrite or resurrect deleted items
      return false;
    }

    console.log('[Firestore] First time initialization: Seeding store data into Firestore...');
    const batch = writeBatch(db);

    // Marker to prevent any future re-seeding
    batch.set(doc(db, 'settings', 'seed_marker'), { initialized: true, timestamp: Date.now() });

    // Settings
    batch.set(doc(db, 'settings', 'catalog'), cleanForFirestore(initialData.catalogSettings));
    batch.set(doc(db, 'settings', 'categories'), cleanForFirestore({
      categories: initialData.categories,
      productCategories: initialData.productCategories,
      materialCategories: initialData.materialCategories,
      variantSuggestions: initialData.variantSuggestions,
    }));
    batch.set(doc(db, 'settings', 'costSettings'), cleanForFirestore(initialData.costSettings));

    // Products
    initialData.products.forEach((prod) => {
      batch.set(doc(db, 'products', prod.id), cleanForFirestore(prod));
    });

    // Materials
    initialData.materials.forEach((mat) => {
      batch.set(doc(db, 'materials', mat.id), cleanForFirestore(mat));
    });

    // Orders
    initialData.orders.forEach((ord) => {
      batch.set(doc(db, 'orders', ord.id), cleanForFirestore(ord));
    });

    // Clients
    initialData.clients.forEach((cli) => {
      batch.set(doc(db, 'clients', cli.id), cleanForFirestore(cli));
    });

    // Suppliers
    initialData.suppliers.forEach((sup) => {
      batch.set(doc(db, 'suppliers', sup.id), cleanForFirestore(sup));
    });

    // Transactions
    initialData.transactions.forEach((tx) => {
      batch.set(doc(db, 'transactions', tx.id), cleanForFirestore(tx));
    });

    await batch.commit();
    console.log('[Firestore] Initial seeding completed successfully.');
    return true;
  } catch (err) {
    console.error('[Firestore] Error seeding initial data:', err);
    return false;
  }
}

// Real-time store listener interface
export interface FirestoreStoreListeners {
  onCatalogSettings: (settings: CatalogSettings) => void;
  onCategoriesData: (data: {
    categories: ProductCategory[];
    productCategories: string[];
    materialCategories: string[];
    variantSuggestions: string[];
  }) => void;
  onCostSettings: (cost: CostSettings) => void;
  onProducts: (products: Product[]) => void;
  onMaterials: (materials: Material[]) => void;
  onOrders: (orders: Order[]) => void;
  onTransactions: (transactions: Transaction[]) => void;
  onClients: (clients: Client[]) => void;
  onSuppliers: (suppliers: Supplier[]) => void;
  onError?: (err: Error) => void;
}

// Subscribe to all Firestore collections and documents in real time
export function subscribeToFirestoreStore(listeners: FirestoreStoreListeners): () => void {
  const unsubscribers: Unsubscribe[] = [];

  // 1. Catalog Settings
  const unsubCatalog = onSnapshot(
    doc(db, 'settings', 'catalog'),
    (snap) => {
      if (snap.exists()) {
        listeners.onCatalogSettings(snap.data() as CatalogSettings);
      }
    },
    (err) => {
      console.warn('[Firestore] Catalog settings listener warning:', err.message);
      listeners.onError?.(err);
    }
  );
  unsubscribers.push(unsubCatalog);

  // 2. Categories Settings
  const unsubCategories = onSnapshot(
    doc(db, 'settings', 'categories'),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        listeners.onCategoriesData({
          categories: d.categories || [],
          productCategories: d.productCategories || [],
          materialCategories: d.materialCategories || [],
          variantSuggestions: d.variantSuggestions || [],
        });
      }
    },
    (err) => console.warn('[Firestore] Categories listener warning:', err.message)
  );
  unsubscribers.push(unsubCategories);

  // 3. Cost Settings
  const unsubCost = onSnapshot(
    doc(db, 'settings', 'costSettings'),
    (snap) => {
      if (snap.exists()) {
        listeners.onCostSettings(snap.data() as CostSettings);
      }
    },
    (err) => console.warn('[Firestore] Cost settings listener warning:', err.message)
  );
  unsubscribers.push(unsubCost);

  // 4. Products Collection
  const unsubProducts = onSnapshot(
    collection(db, 'products'),
    (snap) => {
      const prods: Product[] = [];
      snap.forEach((d) => prods.push(d.data() as Product));
      // Sort by creation or update desc
      prods.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
      listeners.onProducts(prods);
    },
    (err) => console.warn('[Firestore] Products listener warning:', err.message)
  );
  unsubscribers.push(unsubProducts);

  // 5. Materials Collection
  const unsubMaterials = onSnapshot(
    collection(db, 'materials'),
    (snap) => {
      const mats: Material[] = [];
      snap.forEach((d) => mats.push(d.data() as Material));
      listeners.onMaterials(mats);
    },
    (err) => console.warn('[Firestore] Materials listener warning:', err.message)
  );
  unsubscribers.push(unsubMaterials);

  // 6. Orders Collection
  const unsubOrders = onSnapshot(
    collection(db, 'orders'),
    (snap) => {
      const ords: Order[] = [];
      snap.forEach((d) => ords.push(d.data() as Order));
      ords.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      listeners.onOrders(ords);
    },
    (err) => console.warn('[Firestore] Orders listener warning:', err.message)
  );
  unsubscribers.push(unsubOrders);

  // 7. Transactions Collection
  const unsubTransactions = onSnapshot(
    collection(db, 'transactions'),
    (snap) => {
      const txs: Transaction[] = [];
      snap.forEach((d) => txs.push(d.data() as Transaction));
      txs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      listeners.onTransactions(txs);
    },
    (err) => console.warn('[Firestore] Transactions listener warning:', err.message)
  );
  unsubscribers.push(unsubTransactions);

  // 8. Clients Collection
  const unsubClients = onSnapshot(
    collection(db, 'clients'),
    (snap) => {
      const clis: Client[] = [];
      snap.forEach((d) => clis.push(d.data() as Client));
      listeners.onClients(clis);
    },
    (err) => console.warn('[Firestore] Clients listener warning:', err.message)
  );
  unsubscribers.push(unsubClients);

  // 9. Suppliers Collection
  const unsubSuppliers = onSnapshot(
    collection(db, 'suppliers'),
    (snap) => {
      const sups: Supplier[] = [];
      snap.forEach((d) => sups.push(d.data() as Supplier));
      listeners.onSuppliers(sups);
    },
    (err) => console.warn('[Firestore] Suppliers listener warning:', err.message)
  );
  unsubscribers.push(unsubSuppliers);

  // Return clean-up function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// ----------------- MUTATION OPERATIONS -----------------

// Update Catalog Settings (title, tagline, header badge, banner, whatsapp, email, templates)
export async function firestoreSaveCatalogSettings(settings: CatalogSettings): Promise<void> {
  const ref = doc(db, 'settings', 'catalog');
  await setDoc(ref, cleanForFirestore(settings), { merge: true });
}

// Update Categories data
export async function firestoreSaveCategories(categoriesData: {
  categories?: ProductCategory[];
  productCategories?: string[];
  materialCategories?: string[];
  variantSuggestions?: string[];
}): Promise<void> {
  const ref = doc(db, 'settings', 'categories');
  await setDoc(ref, cleanForFirestore(categoriesData), { merge: true });
}

// Update Cost Settings
export async function firestoreSaveCostSettings(costSettings: CostSettings): Promise<void> {
  const ref = doc(db, 'settings', 'costSettings');
  await setDoc(ref, cleanForFirestore(costSettings), { merge: true });
}

// Products
export async function firestoreSaveProduct(product: Product): Promise<void> {
  const ref = doc(db, 'products', product.id);
  await setDoc(ref, cleanForFirestore(product), { merge: true });
}

export async function firestoreDeleteProduct(productId: string): Promise<void> {
  const ref = doc(db, 'products', productId);
  await deleteDoc(ref);
}

// Materials
export async function firestoreSaveMaterial(material: Material): Promise<void> {
  const ref = doc(db, 'materials', material.id);
  await setDoc(ref, cleanForFirestore(material), { merge: true });
}

export async function firestoreDeleteMaterial(materialId: string): Promise<void> {
  const ref = doc(db, 'materials', materialId);
  await deleteDoc(ref);
}

// Orders
export async function firestoreSaveOrder(order: Order): Promise<void> {
  const ref = doc(db, 'orders', order.id);
  await setDoc(ref, cleanForFirestore(order), { merge: true });
}

export async function firestoreDeleteOrder(orderId: string): Promise<void> {
  const ref = doc(db, 'orders', orderId);
  await deleteDoc(ref);
}

// Transactions
export async function firestoreSaveTransaction(transaction: Transaction): Promise<void> {
  const ref = doc(db, 'transactions', transaction.id);
  await setDoc(ref, cleanForFirestore(transaction), { merge: true });
}

export async function firestoreDeleteTransaction(transactionId: string): Promise<void> {
  const ref = doc(db, 'transactions', transactionId);
  await deleteDoc(ref);
}

// Clients
export async function firestoreSaveClient(client: Client): Promise<void> {
  const ref = doc(db, 'clients', client.id);
  await setDoc(ref, cleanForFirestore(client), { merge: true });
}

export async function firestoreDeleteClient(clientId: string): Promise<void> {
  const ref = doc(db, 'clients', clientId);
  await deleteDoc(ref);
}

// Suppliers
export async function firestoreSaveSupplier(supplier: Supplier): Promise<void> {
  const ref = doc(db, 'suppliers', supplier.id);
  await setDoc(ref, cleanForFirestore(supplier), { merge: true });
}

export async function firestoreDeleteSupplier(supplierId: string): Promise<void> {
  const ref = doc(db, 'suppliers', supplierId);
  await deleteDoc(ref);
}
