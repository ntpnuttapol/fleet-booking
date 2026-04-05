const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { role: 'user' } });
  console.log("User:", user.email);

  // Check active bookings
  const activeBooking = await prisma.booking.findFirst({
      where: {
          userId: user.id,
          status: { in: ['pending', 'approved'] },
          endDate: { gte: new Date() }
      }
  });
  console.log("Active Booking:", activeBooking);
  
  // Create a rejected booking in the future
  /*
  await prisma.booking.create({
      data: {
          userId: user.id,
          carId: 1, // Make sure this exists
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          purpose: "Test",
          status: 'rejected'
      }
  });
  */
}
test().finally(() => prisma.$disconnect());
