import fs from "fs";
import path from "path";
import os from "os";
import { calculateGSTInvoice, LineItemInput, CalculationOptions, InvoiceCalculationResult } from "./gst";

// In serverless environments (e.g. Vercel, AWS Lambda), process.cwd() is read-only (/var/task).
// Use os.tmpdir() where writable storage is guaranteed.
function resolveDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), ".lensart_data");
  }
  try {
    const localDir = path.join(process.cwd(), ".lensart_data");
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    return path.join(os.tmpdir(), ".lensart_data");
  }
}

const DATA_DIR = resolveDataDir();
const memoryStore = new Map<string, unknown>();

function ensureDirectoryExists(dir: string) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // If directory creation fails, memoryStore gracefully handles reads & writes
  }
}

function getFilePath(collection: string): string {
  try {
    ensureDirectoryExists(DATA_DIR);
    return path.join(DATA_DIR, `${collection}.json`);
  } catch {
    return "";
  }
}

export function readCollection<T>(collection: string, defaultData: T[] = []): T[] {
  try {
    if (memoryStore.has(collection)) {
      return memoryStore.get(collection) as T[];
    }
    const filePath = getFilePath(collection);
    if (!filePath || !fs.existsSync(filePath)) {
      memoryStore.set(collection, defaultData);
      writeCollection(collection, defaultData);
      return defaultData;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    const result = Array.isArray(parsed)
      ? (parsed as T[])
      : parsed && typeof parsed === "object"
      ? ([parsed] as unknown as T[])
      : defaultData;
    memoryStore.set(collection, result);
    return result;
  } catch (err) {
    console.warn(`Reading ${collection} falling back to memory store:`, err);
    return (memoryStore.get(collection) as T[]) || defaultData;
  }
}

export function writeCollection<T>(collection: string, data: T[]): void {
  memoryStore.set(collection, data);
  try {
    const filePath = getFilePath(collection);
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    }
  } catch (err) {
    // Memory store retains the update even if filesystem is read-only
  }
}

// ============================================================================
// DATA MODELS & TYPES
// ============================================================================

export interface BusinessSettings {
  name: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  stateCode: string; // e.g. "27"
  pinCode: string;
  phone: string;
  email: string;
  gstin: string;
  isGstRegistered: boolean;
  invoicePrefix: string;
  invoiceNextNumber: number;
  orderPrefix: string;
  orderNextNumber: number;
  patientPrefix: string;
  patientNextNumber: number;
  financialYear: string;
  defaultPaymentMethods: string[];
  invoiceFooter: string;
  returnPolicy: string;
  warrantyPolicy: string;
  termsAndConditions: string;
  signatory: string;
}

export interface Customer {
  id: string;
  customerCode: string; // PT-0001
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  gstin?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  prescriptionCode: string; // RX-0001
  customerId: string;
  customerName?: string;
  examinationDate: string;
  prescribedBy: string;
  prescriptionType: "SPECTACLE" | "CONTACT_LENS" | "BOTH";
  
  // Right Eye (OD)
  rightSph?: string;
  rightCyl?: string;
  rightAxis?: number;
  rightAdd?: string;
  rightVa?: string;
  rightPrism?: string;
  rightBase?: string;

  // Left Eye (OS)
  leftSph?: string;
  leftCyl?: string;
  leftAxis?: number;
  leftAdd?: string;
  leftVa?: string;
  leftPrism?: string;
  leftBase?: string;

  // Measurement
  pd?: number;
  pdRight?: number;
  pdLeft?: number;
  nearVisionDetails?: string;
  distanceVisionDetails?: string;
  lensRecommendation?: string;
  notes?: string;
  nextExaminationDate?: string;
  
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: "FRAME" | "LENS" | "SUNGLASSES" | "CONTACT_LENS" | "ACCESSORY" | "SERVICE";
  brand: string;
  model?: string;
  description?: string;
  barcode?: string;
  supplierId?: string;
  purchaseCost: number;
  sellingPrice: number;
  hsnCode: string;
  gstRate: number;
  isVerifiedRate: boolean;
  isActive: boolean;
  trackInventory: boolean;
  reorderThreshold: number;
  currentStock: number;

