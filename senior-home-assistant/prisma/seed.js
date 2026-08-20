// Seeds the local SQLite database with mock data: pricing config, an admin
// account, and 4 sample clients (one with a linked family member) with
// tasks at every urgency level and a mix of visit statuses.
//
// Run with: npm run db:seed

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

async function main() {
  console.log("Seeding database...");

  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.familyInvite.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.urgencyPricing.deleteMany();
  await prisma.subscriptionTier.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const soloTier = await prisma.subscriptionTier.create({
    data: {
      name: "Solo crew, weekly",
      monthlyPrice: 500,
      crewSize: 1,
      visitFrequency: "Weekly",
      flexVisitsPerMonth: 2,
    },
  });

  const duoTier = await prisma.subscriptionTier.create({
    data: {
      name: "2-person crew, weekly",
      monthlyPrice: 800,
      crewSize: 2,
      visitFrequency: "Weekly",
      flexVisitsPerMonth: 2,
    },
  });

  await prisma.urgencyPricing.createMany({
    data: [
      {
        urgency: "WHENEVER",
        label: "Whenever (fits next scheduled route)",
        flatFee: 0,
        freeForSubscribers: true,
        nonSubscriberFee: 25,
      },
      {
        urgency: "THIS_WEEK",
        label: "This week",
        flatFee: 70,
        freeForSubscribers: false,
        nonSubscriberFee: 70,
      },
      {
        urgency: "URGENT",
        label: "Urgent (same/next-day)",
        flatFee: 100,
        freeForSubscribers: false,
        nonSubscriberFee: 100,
      },
    ],
  });

  await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@helpinghands.example",
      passwordHash,
      role: "ADMIN",
    },
  });

  // --- Client 1: Eleanor Whitfield - has a linked family member, a mix of
  // requested/scheduled/completed tasks, and both a past and future visit.
  const eleanor = await prisma.user.create({
    data: {
      name: "Eleanor Whitfield",
      email: "eleanor@example.com",
      passwordHash,
      role: "CLIENT",
      client: {
        create: {
          address: "12 Maple Street, Springfield",
          subscriptionTierId: soloTier.id,
          flexVisitsRemaining: 1,
        },
      },
    },
    include: { client: true },
  });

  await prisma.user.create({
    data: {
      name: "Mark Whitfield",
      email: "mark@example.com",
      passwordHash,
      role: "FAMILY",
      clientId: eleanor.client.id,
    },
  });

  const pastVisit = await prisma.visit.create({
    data: {
      clientId: eleanor.client.id,
      scheduledDate: daysFromNow(-6),
      crewAssigned: "Crew A",
      status: "COMPLETED",
      notes: "Mowed the lawn and trimmed the walkway edges. Everything looked great.",
      photos: JSON.stringify([]),
    },
  });

  await prisma.task.create({
    data: {
      clientId: eleanor.client.id,
      title: "Mow the lawn",
      description: "Front and back yard.",
      urgency: "WHENEVER",
      status: "COMPLETED",
      priceQuote: 0,
      billable: false,
      createdById: eleanor.id,
      visitId: pastVisit.id,
    },
  });

  await prisma.visit.create({
    data: {
      clientId: eleanor.client.id,
      scheduledDate: daysFromNow(5),
      crewAssigned: "Crew A",
      status: "SCHEDULED",
    },
  });

  await prisma.task.create({
    data: {
      clientId: eleanor.client.id,
      title: "Trim the front hedges",
      description: "They're blocking the front window.",
      urgency: "THIS_WEEK",
      status: "REQUESTED",
      priceQuote: 0,
      billable: false,
      createdById: eleanor.id,
    },
  });

  await prisma.task.create({
    data: {
      clientId: eleanor.client.id,
      title: "Fix loose porch step",
      description: "The second step wobbles - worried it's a fall risk.",
      urgency: "URGENT",
      status: "REQUESTED",
      priceQuote: 0,
      billable: false,
      createdById: eleanor.id,
    },
  });

  // --- Client 2: Walter Higgins - 2-person crew plan, one scheduled visit
  // tied to a task request.
  const walter = await prisma.user.create({
    data: {
      name: "Walter Higgins",
      email: "walter@example.com",
      passwordHash,
      role: "CLIENT",
      client: {
        create: {
          address: "88 Oak Avenue, Springfield",
          subscriptionTierId: duoTier.id,
          flexVisitsRemaining: 2,
        },
      },
    },
    include: { client: true },
  });

  const walterVisit = await prisma.visit.create({
    data: {
      clientId: walter.client.id,
      scheduledDate: daysFromNow(3),
      crewAssigned: "Crew B",
      status: "SCHEDULED",
    },
  });

  await prisma.task.create({
    data: {
      clientId: walter.client.id,
      title: "Rake up fallen leaves",
      description: "Backyard is covered.",
      urgency: "WHENEVER",
      status: "SCHEDULED",
      priceQuote: 0,
      billable: false,
      createdById: walter.id,
      visitId: walterVisit.id,
    },
  });

  // --- Client 3: Dorothy Klein - urgent open request, no visits yet.
  const dorothy = await prisma.user.create({
    data: {
      name: "Dorothy Klein",
      email: "dorothy@example.com",
      passwordHash,
      role: "CLIENT",
      client: {
        create: {
          address: "5 Birch Lane, Springfield",
          subscriptionTierId: soloTier.id,
          flexVisitsRemaining: 2,
        },
      },
    },
    include: { client: true },
  });

  await prisma.task.create({
    data: {
      clientId: dorothy.client.id,
      title: "Replace porch lightbulb",
      description: "Can't reach it safely myself.",
      urgency: "URGENT",
      status: "REQUESTED",
      priceQuote: 0,
      billable: false,
      createdById: dorothy.id,
    },
  });

  // --- Client 4: Sam Reyes - scheduled task, out of flex visits (billable).
  const sam = await prisma.user.create({
    data: {
      name: "Sam Reyes",
      email: "sam@example.com",
      passwordHash,
      role: "CLIENT",
      client: {
        create: {
          address: "200 Cedar Court, Springfield",
          subscriptionTierId: duoTier.id,
          flexVisitsRemaining: 0,
        },
      },
    },
    include: { client: true },
  });

  const samVisit = await prisma.visit.create({
    data: {
      clientId: sam.client.id,
      scheduledDate: daysFromNow(2),
      crewAssigned: "Crew B",
      status: "SCHEDULED",
    },
  });

  await prisma.task.create({
    data: {
      clientId: sam.client.id,
      title: "Weed the garden beds",
      description: "",
      urgency: "THIS_WEEK",
      status: "SCHEDULED",
      priceQuote: 70,
      billable: true,
      createdById: sam.id,
      visitId: samVisit.id,
    },
  });

  console.log("Seed complete.");
  console.log(`All demo accounts use the password: ${DEMO_PASSWORD}`);
}

function daysFromNow(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
