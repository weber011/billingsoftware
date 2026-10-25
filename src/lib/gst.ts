/**
 * LensArt Indian GST Calculation Engine
 * 
 * Complies with Indian Goods and Services Tax rules:
 * - Intra-state supplies: CGST (50% of GST rate) + SGST (50% of GST rate)
 * - Inter-state supplies: IGST (100% of GST rate)
 * - Support for Tax-Exclusive and Tax-Inclusive pricing
 * - Defensible discount distribution
 * - Decimal rounding per standard Indian invoicing practice (half-up, nearest paise or rupee)
 * - Explicit distinction between legally verified and unverified tax configurations
 */

export interface TaxRateConfig {
  hsnCode?: string;
  gstRate: number; // e.g. 12 or 18
  isVerified?: boolean;
}

export interface LineItemInput {
  id?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number; // Unit price as specified (either exclusive or inclusive depending on isTaxInclusive)
  discountPercent?: number; // e.g. 10 for 10%
  discountAmount?: number; // direct line discount
  gstRate: number; // e.g. 12 for 12%
  isVerifiedRate?: boolean;
}

export interface CalculationOptions {
  isTaxInclusive: boolean;
  supplierStateCode: string; // 2-digit code e.g. "27" for Maharashtra, "07" for Delhi
  placeOfSupplyCode: string; // 2-digit state code of recipient/supply
  isSupplierGstRegistered: boolean;
  invoiceDiscountAmount?: number; // Global bill discount applied across items
}

export interface CalculatedLineItem {
  id?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  rawAmount: number; // qty * unitPrice
  lineDiscount: number;
  allocatedInvoiceDiscount: number;
  totalDiscount: number;
  taxableValue: number;
  gstRate: number;
  isVerifiedRate: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number; // taxableValue + totalTax
}

export interface GSTSummaryComponent {
  hsnCode?: string;
  gstRate: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  hasUnverifiedRate: boolean;
}

export interface InvoiceCalculationResult {
  isInterState: boolean;
  isSupplierGstRegistered: boolean;
  isTaxInclusive: boolean;
  subtotal: number; // gross amount before discounts
  totalLineDiscounts: number;
  invoiceDiscount: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  finalPayable: number;
  items: CalculatedLineItem[];
  taxSummary: GSTSummaryComponent[];
  unverifiedRateCount: number;
  warnings: string[];
}

/**
 * Rounds a number to specified decimal places (default 2)
 */
export function roundTo2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Performs full GST calculation on line items and overall invoice
 */
