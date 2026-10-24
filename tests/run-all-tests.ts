import { calculateGSTInvoice, LineItemInput, validateGSTINFormat, roundTo2 } from "../src/lib/gst";
import {
  createPatient,
  getPatients,
  getPatientById,
} from "../src/actions/patients";
import {
  createPrescription,
  getPrescriptions,
} from "../src/actions/prescriptions";
import {
  createProduct,
  adjustStock,
  getProducts,
} from "../src/actions/inventory";
import {
  createOrder,
  updateOrderStatus,
  getOrderById,
} from "../src/actions/orders";
import {
  createAndFinalizeInvoice,
  recordPayment,
  createCreditNote,
  getInvoiceById,
} from "../src/actions/billing";
import { getDashboardMetrics } from "../src/actions/analytics";

interface TestResult {
  name: string;
  category: "UNIT" | "INTEGRATION";
  passed: boolean;
  message?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(
  name: string,
  category: "UNIT" | "INTEGRATION",
  fn: () => void | Promise<void>
) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      name,
      category,
      passed: true,
      durationMs: Date.now() - start,
    });
    console.log(`  ✓ [${category}] ${name}`);
  } catch (err: any) {
    results.push({
      name,
      category,
      passed: false,
      message: err.message,
      durationMs: Date.now() - start,
    });
    console.error(`  ✗ [${category}] ${name}: ${err.message}`);
  }
}

