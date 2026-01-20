import { prisma } from "./client";

async function main() {
  await prisma.suite.upsert({
    where: { id: "S-101" },
    update: {},
    create: {
      id: "S-101",
      floor: 1,
      type: "Standard",
      size: 300,
      view: "Sea",
      totalPrice: 120000,
      currency: "BDT",
    },
  });
  await prisma.suite.upsert({
    where: { id: "S-202" },
    update: {},
    create: {
      id: "S-202",
      floor: 2,
      type: "Delux",
      size: 345,
      view: "Sea",
      totalPrice: 160000,
      currency: "BDT",
    },
  });
  await prisma.sharePlan.upsert({
    where: { id: "P-3D" },
    update: {},
    create: {
      id: "P-3D",
      name: "3 days/month",
      daysPerMonth: 3,
      lockIn: 36,
      price: 30000,
      currency: "BDT",
      suiteId: "S-101",
      planType: "DPM",
      planStatus: "Unsold",
      timeFraction: 0.1,
    },
  });
  await prisma.sharePlan.upsert({
    where: { id: "P-5D" },
    update: {},
    create: {
      id: "P-5D",
      name: "5 days/month",
      daysPerMonth: 5,
      lockIn: 48,
      price: 48000,
      currency: "BDT",
      suiteId: "S-202",
      planType: "DPM",
      planStatus: "Unsold",
      timeFraction: 0.167,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
