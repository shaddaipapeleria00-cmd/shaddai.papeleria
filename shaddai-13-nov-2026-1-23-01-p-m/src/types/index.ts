export type ProductType = 'stock' | 'order';

export interface VariantOptionItem {
  name: string;
  price?: number; // individual custom price for this variant (net after option subtraction)
  rawPrice?: number; // optional pre-subtraction manual price for this variant
  subtractionAmount?: number; // independent manual subtraction ($) for this variant option
  promoDiscountPercent?: number; // Promo % for this variant
  promoDiscountFixed?: number; // Promo $ for this variant
  finalPrice?: number; // Calculated/promotional price for this variant
  materialsUsed?: ProductMaterialUsage[]; // Custom materials if variant uses different materials
  laborMinutes?: number; // Custom labor minutes if applicable
  profitMarginPercent?: number; // Custom profit margin if applicable
}

export interface ProductVariant {
  name: string; // e.g., "Tamaño", "Tipo de Hojas", "Color de Anillo", "Acabado"
  options: VariantOptionItem[];
}

export interface ProductMaterialUsage {
  materialId: string;
  materialName: string;
  quantity: number; // e.g. 0.5 or 2
  usePercentage?: number; // e.g. 50% of the unit
  divisionParts?: number; // e.g. 1 unit yields X parts (quantity = 1 / divisionParts)
  unitCost: number;
}

export type PromoType = 'percentage' | 'fixed'; // Descuento en % o en $ pesos

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  images: string[];
  type: ProductType; // 'stock' = productos por stock, 'order' = productos por pedido
  stockQuantity: number;
  visibleInCatalog?: boolean; // Opción para mostrar u ocultar en el catálogo online para clientes
  
  // Variants with individual price
  variants?: ProductVariant[];
  
  // Cost breakdown
  materialsUsed: ProductMaterialUsage[];
  laborMinutes: number; // Tiempo de confección en minutos
  laborHours: number; // laborMinutes / 60
  hourlyRate: number;
  invisibleExpenseFixed: number;
  profitMarginPercent: number;
  subtractionAmount: number; // Resta manual para fijar precio redondo
  roundToCleanNumbers: boolean;
  
  // Pricing
  calculatedCost: number;
  basePrice: number;
  promoActive: boolean;
  promoType?: PromoType; // 'percentage' | 'fixed'
  promoDiscountPercent: number; // if percentage
  promoDiscountFixed?: number; // if fixed $
  promoLabel?: string;
  finalPrice: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: 'unidad' | 'metro' | 'pliego' | 'hoja' | 'bobina' | 'kg' | 'gr' | 'pack' | 'otro';
  unitCost: number;
  // Wholesale cost fields
  wholesalePrice?: number; // Precio por bulto / paquete
  wholesaleUnits?: number; // Cantidad de unidades que trae el bulto
  currentStock: number;
  supplier: string;
  notes?: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  productImage?: string;
  type: ProductType;
  selectedVariants?: Record<string, string>; // e.g. { "Tamaño": "A5", "Hojas": "Rayadas" }
}

export type OrderStatus = 'pendiente' | 'en_produccion' | 'listo' | 'entregado' | 'cancelado';
export type DeliveryMethod = 'retirar' | 'domicilio' | 'correo_argentino';
export type PaymentMethod = 'efectivo' | 'transferencia';

export interface PartialPayment {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  clientEmail?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost?: number;
  shippingNote?: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number; // Saldo por cobrar
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  notes?: string;
  partialPayments: PartialPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  itemsSupplied?: string;
  notes?: string;
}

export type TransactionType = 'ingreso' | 'egreso';

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  description: string;
  paymentMethod: PaymentMethod | 'tarjeta' | 'otro';
  orderId?: string;
  isAutoFromOrder?: boolean;
}

export interface InvisibleExpense {
  id: string;
  name: string;
  monthlyCost: number;
  category: 'servicios' | 'alquiler' | 'herramientas' | 'empaque' | 'otro';
}

export interface CostSettings {
  targetMonthlySalary: number;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  calculatedHourlyRate: number; // Hourly rate applied across products
  invisibleExpenses: InvisibleExpense[];
  calculatedOverheadPerHour: number;
  defaultProfitMargin: number;
}

export interface BankInfo {
  banco: string;
  titular: string;
  cbu: string;
  alias: string;
  cuit: string;
  tipoCuenta: string;
}

export interface WhatsAppTemplate {
  id: string;
  title: string;
  message: string;
}

export interface CatalogSettings {
  appName: string;
  appTagline: string;
  headerBadge: string;
  welcomeDescription: string;
  bannerType: 'horizontal' | 'square';
  bannerUrl: string;
  businessWhatsApp: string;
  businessEmail: string;
  bankInfo: BankInfo;
  whatsappTemplates: {
    orderGreeting: string;
    inProduction: string;
    readyForDelivery: string;
    receiptReminder: string;
  };
  customTemplates?: WhatsAppTemplate[];
}

export interface AppData {
  products: Product[];
  materials: Material[];
  orders: Order[];
  clients: Client[];
  suppliers: Supplier[];
  transactions: Transaction[];
  costSettings: CostSettings;
  catalogSettings: CatalogSettings;
  categories: ProductCategory[];
  productCategories: string[]; // For backwards-compatibility & easy listing
  materialCategories: string[];
  variantSuggestions: string[];
}