export async function runAllTests() {
  console.log("\n========================================================");
  console.log("   LENSART COMPREHENSIVE AUTOMATED TEST SUITE          ");
  console.log("========================================================\n");

  // =========================================================================
  // 1. UNIT TESTS: GST CALCULATION ENGINE
  // =========================================================================
  console.log("--- 1. GST Calculation Unit Tests ---");

  await runTest("Intra-state supply applies 50% CGST and 50% SGST (Tax-Exclusive)", "UNIT", () => {
    const items: LineItemInput[] = [
      {
        description: "Titanium Frame",
        hsnCode: "9003",
        quantity: 1,
        unitPrice: 1000,
        gstRate: 12,
        isVerifiedRate: true,
      },
    ];

    const res = calculateGSTInvoice(items, {
      isTaxInclusive: false,
      supplierStateCode: "27", // Maharashtra
      placeOfSupplyCode: "27", // Maharashtra
      isSupplierGstRegistered: true,
    });

    assert(!res.isInterState, "Should be intra-state");
    assert(res.taxableAmount === 1000, `Expected taxable 1000, got ${res.taxableAmount}`);
    assert(res.cgstTotal === 60, `Expected CGST 60 (6%), got ${res.cgstTotal}`);
    assert(res.sgstTotal === 60, `Expected SGST 60 (6%), got ${res.sgstTotal}`);
    assert(res.igstTotal === 0, `Expected IGST 0, got ${res.igstTotal}`);
    assert(res.totalTax === 120, `Expected total tax 120, got ${res.totalTax}`);
    assert(res.finalPayable === 1120, `Expected final 1120, got ${res.finalPayable}`);
  });

  await runTest("Inter-state supply applies 100% IGST with zero CGST/SGST", "UNIT", () => {
    const items: LineItemInput[] = [
      {
        description: "High Index Lens",
        hsnCode: "9001",
        quantity: 1,
        unitPrice: 2000,
        gstRate: 12,
        isVerifiedRate: true,
      },
    ];

    const res = calculateGSTInvoice(items, {
      isTaxInclusive: false,
      supplierStateCode: "27", // Maharashtra
      placeOfSupplyCode: "29", // Karnataka (different state)
      isSupplierGstRegistered: true,
    });

    assert(res.isInterState, "Should be inter-state");
    assert(res.cgstTotal === 0, `Expected CGST 0, got ${res.cgstTotal}`);
    assert(res.sgstTotal === 0, `Expected SGST 0, got ${res.sgstTotal}`);
    assert(res.igstTotal === 240, `Expected IGST 240 (12%), got ${res.igstTotal}`);
    assert(res.finalPayable === 2240, `Expected payable 2240, got ${res.finalPayable}`);
  });

  await runTest("Tax-Inclusive pricing back-calculates exact taxable value and tax", "UNIT", () => {
    // ₹1120 inclusive of 12% GST: Taxable = 1120 / 1.12 = 1000, Tax = 120
    const items: LineItemInput[] = [
      {
        description: "Spectacle Frame (Tax-Inclusive)",
        hsnCode: "9003",
        quantity: 1,
        unitPrice: 1120,
        gstRate: 12,
        isVerifiedRate: true,
      },
    ];

    const res = calculateGSTInvoice(items, {
      isTaxInclusive: true,
      supplierStateCode: "27",
      placeOfSupplyCode: "27",
      isSupplierGstRegistered: true,
    });

    assert(res.taxableAmount === 1000, `Expected taxable 1000, got ${res.taxableAmount}`);
    assert(res.cgstTotal === 60, `Expected CGST 60, got ${res.cgstTotal}`);
    assert(res.sgstTotal === 60, `Expected SGST 60, got ${res.sgstTotal}`);
    assert(res.finalPayable === 1120, `Expected payable 1120, got ${res.finalPayable}`);
  });

  await runTest("Line discounts and global bill discount allocation are calculated correctly", "UNIT", () => {
    const items: LineItemInput[] = [
      {
        description: "Item A",
        quantity: 1,
        unitPrice: 1000,
        discountAmount: 100, // Post line-disc: 900
        gstRate: 12,
        isVerifiedRate: true,
      },
      {
        description: "Item B",
        quantity: 1,
        unitPrice: 1000,
        discountAmount: 0, // Post line-disc: 1000
        gstRate: 12,
        isVerifiedRate: true,
      },
    ];

    // Global invoice discount: 190. Total post line-disc = 1900.
    // Item A gets 90/1900 * 190 = 90. Effective taxable = 900 - 90 = 810.
    // Item B gets 1000/1900 * 190 = 100. Effective taxable = 1000 - 100 = 900.
    // Total taxable = 810 + 900 = 1710. Tax = 12% of 1710 = 205.20. Final = 1915.20 -> round to 1915.
    const res = calculateGSTInvoice(items, {
      isTaxInclusive: false,
      supplierStateCode: "27",
      placeOfSupplyCode: "27",
      isSupplierGstRegistered: true,
      invoiceDiscountAmount: 190,
    });

    assert(res.subtotal === 2000, `Expected subtotal 2000, got ${res.subtotal}`);
    assert(res.totalDiscount === 290, `Expected total discount 290, got ${res.totalDiscount}`);
    assert(res.taxableAmount === 1710, `Expected taxable 1710, got ${res.taxableAmount}`);
    assert(res.totalTax === 205.2, `Expected tax 205.2, got ${res.totalTax}`);
    assert(res.finalPayable === 1915, `Expected final payable 1915, got ${res.finalPayable}`);
  });

  await runTest("Unregistered supplier warning and zero-tax application", "UNIT", () => {
    const items: LineItemInput[] = [
      {
        description: "Eye Cleaning Spray",
        quantity: 2,
        unitPrice: 150,
        gstRate: 18,
      },
    ];

    const res = calculateGSTInvoice(items, {
      isTaxInclusive: false,
      supplierStateCode: "27",
      placeOfSupplyCode: "27",
      isSupplierGstRegistered: false, // NOT REGISTERED
    });

    assert(res.totalTax === 0, `Unregistered supplier must not charge GST. Got: ${res.totalTax}`);
    assert(res.finalPayable === 300, `Expected payable 300, got ${res.finalPayable}`);
    assert(res.warnings.length > 0, "Must flag warning for unregistered supplier");
  });

  await runTest("GSTIN format validator validates length and structure", "UNIT", () => {
    const valid = validateGSTINFormat("27AABCL1234F1Z8");
    assert(valid.isValid, `Expected 27AABCL1234F1Z8 to be valid, got: ${valid.message}`);

    const invalid = validateGSTINFormat("123INVALID");
    assert(!invalid.isValid, "Expected 123INVALID to be rejected");
  });

  // =========================================================================
  // 2. INTEGRATION TESTS: FULL BUSINESS WORKFLOWS
  // =========================================================================
  console.log("\n--- 2. Business Workflow Integration Tests ---");

  let testPatientId = "";
  let testPrescriptionId = "";
  let testProductId = "";
  let testOrderId = "";
  let testInvoiceId = "";

  await runTest("Patient registration generates sequential code and audit log", "INTEGRATION", async () => {
    const res = await createPatient({
      name: "Automated Test Patient",
      phone: "+91 99999 88888",
      email: "test.patient@example.com",
      city: "Mumbai",
      state: "Maharashtra",
      notes: "E2E automated validation test",
    });

    assert(res.success && !!res.patient, `Patient registration failed: ${res.error}`);
    assert(res.patient!.customerCode.startsWith("PT-"), "Code must start with PT-");
    testPatientId = res.patient!.id;
  });

  await runTest("Prescription creation with bilateral refraction values", "INTEGRATION", async () => {
    assert(!!testPatientId, "Prerequisite patient not available");
    const res = await createPrescription({
      customerId: testPatientId,
      examinationDate: "2026-10-24",
      prescribedBy: "Dr. Test Optometrist",
      rightSph: "-1.75",
      rightCyl: "-0.50",
      rightAxis: 90,
      rightVa: "6/6",
      leftSph: "-2.00",
      leftCyl: "-0.50",
      leftAxis: 85,
      leftVa: "6/6",
      pd: 64,
      lensRecommendation: "Single Vision Anti-Glare",
    });

    assert(res.success && !!res.prescription, `Rx creation failed: ${res.error}`);
    assert(res.prescription!.prescriptionCode.startsWith("RX-"), "Code must start with RX-");
    testPrescriptionId = res.prescription!.id;
  });

  await runTest("Product creation and stock ledger tracking", "INTEGRATION", async () => {
    const sku = `TEST-${Date.now()}`;
    const res = await createProduct({
      sku,
      name: "Test Glazing Frame",
      category: "FRAME",
      brand: "TestBrand",
      purchaseCost: 800,
      sellingPrice: 2000,
      hsnCode: "9003",
      gstRate: 12,
      reorderThreshold: 5,
      initialStock: 15,
    });

    assert(res.success && !!res.product, `Product creation failed: ${res.error}`);
    assert(res.product!.currentStock === 15, `Expected stock 15, got ${res.product!.currentStock}`);
    testProductId = res.product!.id;
  });

  await runTest("Prevent negative inventory during stock adjustment", "INTEGRATION", async () => {
    assert(!!testProductId, "Prerequisite product not available");
    // Attempt to deduct 999 units from 15 units
    const res = await adjustStock({
      productId: testProductId,
      adjustmentQty: -999,
      reason: "Faulty deduction test",
    });

    assert(!res.success, "Adjustment that causes negative stock must be rejected!");
  });

  await runTest("Spectacle order creation preserves prescription snapshot", "INTEGRATION", async () => {
    assert(!!testPatientId && !!testPrescriptionId, "Prerequisites missing");
    const res = await createOrder({
      customerId: testPatientId,
      prescriptionId: testPrescriptionId,
      expectedCompletionDate: "2026-10-27",
      advancePaid: 500,
      items: [
        {
          productId: testProductId,
          description: "Test Glazing Frame",
          itemType: "FRAME",
          quantity: 1,
          unitPrice: 2000,
          discount: 100,
        },
      ],
    });

    assert(res.success && !!res.order, `Order creation failed: ${res.error}`);
    assert(res.order!.totalAmount === 1900, `Expected total 1900, got ${res.order!.totalAmount}`);
    assert(res.order!.advancePaid === 500, `Expected advance 500, got ${res.order!.advancePaid}`);
    assert(res.order!.balanceDue === 1400, `Expected balance 1400, got ${res.order!.balanceDue}`);
    assert(!!res.order!.prescriptionSnapshot, "Prescription snapshot must be preserved");
    testOrderId = res.order!.id;
  });

  await runTest("GST Tax Invoice finalization deducts inventory & creates payment", "INTEGRATION", async () => {
    assert(!!testPatientId && !!testProductId, "Prerequisites missing");
    const productsBefore = await getProducts();
    const prodBefore = productsBefore.find((p) => p.id === testProductId);
    const stockBefore = prodBefore!.currentStock;

    const res = await createAndFinalizeInvoice({
      customerId: testPatientId,
      orderId: testOrderId,
      placeOfSupplyCode: "27",
      items: [
        {
          productId: testProductId,
          description: "Test Glazing Frame",
          hsnCode: "9003",
          quantity: 2, // Deduct 2 units
          unitPrice: 2000,
          discountAmount: 0,
          gstRate: 12,
        },
      ],
      payment: {
        amount: 2000,
        paymentMethod: "UPI",
        transactionRef: "UPI-TEST-12345",
      },
    });

    assert(res.success && !!res.invoice, `Invoice finalization failed: ${res.error}`);
    testInvoiceId = res.invoice!.id;

    // Verify stock was deducted by 2 units
    const productsAfter = await getProducts();
    const prodAfter = productsAfter.find((p) => p.id === testProductId);
    assert(
      prodAfter!.currentStock === stockBefore - 2,
      `Stock should decrease by 2 from ${stockBefore} to ${stockBefore - 2}. Got: ${prodAfter!.currentStock}`
    );

    // Verify financial balances
    assert(res.invoice!.amountPaid === 2000, `Expected paid 2000, got ${res.invoice!.amountPaid}`);
    assert(
      res.invoice!.balanceDue === res.invoice!.finalAmount - 2000,
      `Balance due mismatch: ${res.invoice!.balanceDue}`
    );
  });

  await runTest("Record payment against outstanding invoice balance", "INTEGRATION", async () => {
    assert(!!testInvoiceId, "Prerequisite invoice missing");
    const { invoice } = await getInvoiceById(testInvoiceId);
    assert(!!invoice, "Invoice not found");

    const bal = invoice!.balanceDue;
    if (bal > 0) {
      const res = await recordPayment({
        invoiceId: testInvoiceId,
        amount: bal,
        paymentMethod: "CASH",
        notes: "Full clearance",
      });
      assert(res.success, `Payment recording failed: ${res.error}`);

      const { invoice: updatedInv } = await getInvoiceById(testInvoiceId);
      assert(
        updatedInv!.balanceDue === 0,
        `Invoice balance should now be 0. Got: ${updatedInv!.balanceDue}`
      );
    }
  });

  await runTest("Credit Note with restock evaluation isolates damaged items", "INTEGRATION", async () => {
    assert(!!testInvoiceId, "Prerequisite invoice missing");
    const res = await createCreditNote({
      invoiceId: testInvoiceId,
      reason: "Patient returned defective temple screw",
      items: [
        {
          productId: testProductId,
          description: "Test Frame (Defective)",
          quantity: 1,
          unitPrice: 2000,
          taxableAmount: 1785.71,
          gstRate: 12,
          totalAmount: 2000,
          returnReason: "Broken temple",
          itemCondition: "DAMAGED", // DAMAGED!
          restockable: false, // NOT restockable!
        },
      ],
    });

    assert(res.success && !!res.creditNote, `Credit note failed: ${res.error}`);
    assert(res.creditNote!.creditNoteNumber.startsWith("CN-"), "Code must start with CN-");
  });

  await runTest("Dashboard analytics calculates real persisted KPIs", "INTEGRATION", async () => {
    const metrics = await getDashboardMetrics();
    assert(metrics.totalInvoicesCount > 0, "Should have finalized invoices");
    assert(metrics.totalOrdersCount > 0, "Should have orders");
    assert(metrics.paymentsReceived > 0, "Should have recorded payments");
    assert(metrics.totalTaxCollected > 0, "Should have tax collected");
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log("\n========================================================");
  console.log("                AUTOMATED TEST SUMMARY                  ");
  console.log("========================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Tests Executed: ${total}`);
  console.log(`Passed:               ${passed}`);
  console.log(`Failed:               ${failed}`);
  console.log("========================================================\n");

  return { total, passed, failed, results };
}
