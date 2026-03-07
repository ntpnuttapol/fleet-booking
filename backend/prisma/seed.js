const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('Clearing database...');
    await prisma.notificationPreference.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.car.deleteMany();
    await prisma.user.deleteMany();

    console.log('Seeding users...');
    const hashedPassword = await bcrypt.hash('1234', 10);

    const user1 = await prisma.user.create({
        data: {
            id: 1,
            name: "สมชาย วิศวกร",
            email: "somchai@company.com",
            password: hashedPassword,
            role: "user",
            department: "Engineering",
            avatar: "🧑‍💻"
        }
    });

    const admin1 = await prisma.user.create({
        data: {
            id: 2,
            name: "สมหญิง แอดมิน",
            email: "somying@company.com",
            password: hashedPassword,
            role: "admin",
            department: "Administration",
            avatar: "👩‍💼"
        }
    });

    // Create default notification preferences
    await prisma.notificationPreference.createMany({
        data: [
            { userId: user1.id },
            { userId: admin1.id }
        ]
    });

    console.log('Seeding cars...');
    const cars = [
        { id: 1, name: "Honda Civic", licensePlate: "1กข 1234", type: "Sedan", color: "#3B82F6", status: "available", image: "🚙" },
        { id: 2, name: "Toyota Fortuner", licensePlate: "2ขค 5678", type: "SUV", color: "#8B5CF6", status: "booked", image: "🚙" },
        { id: 3, name: "Isuzu D-Max", licensePlate: "3คง 9012", type: "Pickup", color: "#F59E0B", status: "available", image: "🛻" },
        { id: 4, name: "Toyota Commuter", licensePlate: "4งจ 3456", type: "Van", color: "#10B981", status: "available", image: "🚐" },
        { id: 5, name: "MG ZS EV", licensePlate: "5จฉ 7890", type: "SUV", color: "#EC4899", status: "maintenance", image: "🔋" },
        { id: 6, name: "Honda Accord", licensePlate: "8กก 8888", type: "Sedan", color: "#64748B", status: "available", image: "🚗" },
    ];

    for (const car of cars) {
        await prisma.car.create({ data: car });
    }

    console.log('Seeding bookings...');
    const now = new Date();
    const tmrr = new Date(now.getTime() + 86400000);

    const formatDateForFrontend = (d) => {
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    await prisma.booking.create({
        data: {
            id: 1,
            userId: user1.id,
            carId: 2,
            startDate: formatDateForFrontend(now),
            endDate: formatDateForFrontend(tmrr),
            purpose: "พบลูกค้าบริษัท ABC ชลบุรี",
            status: "approved"
        }
    });

    console.log('Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
