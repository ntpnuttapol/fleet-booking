require('dotenv').config();
const notificationService = require('./src/services/notification.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

async function runDummyTest() {
    console.log("--- เริ่มการทดสอบส่งแจ้งเตือน ---");

    // 1. mock user and preferences for testing
    // In a real database this would be seeded or created by the application
    console.log("Creating dummy user...");
    let user;
    try {
        user = await prisma.user.upsert({
            where: { email: 'admin@fleetbook.local' },
            update: {},
            create: {
                email: 'admin@fleetbook.local',
                name: 'Admin User',
                role: 'ADMIN',
            }
        });

        await prisma.notificationPreference.upsert({
            where: { userId: user.id },
            update: { inapp: true, email: true, line: true, lineToken: process.env.LINE_NOTIFY_TOKEN || 'mock_token' },
            create: {
                userId: user.id,
                inapp: true,
                email: true,
                line: true,
                lineToken: process.env.LINE_NOTIFY_TOKEN || 'mock_token'
            }
        });
    } catch (err) {
        console.log("Error creating dummy data. Make sure DB is hooked up if using real postgres.", err.message);
        console.log("We'll proceed with dispatch assuming it handles missing users gracefully or you just want to see the service code run.");
        user = { id: 1, email: 'admin@fleetbook.local' };
    }

    // Create a dummy booking for the foreign key
    try {
        await prisma.booking.upsert({
            where: { id: 101 },
            update: {},
            create: {
                id: 101,
                userId: user.id,
                carId: 999,
                startDate: new Date('2023-11-01'),
                endDate: new Date('2023-11-03'),
                purpose: 'พบลูกค้า'
            }
        });
    } catch (err) {
        console.log("Failed to create dummy booking", err.message);
    }

    // 2. Trigger a new booking event
    const event = {
        type: 'new_booking',
        userId: user.id,
        data: {
            bookingId: 101,
            requesterName: 'สมชาย คมคาย',
            department: 'IT',
            carName: 'Toyota Yaris',
            startDate: '2023-11-01',
            endDate: '2023-11-03',
            purpose: 'พบลูกค้า'
        }
    };

    console.log("Dispatching event...");
    try {
        const notif = await notificationService.dispatch(event);
        console.log("Notification created and dispatched successfully:");
        console.log(notif);
    } catch (error) {
        console.error("Failed to dispatch:", error);
    } finally {
        await prisma.$disconnect();
        console.log("--- จบการทดสอบ ---");
    }
}

runDummyTest();
