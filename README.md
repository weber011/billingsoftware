# LensArt — Optical Retail Management & GST Billing System

**LensArt** is an enterprise-grade optical retail management, Indian GST billing, clinical prescription management, and optical inventory platform designed specifically for spectacles and eyewear retail startups and optometry clinics in India.

---

## 👓 Optical Domain Features

- **Clinical Prescription Management**:
  - Bilateral refraction records (OD - Right Eye, OS - Left Eye): Spherical (SPH), Cylinder (CYL), Axis (°), Near Addition (ADD), Visual Acuity (VA, e.g. 6/6), Prism (Δ), and Base (UP/DOWN/IN/OUT).
  - Pupillary Distance (PD mm) monocular and binocular measurement.
  - Lens recommendations: Anti-Reflective (ARC), Blue Filter, Photochromic, Progressive, Bifocal, High-Index (1.67, 1.74).
  - Contact lens parameters: Base Curve (BC) and Diameter (DIA).
  - Immutable prescription history snapshot preserved on spectacle orders.

- **Spectacle Order Lifecycle & Optical Lab Tracking**:
  - Multi-item jobs (Frame + Lenses + Edging/Glazing services + Accessories).
  - Custom fitting parameters: segment height, pantoscopic tilt, bevel placement, frame A/B/ED/DBL dimensions.
  - Optical lab workflow stages: `PLACED` ➔ `SENT_TO_LAB` ➔ `LAB_IN_PROGRESS` ➔ `RECEIVED_FROM_LAB` ➔ `QUALITY_CHECKED` ➔ `READY_FOR_COLLECTION` ➔ `DELIVERED` / `CANCELLED`.
  - Advance payment recording and balance settlement.

- **Inventory Movements & Negative Stock Prevention**:
  - Optical taxonomy: Frames, Lenses, Contact Lenses, Sunglasses, Solutions, Cases, Accessories.
  - Frame attributes: Brand, Model, Color, Eye Size, Bridge Width, Temple Length, Frame Type (Full Rim, Semi-Rimless, Rimless), Material (Titanium, Acetate, Metal, TR90).
  - Lens attributes: Index, Coating, Design (Single Vision, Progressive, Bifocal).
  - Transactional stock ledger with movement types: `PURCHASE_RECEIPT`, `SALE_DEDUCTION`, `RETURN_RESTOCK`, `DAMAGE_WRITEOFF`, `AUDIT_CORRECTION`.
  - Damaged customer returns are segregated into damaged quarantine ledger and never returned to sellable stock.

---

## 🇮🇳 Indian GST & Invoicing Engine

- **Place of Supply Tax Rules**:
  - **Intra-State**: Supplier State Code == Customer POS ➔ **CGST (50%) + SGST (50%)**.
  - **Inter-State**: Supplier State Code ≠ Customer POS ➔ **IGST (100%)**.
- **Tax-Exclusive vs Tax-Inclusive Pricing**:
  - Decimal precision calculation with proper backward derivation of base value from inclusive amounts.
- **Proportional Invoice-Level Discount Allocation**:
  - Discounts are distributed proportionally across taxable line items so tax is charged only on net value.
- **Round-Off Standard**:
  - Standard mathematical round-off with explicit round-off adjustment line item in compliance with Indian accounting standards.
- **HSN Optical Codes**:
  - Frames & Mountings: `9003` (12%)
  - Corrective Lenses: `9001` (12%)
  - Sunglasses: `90041000` (18% / 28%)
  - Contact Lens Solutions: `3307` (18%)
  - *Disclaimer: All tax rates and HSN codes are configured with audit flags for Chartered Accountant (CA) legal verification.*
- **Printable Invoices**:
  - Full GST Tax Invoice layout (A4 format with HSN summary table, bank details, authorized signatory).
  - Compact POS thermal receipt (80mm format for rapid thermal printing).
- **Credit Notes**:
  - Full or partial credit notes referencing original invoice with reason tracking and conditional inventory restocking.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14.2 (App Router) with React 18
- **Styling**: Tailwind CSS & Lucide Icons
- **Database Schema**: Prisma ORM schema (`prisma/schema.prisma`) for PostgreSQL production deployments.
- **Local Persistence Store**: High-reliability resilient JSON data store (`src/lib/store.ts`) operating out of `.lensart_data/` with auto-seeding for instant out-of-the-box local operation without external infrastructure dependencies.
- **Testing**: Dedicated TypeScript automated integration test suite (`tests/run-all-tests.ts`).

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install --legacy-peer-deps
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Verification Tests
LensArt includes a comprehensive 15-test automated verification suite covering GST rules, prescription immutability, inventory deductions, credit notes, and balance settlement:
```bash
npm test
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🧪 Test Suite Coverage

- `GST Intra-State calculation (CGST 6% + SGST 6%)`
- `GST Inter-State calculation (IGST 12%)`
- `GST Tax-Inclusive price back-calculation`
- `Proportional invoice discount distribution`
- `Zero-tax line items and mathematical round-off`
- `GSTIN syntax verification algorithm`
- `Patient registration and code generation`
- `Immutable clinical prescription storage`
- `Product stock addition and ledger tracking`
- `Negative stock order rejection`
- `Spectacle order placement with prescription snapshot`
- `Invoice finalization with stock deduction & initial payment`
- `Balance settlement payment updates`
- `Credit note creation with conditional restock inspection`
- `Dashboard financial metrics computation`

---

## ⚖️ Chartered Accountant (CA) Verification Notice
Tax rates and HSN classifications (`9003`, `9001`, `90041000`, `3307`) are configured based on standard CBIC optical retail schedules. Consult your practicing Indian Chartered Accountant or tax advisor to verify applicable GST rates for your optical store's turnover and state jurisdiction before filing official GSTR-1 and GSTR-3B returns.

---

## 📄 License
Proprietary — LensArt Optical Retail Solutions.
