import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding LensArt database for Ranchi, Jharkhand...\n");

  // 1. Business
  let business = await prisma.business.findFirst();
  if (!business) {
    business = await prisma.business.create({
      data: {
        name: "LensArt Optical Store",
        legalName: "LensArt Vision Care",
        address: "Shop No. 12, Upper Bazar, Main Road",
        city: "Ranchi",
        state: "Jharkhand",
        stateCode: "20",
        pinCode: "834001",
        phone: "+91 98350 12345",
        email: "contact@lensart.in",
        gstin: "20AABCL1234F1Z8",
        isGstRegistered: true,
        invoicePrefix: "LA/2026-27/",
        invoiceNextNumber: 1,
        financialYearStart: 4,
        invoiceFooter: "Thank you for choosing LensArt! Clear vision, clear life.",
        returnPolicy: "Frames may be exchanged within 7 days. Prescription lenses are custom made and non-returnable unless defective.",
        warrantyPolicy: "1 Year manufacturing warranty against frame breakage and lens coating peel-off.",
        termsAndConditions: "Subject to Ranchi jurisdiction.",
        signatory: "Authorized Signatory for LensArt Vision Care",
      },
    });
    console.log(`✅ Business: ${business.name} (${business.city}, ${business.state})`);
  } else {
    // Update to Ranchi, Jharkhand with State Code 20 GSTIN
    business = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: "LensArt Optical Retail & Optometry",
        legalName: "LensArt Vision Care",
        address: "Shop No. 12, Upper Bazar, Main Road",
        city: "Ranchi",
        state: "Jharkhand",
        stateCode: "20",
        pinCode: "834001",
        gstin: "20AABCL1234F1Z8",
        termsAndConditions: "Subject to Ranchi jurisdiction.",
      },
    });
    console.log(`✅ Business updated: ${business.name} (${business.city}, ${business.state}) [GSTIN: ${business.gstin}]`);
  }

  // 2. Branch (required for invoices & orders)
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        businessId: business.id,
        name: "LensArt Main Store - Ranchi",
        address: "Shop No. 12, Upper Bazar, Main Road",
        city: "Ranchi",
        state: "Jharkhand",
        stateCode: "20",
        pinCode: "834001",
        phone: "+91 98350 12345",
        email: "ranchi@lensart.in",
      },
    });
    console.log(`✅ Branch: ${branch.name}`);
  }

  // 3. System User (required for relations)
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "admin@lensart.in",
        name: "LensArt Admin",
        phone: "+91 98350 12345",
        passwordHash: "$2a$12$placeholder",
        branchId: branch.id,
      },
    });
    console.log(`✅ User: ${user.name}`);
  }

  // 4. Product Categories
  const categories = [
    { name: "Frames", slug: "frames" },
    { name: "Lenses", slug: "lenses" },
    { name: "Sunglasses", slug: "sunglasses" },
    { name: "Contact Lenses", slug: "contact-lenses" },
    { name: "Accessories", slug: "accessories" },
    { name: "Solutions", slug: "solutions" },
  ];

  for (const cat of categories) {
    await prisma.productCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ Product Categories: ${categories.length} categories`);

  // 5. Products
  const framesCat = await prisma.productCategory.findUnique({ where: { slug: "frames" } });
  const lensesCat = await prisma.productCategory.findUnique({ where: { slug: "lenses" } });
  const accCat = await prisma.productCategory.findUnique({ where: { slug: "accessories" } });

  const existingProducts = await prisma.product.count();
  if (existingProducts === 0) {
    const products = [
      {
        sku: "FRM-TIT-01",
        name: "LensArt AirTitanium Minimalist",
        categoryId: framesCat!.id,
        brand: "LensArt Signature",
        model: "AT-801",
        purchaseCost: 1200,
        sellingPrice: 3499,
        hsnCode: "9003",
        currentStock: 18,
        reorderThreshold: 5,
        frameShape: "Rectangle",
        frameMaterial: "Pure Titanium",
        frameColor: "Matte Black",
        eyeSize: "52",
        bridgeSize: "18",
        templeLength: "140",
      },
      {
        sku: "FRM-ACE-02",
        name: "Classic Italian Acetate Wayfarer",
        categoryId: framesCat!.id,
        brand: "Venezia",
        model: "VZ-402",
        purchaseCost: 850,
        sellingPrice: 2299,
        hsnCode: "9003",
        currentStock: 12,
        reorderThreshold: 4,
        frameShape: "Wayfarer",
        frameMaterial: "Handmade Acetate",
        frameColor: "Tortoise Shell",
        eyeSize: "50",
        bridgeSize: "20",
        templeLength: "145",
      },
      {
        sku: "FRM-ROUND-03",
        name: "RetroFlex Round Metal Frame",
        categoryId: framesCat!.id,
        brand: "RetroFlex",
        model: "RF-100",
        purchaseCost: 600,
        sellingPrice: 1599,
        hsnCode: "9003",
        currentStock: 20,
        reorderThreshold: 5,
        frameShape: "Round",
        frameMaterial: "Metal",
        frameColor: "Gold",
        eyeSize: "48",
        bridgeSize: "21",
        templeLength: "140",
      },
      {
        sku: "LNS-BLU-156",
        name: "ClarityPro 1.56 BlueCut Anti-Glare Lens (Pair)",
        categoryId: lensesCat!.id,
        brand: "ClarityPro",
        model: "BC-156",
        purchaseCost: 600,
        sellingPrice: 1800,
        hsnCode: "9001",
        currentStock: 35,
        reorderThreshold: 10,
        lensType: "Single Vision",
        lensMaterial: "CR-39 Resin",
        refractiveIndex: "1.56",
        isBlueFilter: true,
      },
      {
        sku: "LNS-PROG-167",
        name: "OptiView HD Digital Progressive Lens (Pair)",
        categoryId: lensesCat!.id,
        brand: "OptiView",
        model: "OV-HD-167",
        purchaseCost: 2400,
        sellingPrice: 6500,
        hsnCode: "9001",
        currentStock: 8,
        reorderThreshold: 2,
        lensType: "Progressive",
        lensMaterial: "High Index MR-7",
        refractiveIndex: "1.67",
        isPhotochromic: true,
        isBlueFilter: true,
      },
      {
        sku: "ACC-CLN-KIT",
        name: "LensArt Lens Cleaning Spray & Microfiber Kit",
        categoryId: accCat!.id,
        brand: "LensArt",
        purchaseCost: 45,
        sellingPrice: 150,
        hsnCode: "3307",
        currentStock: 50,
        reorderThreshold: 10,
      },
    ];

    for (const p of products) {
      await prisma.product.create({ data: p });
    }
    console.log(`✅ Products: ${products.length} optical products seeded`);
  }

  // 6. Customers
  const existingCustomers = await prisma.customer.count();
  if (existingCustomers === 0) {
    const customers = [
      {
        customerCode: "PT-501",
        name: "Aarav Mehra",
        phone: "+91 98765 43210",
        email: "aarav.mehra@example.com",
        dateOfBirth: new Date("1992-03-15"),
        address: "B-12, Kanke Road, Near Albert Ekka Chowk",
        city: "Ranchi",
        state: "Jharkhand",
        pinCode: "834008",
        notes: "Prefers lightweight titanium frames. High screen time software engineer.",
      },
      {
        customerCode: "PT-502",
        name: "Sunita Roy",
        phone: "+91 98111 22334",
        email: "sunita.roy@example.com",
        dateOfBirth: new Date("1975-11-20"),
        address: "14/B, Harmu Housing Colony",
        city: "Ranchi",
        state: "Jharkhand",
        pinCode: "834002",
        notes: "Progressive wearer for 5 years. Complained of reading fatigue.",
      },
      {
        customerCode: "PT-503",
        name: "Rajesh Kumar Singh",
        phone: "+91 70918 45623",
        address: "Morabadi, Near Tagore Hill Road",
        city: "Ranchi",
        state: "Jharkhand",
        pinCode: "834008",
        notes: "Government employee. Needs bifocal lenses.",
      },
      {
        customerCode: "PT-504",
        name: "Priya Sharma",
        phone: "+91 63948 27150",
        email: "priya.sharma@example.com",
        address: "Lalpur, Main Road",
        city: "Ranchi",
        state: "Jharkhand",
        pinCode: "834001",
        notes: "First-time spectacle wearer. Student.",
      },
    ];

    for (const c of customers) {
      await prisma.customer.create({ data: c });
    }
    console.log(`✅ Customers: ${customers.length} patients seeded (Ranchi, Jharkhand)`);
  }

  // 7. Update business invoice next number to account for seeded customers
  await prisma.business.update({
    where: { id: business.id },
    data: { invoiceNextNumber: 1 },
  });

  console.log("\n🎉 Database seeding complete for Ranchi, Jharkhand!");
  console.log("   Business State: Jharkhand (Code: 20)");
  console.log("   GSTIN: 20AABCL1234F1Z8");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