export function calculateGSTInvoice(
  items: LineItemInput[],
  options: CalculationOptions
): InvoiceCalculationResult {
  const warnings: string[] = [];
  const isInterState =
    options.supplierStateCode.trim() !== "" &&
    options.placeOfSupplyCode.trim() !== "" &&
    options.supplierStateCode.trim().padStart(2, "0") !==
      options.placeOfSupplyCode.trim().padStart(2, "0");

  if (!options.isSupplierGstRegistered) {
    warnings.push("Supplier is not GST registered. Tax amounts will not be charged on tax invoice.");
  }

  // Phase 1: Determine initial raw amounts and line discounts
  let totalRawAmount = 0;
  let totalItemDiscounts = 0;

  const preppedItems = items.map((item) => {
    const qty = Math.max(0, item.quantity);
    const unitPrice = Math.max(0, item.unitPrice);
    const raw = roundTo2(qty * unitPrice);

    let lineDisc = 0;
    if (item.discountAmount && item.discountAmount > 0) {
      lineDisc = Math.min(raw, roundTo2(item.discountAmount));
    } else if (item.discountPercent && item.discountPercent > 0) {
      lineDisc = roundTo2((raw * Math.min(100, item.discountPercent)) / 100);
    }

    totalRawAmount += raw;
    totalItemDiscounts += lineDisc;

    return {
      item,
      qty,
      unitPrice,
      raw,
      lineDisc,
    };
  });

  const invoiceDiscount = Math.max(0, roundTo2(options.invoiceDiscountAmount || 0));
  const subtotalAfterLineDiscounts = Math.max(0, totalRawAmount - totalItemDiscounts);

  // Allocate global invoice discount proportionally based on item value after line discount
  let remainingInvoiceDiscount = invoiceDiscount;
  let unverifiedRateCount = 0;

  const calculatedItems: CalculatedLineItem[] = preppedItems.map((pi, index) => {
    const isLastItem = index === preppedItems.length - 1;
    const itemPostLineDisc = Math.max(0, pi.raw - pi.lineDisc);

    let allocatedInvDisc = 0;
    if (invoiceDiscount > 0 && subtotalAfterLineDiscounts > 0) {
      if (isLastItem) {
        allocatedInvDisc = remainingInvoiceDiscount;
      } else {
        const prop = itemPostLineDisc / subtotalAfterLineDiscounts;
        allocatedInvDisc = roundTo2(invoiceDiscount * prop);
        remainingInvoiceDiscount = roundTo2(remainingInvoiceDiscount - allocatedInvDisc);
      }
    }

    const totalDisc = roundTo2(pi.lineDisc + allocatedInvDisc);
    const effectivePrice = Math.max(0, roundTo2(pi.raw - totalDisc));

    // Handle Tax Rates
    const gstRate = options.isSupplierGstRegistered ? Math.max(0, pi.item.gstRate) : 0;
    const isVerified = pi.item.isVerifiedRate ?? false;
    if (options.isSupplierGstRegistered && !isVerified && gstRate > 0) {
      unverifiedRateCount++;
    }

    let taxableValue = 0;
    let totalTax = 0;

    if (options.isSupplierGstRegistered && gstRate > 0) {
      if (options.isTaxInclusive) {
        // Effective price already includes GST: Taxable = Price / (1 + Rate / 100)
        taxableValue = roundTo2((effectivePrice * 100) / (100 + gstRate));
        totalTax = roundTo2(effectivePrice - taxableValue);
      } else {
        // Exclusive: Effective price is taxable base
        taxableValue = effectivePrice;
        totalTax = roundTo2((taxableValue * gstRate) / 100);
      }
    } else {
      taxableValue = effectivePrice;
      totalTax = 0;
    }

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (options.isSupplierGstRegistered && gstRate > 0) {
      if (isInterState) {
        igstRate = gstRate;
        igstAmount = totalTax;
      } else {
        cgstRate = roundTo2(gstRate / 2);
        sgstRate = roundTo2(gstRate / 2);
        cgstAmount = roundTo2(totalTax / 2);
        // Ensure SGST matches remainder to prevent 1-paise split rounding errors
        sgstAmount = roundTo2(totalTax - cgstAmount);
      }
    }

    const totalItemAmount = roundTo2(taxableValue + totalTax);

    return {
      id: pi.item.id,
      description: pi.item.description,
      hsnCode: pi.item.hsnCode,
      quantity: pi.qty,
      unitPrice: pi.unitPrice,
      rawAmount: pi.raw,
      lineDiscount: pi.lineDisc,
      allocatedInvoiceDiscount: allocatedInvDisc,
      totalDiscount: totalDisc,
      taxableValue,
      gstRate,
      isVerifiedRate: isVerified,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTax,
      totalAmount: totalItemAmount,
    };
  });

  if (unverifiedRateCount > 0) {
    warnings.push(
      `${unverifiedRateCount} item(s) use unverified GST rates. Rate review by a qualified GST professional is required.`
    );
  }

  // Aggregate invoice totals
  const subtotal = roundTo2(totalRawAmount);
  const totalLineDiscounts = roundTo2(totalItemDiscounts);
  const totalDiscount = roundTo2(totalLineDiscounts + invoiceDiscount);
  const taxableAmount = roundTo2(calculatedItems.reduce((acc, it) => acc + it.taxableValue, 0));
  const cgstTotal = roundTo2(calculatedItems.reduce((acc, it) => acc + it.cgstAmount, 0));
  const sgstTotal = roundTo2(calculatedItems.reduce((acc, it) => acc + it.sgstAmount, 0));
  const igstTotal = roundTo2(calculatedItems.reduce((acc, it) => acc + it.igstAmount, 0));
  const totalTax = roundTo2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = roundTo2(taxableAmount + totalTax);

  // Round off to nearest whole rupee per standard Indian billing convention
  const finalPayable = Math.round(grandTotal);
  const roundOff = roundTo2(finalPayable - grandTotal);

  // Group into Tax Summary by (hsnCode, gstRate)
  const summaryMap = new Map<string, GSTSummaryComponent>();
  for (const item of calculatedItems) {
    const key = `${item.hsnCode || "UNKNOWN"}_${item.gstRate}`;
    const existing = summaryMap.get(key);
    if (!existing) {
      summaryMap.set(key, {
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
        taxableAmount: item.taxableValue,
        cgstRate: item.cgstRate,
        cgstAmount: item.cgstAmount,
        sgstRate: item.sgstRate,
        sgstAmount: item.sgstAmount,
        igstRate: item.igstRate,
        igstAmount: item.igstAmount,
        totalTax: item.totalTax,
        hasUnverifiedRate: !item.isVerifiedRate && item.gstRate > 0,
      });
    } else {
      existing.taxableAmount = roundTo2(existing.taxableAmount + item.taxableValue);
      existing.cgstAmount = roundTo2(existing.cgstAmount + item.cgstAmount);
      existing.sgstAmount = roundTo2(existing.sgstAmount + item.sgstAmount);
      existing.igstAmount = roundTo2(existing.igstAmount + item.igstAmount);
      existing.totalTax = roundTo2(existing.totalTax + item.totalTax);
      if (!item.isVerifiedRate && item.gstRate > 0) {
        existing.hasUnverifiedRate = true;
      }
    }
  }

  const taxSummary = Array.from(summaryMap.values());

  return {
    isInterState,
    isSupplierGstRegistered: options.isSupplierGstRegistered,
    isTaxInclusive: options.isTaxInclusive,
    subtotal,
    totalLineDiscounts,
    invoiceDiscount,
    totalDiscount,
    taxableAmount,
    cgstTotal,
    sgstTotal,
    igstTotal,
    totalTax,
    grandTotal,
    roundOff,
    finalPayable,
    items: calculatedItems,
    taxSummary,
    unverifiedRateCount,
    warnings,
  };
}

