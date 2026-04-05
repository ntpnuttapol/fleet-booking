require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBooking() {
    const user = await prisma.user.findFirst({ where: { role: 'user' } });
    console.log("Mocking request for user:", user?.email);

    if (!user) return console.log("No user found");

    // Mock req, res
    const req = {
        user: { id: user.id, role: user.role },
        body: {
            carId: 1, // Make sure a car with ID 1 exists
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(),
            purpose: "Test"
        }
    };

    const res = {
        status: (code) => {
            console.log("HTTP STATUS:", code);
            return res;
        },
        json: (data) => {
            console.log("RESPONSE DATA:", data);
        }
    };

    const { createBooking } = require('./src/controllers/booking.controller');
    await createBooking(req, res);
    await prisma.$disconnect();
}

testBooking();
