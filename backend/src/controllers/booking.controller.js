const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationService = require('../services/notification.service');

const getBookings = async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                car: true,
                user: { select: { id: true, name: true, department: true, avatar: true } }
            }
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createBooking = async (req, res) => {
    try {
        const { carId, startDate, endDate, purpose } = req.body;
        const userId = req.user.id;

        const booking = await prisma.booking.create({
            data: { carId, userId, startDate, endDate, purpose, status: 'pending' },
            include: { user: true, car: true }
        });

        // Trigger Notification to Admins
        const admins = await prisma.user.findMany({ where: { role: 'admin' } });
        for (const admin of admins) {
            await notificationService.dispatchNotification({
                userId: admin.id,
                type: 'new_booking',
                title: 'คำขอจองใหม่',
                message: `${booking.user.name} ขอจอง ${booking.car.name} วันที่ ${booking.startDate.replace('T', ' ')}`,
                bookingId: booking.id
            });
        }

        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        const booking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: { status },
            include: { car: true }
        });

        // Trigger Notification to User
        const title = status === 'approved' ? 'การจองได้รับอนุมัติ' : 'การจองถูกปฏิเสธ';
        const message = status === 'approved'
            ? `คำขอจอง ${booking.car.name} ได้รับอนุมัติแล้ว`
            : `คำขอจอง ${booking.car.name} ถูกปฏิเสธ`;

        await notificationService.dispatchNotification({
            userId: booking.userId,
            type: status === 'approved' ? 'booking_approved' : 'booking_rejected',
            title,
            message,
            bookingId: booking.id
        });

        res.json(booking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getBookings, createBooking, updateBookingStatus };
