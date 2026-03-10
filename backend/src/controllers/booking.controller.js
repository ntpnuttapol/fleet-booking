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

        if (!carId) {
            return res.status(400).json({ error: "กรุณาเลือกรถที่ต้องการจอง" });
        }

        const userId = req.user.id;

        // Limiting 1 booking per user (admins bypassed)
        if (req.user.role !== 'admin') {
            const activeBooking = await prisma.booking.findFirst({
                where: {
                    userId,
                    status: { in: ['pending', 'approved'] },
                    endDate: { gte: new Date() }
                }
            });
            if (activeBooking) {
                return res.status(400).json({ error: "คุณมีการจองที่กำลังใช้งานหรือรออนุมัติอยู่แล้ว (จำกัด 1 คัน/คน)" });
            }
        }

        const booking = await prisma.booking.create({
            data: { carId, userId, startDate, endDate, purpose, status: 'pending' },
            include: { user: true, car: true }
        });

        // Trigger Notification to Admins (Run in background)
        const admins = await prisma.user.findMany({ where: { role: 'admin' } });
        Promise.all(admins.map(admin =>
            notificationService.dispatch({
                userId: admin.id,
                type: 'new_booking',
                data: {
                    requesterName: booking.user.name,
                    bookingId: booking.id
                }
            }).catch(e => console.error("Notification Error:", e))
        ));

        res.status(201).json(booking);
    } catch (error) {
        console.error("Booking Creation Error:", error);
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

        // Trigger Notification to User (Run in background)
        notificationService.dispatch({
            userId: booking.userId,
            type: status === 'approved' ? 'booking_approved' : 'booking_rejected',
            data: {
                bookingId: booking.id
            }
        }).catch(e => console.error("Notification Error:", e));

        res.json(booking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getBookings, createBooking, updateBookingStatus };