/**
 * Validates Indian GSTIN format (15 characters: 2 state digits + 10 PAN chars + 1 entity num + 1 'Z' + 1 checksum)
 */
export function validateGSTINFormat(gstin: string): { isValid: boolean; message: string } {
  if (!gstin || gstin.trim() === "") {
    return { isValid: false, message: "GSTIN cannot be empty" };
  }
  const clean = gstin.trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    return {
      isValid: false,
      message:
        "Invalid GSTIN format. Must be 15 alphanumeric characters (e.g., 27ABCDE1234F1Z5). Note: Format validation does not guarantee registration with GST portal.",
    };
  }
  return { isValid: true, message: "Valid GSTIN format." };
}

/**
 * Common Optical Goods HSN Reference List (for guidance; requires professional verification)
 */
export const OPTICAL_HSN_REFERENCE = [
  {
    hsnCode: "9003",
    description: "Frames and mountings for spectacles, goggles or the like, and parts thereof",
    indicativeRate: 12,
    isVerified: false,
    note: "Consult GST practitioner for latest schedule & notification amendments",
  },
  {
    hsnCode: "9004",
    description: "Spectacles, goggles and the like, corrective, protective or other",
    indicativeRate: 12,
    isVerified: false,
    note: "Subject to lens & frame combination rulings",
  },
  {
    hsnCode: "9001",
    description: "Optical fibres and optical fibre bundles; spectacle lenses of glass/other materials; contact lenses",
    indicativeRate: 12,
    isVerified: false,
    note: "Contact lenses and ophthalmic lenses generally classified under 9001",
  },
  {
    hsnCode: "90041000",
    description: "Sunglasses",
    indicativeRate: 28,
    isVerified: false,
    note: "High tax slab applies to non-corrective sunglasses; verify applicable rate",
  },
  {
    hsnCode: "3307",
    description: "Contact lens solutions and lens cleaning preparations",
    indicativeRate: 18,
    isVerified: false,
    note: "Cleaning accessories and solutions",
  },
];

/**
 * Standard Indian GST State & Union Territory Codes (2-digit)
 */
export const GST_STATE_LIST = [
  { code: "20", name: "Jharkhand (Ranchi)" },
  { code: "10", name: "Bihar" },
  { code: "19", name: "West Bengal" },
  { code: "21", name: "Odisha" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "27", name: "Maharashtra" },
  { code: "07", name: "Delhi" },
  { code: "29", name: "Karnataka" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "08", name: "Rajasthan" },
  { code: "03", name: "Punjab" },
  { code: "06", name: "Haryana" },
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "05", name: "Uttarakhand" },
  { code: "04", name: "Chandigarh" },
  { code: "18", name: "Assam" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "34", name: "Puducherry" },
  { code: "38", name: "Ladakh" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "31", name: "Lakshadweep" },
  { code: "97", name: "Other Territory" },
];

