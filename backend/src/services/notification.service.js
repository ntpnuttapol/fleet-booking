const { PrismaClient } = require('@prisma/client');
const sseService = require('./sse.service');
const emailService = require('./email.service');
const lineService = require('./line.service');

require('dotenv').config();
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

class NotificationService {
    async dispatch(event) {
        const { type, userId, data } = event;

        // 1. Fetch user preferences
        let prefs = await prisma.notificationPreference.findUnique({
            where: { userId }
        });

        if (!prefs) {
            prefs = { inapp: true, email: true, line: false, lineToken: null };
        }

        // 2. Create notification record
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title: this.getTitle(type, data),
                message: this.getMessage(type, data),
                bookingId: data?.bookingId || null,
                channels: '',
            }
        });

        // 3. Dispatch to all enabled channels (parallel)
        const promises = [];
        const sentChannels = [];
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (prefs.inapp) {
            promises.push(this.sendInApp(userId, notification).then(() => sentChannels.push('inapp')));
        }

        if (prefs.email && user?.email) {
            promises.push(this.sendEmail(user.email, notification, data).then(() => sentChannels.push('email')));
        }

        if (prefs.line && prefs.lineToken) {
            promises.push(this.sendLine(prefs.lineToken, notification).then(() => sentChannels.push('line')));
        }

        await Promise.allSettled(promises);

        // Update channels that were actually sent to
        await prisma.notification.update({
            where: { id: notification.id },
            data: { channels: sentChannels.join(',') }
        });

        return notification;
    }

    getTitle(type, data) {
        const titles = {
            new_booking: 'คำขอจองรถใหม่',
            booking_approved: 'การจองได้รับอนุมัติ',
            booking_rejected: 'การจองถูกปฏิเสธ',
            booking_reminder: 'เตือนการจองรถ',
        };
        return titles[type] || 'แจ้งเตือน';
    }

    getMessage(type, data) {
        switch (type) {
            case 'new_booking':
                return `มีคำขอจองรถใหม่จากคุณ ${data?.requesterName || 'ผู้ใช้'}`;
            case 'booking_approved':
                return `คำขอจองรถของคุณได้รับการอนุมัติแล้ว`;
            case 'booking_rejected':
                return `คำขอจองรถของคุณถูกปฏิเสธ`;
            default:
                return 'มีข้อความแจ้งเตือนใหม่';
        }
    }

    async sendInApp(userId, notification) {
        sseService.sendToUser(userId, notification);
    }

    async sendEmail(email, notification, data) {
        await emailService.sendNotificationEmail(email, notification, data);
    }

    async sendLine(token, notification) {
        await lineService.sendLineNotify(token, notification);
    }
}

module.exports = new NotificationService();