  // Specifics
  frameShape?: string;
  frameMaterial?: string;
  frameColor?: string;
  eyeSize?: string;
  bridgeSize?: string;
  templeLength?: string;
  lensType?: string;
  lensMaterial?: string;
  refractiveIndex?: string;
  isPhotochromic?: boolean;
  isBlueFilter?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  movementType: "PURCHASE_IN" | "SALE_OUT" | "ADJUSTMENT" | "RETURN_IN" | "RETURN_OUT" | "INITIAL";
  quantity: number; // positive or negative
  previousStock: number;
  newStock: number;
  referenceType?: "INVOICE" | "PURCHASE_ORDER" | "ADJUSTMENT" | "RETURN";
  referenceId?: string;
  reason?: string;
  performedBy: string;
  createdAt: string;
}

export interface OpticalOrder {
  id: string;
  orderNumber: string; // ORD-0001
  customerId: string;
  customerName: string;
  customerPhone?: string;
  prescriptionId?: string;
  prescriptionSnapshot?: Partial<Prescription>;
  orderDate: string;
  expectedCompletionDate?: string;
  status:
    | "PRESCRIPTION_RECORDED"
    | "ORDER_CONFIRMED"
    | "PAYMENT_PENDING"
    | "SENT_TO_LAB"
    | "IN_PRODUCTION"
    | "QUALITY_CHECK"
    | "READY_FOR_COLLECTION"
    | "DELIVERED"
    | "CANCELLED";
  assignedToName?: string;
  labInfo?: string;
  fittingDetails?: string;
  items: Array<{
    id: string;
    productId?: string;
    description: string;
    itemType: "FRAME" | "LENS" | "ACCESSORY" | "SERVICE";
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  internalNotes?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2026-0001
  invoiceDate: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  orderId?: string;
  status: "DRAFT" | "FINALIZED" | "CANCELLED";
  
  // Tax & Supply Details
  placeOfSupply: string;
  placeOfSupplyCode: string;
  isInterState: boolean;
  isTaxInclusive: boolean;
  
  // Financial Breakdowns
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  finalAmount: number;
  amountPaid: number;
  balanceDue: number;

  items: Array<{
    id: string;
    productId?: string;
    description: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxableAmount: number;
    gstRate: number;
    isVerifiedRate: boolean;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
  }>;

  taxSummary: Array<{
    hsnCode: string;
    gstRate: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
    hasUnverifiedRate: boolean;
  }>;

  notes?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string; // PAY-0001
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER";
  transactionRef?: string;
  paymentDate: string;
  status: "COMPLETED" | "REFUNDED" | "VOID";
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string; // CN-0001
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  creditNoteDate: string;
  reason: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    gstRate: number;
    totalAmount: number;
    returnReason: string;
    itemCondition: "GOOD" | "DAMAGED" | "DEFECTIVE";
    restockable: boolean;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "ISSUED" | "APPLIED" | "REFUNDED";
  createdBy: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  gstin?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userName?: string;
  eventType: string; // LOGIN, CREATE, UPDATE, FINALIZE, CANCEL, ADJUST_STOCK
  module: string; // billing, patients, prescriptions, orders, inventory, settings
  recordType?: string;
  recordId?: string;
  description: string;
  details?: Record<string, any>;
  createdAt: string;
}

// ============================================================================
// INITIAL SEED DATA
// ============================================================================

export function getInitialBusinessSettings(): BusinessSettings {
  return {
    name: "LensArt Optical Retailers",
    legalName: "LensArt Eyewear Private Limited",
    address: "Shop No. 12, Ground Floor, Trinity Galleria, M.G. Road",
    city: "Mumbai",
    state: "Maharashtra",
    stateCode: "27",
    pinCode: "400001",
    phone: "+91 98200 12345",
    email: "contact@lensart.in",
    gstin: "27AABCL1234F1Z8",
    isGstRegistered: true,
    invoicePrefix: "INV-26",
    invoiceNextNumber: 101,
    orderPrefix: "ORD-26",
    orderNextNumber: 201,
    patientPrefix: "PT",
    patientNextNumber: 501,
    financialYear: "2026-2027",
    defaultPaymentMethods: ["UPI", "CASH", "CARD", "BANK_TRANSFER"],
    invoiceFooter: "Thank you for choosing LensArt! Clear vision, clear life.",
    returnPolicy: "Frames and non-prescription sunglasses may be exchanged within 7 days in original condition. Prescription lenses are custom made and non-returnable unless defective.",
    warrantyPolicy: "1 Year manufacturing warranty against frame breakage and lens coating peel-off.",
    termsAndConditions: "Subject to Mumbai jurisdiction. Goods once sold will be serviced per warranty terms.",
    signatory: "Authorized Signatory for LensArt Eyewear Pvt Ltd",
  };
}

export function initializeStoreIfEmpty() {
  ensureDirectoryExists(DATA_DIR);

  // 1. Business Settings
  const existingSettings = readCollection<BusinessSettings>("business_settings", []);
  if (existingSettings.length === 0) {
    writeCollection("business_settings", [getInitialBusinessSettings()]);
  }

  // 2. Initial Products
  const products = readCollection<Product>("products", []);
  if (products.length === 0) {
    const initialProducts: Product[] = [
      {
        id: "prod-001",
        sku: "FRM-TIT-01",
        name: "LensArt AirTitanium Minimalist",
        category: "FRAME",
        brand: "LensArt Signature",
        model: "AT-801",
        barcode: "890123456001",
        purchaseCost: 1200,
        sellingPrice: 3499,
        hsnCode: "9003",
        gstRate: 12,
        isVerifiedRate: false, // flagged for professional review
        isActive: true,
        trackInventory: true,
        reorderThreshold: 5,
        currentStock: 18,
        frameShape: "Rectangle",
        frameMaterial: "Pure Titanium",
        frameColor: "Matte Black",
        eyeSize: "52",
        bridgeSize: "18",
        templeLength: "140",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-002",
        sku: "FRM-ACE-02",
        name: "Classic Italian Acetate Wayfarer",
        category: "FRAME",
        brand: "Venezia",
        model: "VZ-402",
        barcode: "890123456002",
        purchaseCost: 850,
        sellingPrice: 2299,
        hsnCode: "9003",
        gstRate: 12,
        isVerifiedRate: false,
        isActive: true,
        trackInventory: true,
        reorderThreshold: 4,
        currentStock: 12,
        frameShape: "Wayfarer",
        frameMaterial: "Handmade Acetate",
        frameColor: "Tortoise Shell",
        eyeSize: "50",
        bridgeSize: "20",
        templeLength: "145",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-003",
        sku: "LNS-BLU-156",
        name: "ClarityPro 1.56 BlueCut Anti-Glare Lens (Pair)",
        category: "LENS",
        brand: "ClarityPro",
        model: "BC-156",
        purchaseCost: 600,
        sellingPrice: 1800,
        hsnCode: "9001",
        gstRate: 12,
        isVerifiedRate: false,
        isActive: true,
        trackInventory: true,
        reorderThreshold: 10,
        currentStock: 35,
        lensType: "Single Vision",
        lensMaterial: "CR-39 Resin",
        refractiveIndex: "1.56",
        isPhotochromic: false,
        isBlueFilter: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-004",
        sku: "LNS-PROG-167",
        name: "OptiView HD Digital Progressive Lens (Pair)",
        category: "LENS",
        brand: "OptiView",
        model: "OV-HD-167",
        purchaseCost: 2400,
        sellingPrice: 6500,
        hsnCode: "9001",
        gstRate: 12,
        isVerifiedRate: false,
        isActive: true,
        trackInventory: true,
        reorderThreshold: 2,
        currentStock: 8,
        lensType: "Progressive",
        lensMaterial: "High Index MR-7",
        refractiveIndex: "1.67",
        isPhotochromic: true,
        isBlueFilter: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-005",
        sku: "ACC-CLN-KIT",
        name: "LensArt Hydrophobic Lens Cleaning Spray & Microfiber Kit",
        category: "ACCESSORY",
        brand: "LensArt",
        purchaseCost: 45,
        sellingPrice: 150,
        hsnCode: "3307",
        gstRate: 18,
        isVerifiedRate: false,
        isActive: true,
        trackInventory: true,
        reorderThreshold: 15,
        currentStock: 45,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-006",
        sku: "SNG-POL-01",
        name: "Aviator Polarized UV400 Sunglasses",
        category: "SUNGLASSES",
        brand: "Solaris",
        model: "AV-202",
        barcode: "890123456006",
        purchaseCost: 1100,
        sellingPrice: 2999,
        hsnCode: "90041000",
        gstRate: 28,
        isVerifiedRate: false,
        isActive: true,
        trackInventory: true,
        reorderThreshold: 3,
        currentStock: 6,
        frameShape: "Aviator",
        frameMaterial: "Metal Alloy",
        frameColor: "Gunmetal",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    writeCollection("products", initialProducts);
  }

  // 3. Initial Suppliers
  const suppliers = readCollection<Supplier>("suppliers", []);
  if (suppliers.length === 0) {
    const initialSuppliers: Supplier[] = [
      {
        id: "sup-001",
        name: "Essilor Vision India Pvt Ltd",
        contactPerson: "Mr. Ramesh Sharma",
        phone: "+91 98210 99887",
        email: "orders@essilorvision.in",
        address: "Plot 45, MIDC Industrial Area, Andheri East",
        city: "Mumbai",
        state: "Maharashtra",
        stateCode: "27",
        gstin: "27AAACE1234M1Z1",
        paymentTerms: "30 Days Net",
        notes: "Primary supplier for high-index and progressive lenses",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "sup-002",
        name: "Titan Eyewear Distributors",
        contactPerson: "Ms. Priya Desai",
        phone: "+91 98450 11223",
        email: "distribution@titaneye.in",
        address: "Electronic City Phase 1",
        city: "Bengaluru",
        state: "Karnataka",
        stateCode: "29",
        gstin: "29AAACT9876K1Z4",
        paymentTerms: "15 Days Net",
        notes: "Frames, titanium components, sunglasses",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];
    writeCollection("suppliers", initialSuppliers);
  }

  // 4. Initial Patients / Customers
  const customers = readCollection<Customer>("customers", []);
  if (customers.length === 0) {
    const initialCustomers: Customer[] = [
      {
        id: "cust-001",
        customerCode: "PT-501",
        name: "Aarav Mehra",
        phone: "+91 98765 43210",
        email: "aarav.mehra@example.com",
        dateOfBirth: "1990-05-14",
        address: "Flat 402, Sea Breeze Apts, Bandra West",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400050",
        notes: "Prefers lightweight titanium frames. High screen time software engineer.",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "cust-002",
        customerCode: "PT-502",
        name: "Sunita Roy",
        phone: "+91 98111 22334",
        email: "sunita.roy@example.com",
        dateOfBirth: "1975-11-20",
        address: "14/B, Lotus Colony, Powai",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400076",
        notes: "Progressive wearer for 5 years. Complained of reading fatigue.",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    writeCollection("customers", initialCustomers);
  }

  // 5. Initial Prescriptions
  const prescriptions = readCollection<Prescription>("prescriptions", []);
  if (prescriptions.length === 0) {
    const initialPrescriptions: Prescription[] = [
      {
        id: "rx-001",
        prescriptionCode: "RX-101",
        customerId: "cust-001",
        customerName: "Aarav Mehra",
        examinationDate: "2026-10-20",
        prescribedBy: "Dr. K. S. Nair, Optometrist",
        prescriptionType: "SPECTACLE",
        rightSph: "-2.00",
        rightCyl: "-0.50",
        rightAxis: 90,
        rightVa: "6/6",
        leftSph: "-2.25",
        leftCyl: "-0.75",
        leftAxis: 85,
        leftVa: "6/6",
        pd: 63,
        pdRight: 31.5,
        pdLeft: 31.5,
        nearVisionDetails: "N6 at 40cm",
        distanceVisionDetails: "6/6 both eyes with correction",
        lensRecommendation: "1.56 BlueCut Anti-Glare coating recommended for laptop usage",
        notes: "Routine examination. Mild astigmatism stable.",
        nextExaminationDate: "2027-10-20",
        createdById: "user-1",
        createdByName: "Dr. K. S. Nair",
        createdAt: new Date("2026-10-20T10:30:00Z").toISOString(),
      },
    ];
    writeCollection("prescriptions", initialPrescriptions);
  }
}
