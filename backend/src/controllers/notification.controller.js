const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sseService = require('../services/sse.service');

const getNotifications = async (req, res) => {
    try {
        const unreadOnly = req.query.unread === 'true';
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.user.id,
                ...(unreadOnly ? { read: false } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const notification = await prisma.notification.update({
            where: { id: id, userId: req.user.id },
            data: { read: true }
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark as read' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await prisma.notification.count({
            where: { userId: req.user.id, read: false },
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

// SSE Endpoint
const streamNotifications = (req, res) => {
    const userId = req.user.id;
    const cleanup = sseService.addClient(userId, res);

    req.on('close', () => {
        cleanup();
    });
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    streamNotifications
};
