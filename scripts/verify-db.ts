import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Verifying connection to Neon PostgreSQL...");

  // Query PostgreSQL information_schema to list all user tables
  const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;

  console.log(`Successfully connected! Found ${tables.length} tables in public schema:`);
  tables.forEach((t) => console.log(` - ${t.table_name}`));

  // Check if default business exists or seed one
  let business = await prisma.business.findFirst();
  if (!business) {
    console.log("Seeding default LensArt optical business entity...");
    business = await prisma.business.create({
      data: {
        name: "LensArt Optical Retail & Optometry",
        legalName: "LensArt Vision Care Pvt Ltd",
        address: "Shop 12, Crystal Plaza, M.G. Road",
        city: "Mumbai",
        state: "Maharashtra",
        stateCode: "27",
        pinCode: "400001",
        phone: "+91 98200 12345",
        email: "accounts@lensart.in",
        gstin: "27AAACL1234F1Z8",
        isGstRegistered: true,
        invoicePrefix: "LA/2026-27/",
        invoiceNextNumber: 1,
        financialYearStart: 4,
      },
    });
    console.log(`Created default business: ${business.name} (GSTIN: ${business.gstin})`);
  } else {
    console.log(`Default business exists: ${business.name} (GSTIN: ${business.gstin})`);
  }
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
