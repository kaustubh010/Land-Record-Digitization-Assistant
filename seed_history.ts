import { prisma } from "./lib/prisma";

async function seedHistory() {
  console.log("Starting seeding process...");
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("No user found in database. Please sign up first.");
      return;
    }

    console.log(`Found user: ${user.email} (${user.id})`);

    // Ensure Parcel for Plot 2 exists
    const parcel = await prisma.parcel.upsert({
      where: {
        userId_plotId: {
          userId: user.id,
          plotId: "2",
        },
      },
      update: {
        ownerName: "Suresh Kumar Sharma",
        areaRecord: 2.50,
        aadhaarNumber: "222233334444",
      },
      create: {
        plotId: "2",
        ownerName: "Suresh Kumar Sharma",
        areaRecord: 2.50,
        userId: user.id,
        aadhaarNumber: "222233334444",
      },
    });

    console.log(`Ensured parcel exists: ${parcel.id}`);

    // Delete existing history for this parcel to avoid duplicates
    await prisma.plotHistory.deleteMany({
      where: { parcelId: parcel.id },
    });

    const historyEntries = [
      {
        ownerName: "Suresh Kumar Sharma",
        transactionType: "Khatedar Owner",
        ownershipStartDate: null,
        ownershipEndDate: null,
        documentNo: "Sale Deed 123/2024",
        remarks: "(Transition to current ROR)",
        area: 2.50,
      },
      {
        ownerName: "Geeta Devi W/o Dinesh Kumar",
        transactionType: "Khatedar Owner",
        ownershipStartDate: new Date("2019-01-01"),
        ownershipEndDate: new Date("2023-12-31"),
        documentNo: "Sale Deed 202/2019",
        remarks: "(Sold to Entry 1)",
        area: 2.50,
      },
      {
        ownerName: "Rampura Village Cooperative Society Ltd.",
        transactionType: "Village Leaseholder",
        ownershipStartDate: new Date("2010-01-01"),
        ownershipEndDate: new Date("2018-12-31"),
        documentNo: "Lease Agreement 50/2010",
        remarks: "(Lease for community farming)",
        area: 2.50,
      },
      {
        ownerName: "Mahendra Singh S/o Late Partap Singh",
        transactionType: "Khatedar Owner",
        ownershipStartDate: new Date("2000-01-01"),
        ownershipEndDate: new Date("2009-12-31"),
        documentNo: "Succession Certificate 10/2000",
        remarks: "(Inherited from father)",
        area: 2.50,
      },
      {
        ownerName: "Partap Singh S/o Late Kanhaiya Lal",
        transactionType: "Allotted Khatedar Owner",
        ownershipStartDate: new Date("1975-08-15"),
        ownershipEndDate: new Date("1999-12-31"),
        documentNo: "Revenue Allotment Order 300/1975",
        remarks: "(Government Land Allotment)",
        area: 2.50,
      },
    ];

    for (const entry of historyEntries) {
      await prisma.plotHistory.create({
        data: {
          parcelId: parcel.id,
          ...entry,
        },
      });
    }

    console.log("Successfully seeded history for Plot 2.");
  } catch (error: any) {
    console.error("Error seeding history:");
    console.error(error.message);
    if (error.code) console.error("Error Code:", error.code);
    if (error.meta) console.error("Error Meta:", JSON.stringify(error.meta));
  } finally {
    await prisma.$disconnect();
  }
}

seedHistory();
