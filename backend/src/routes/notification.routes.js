const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, notificationController.getNotifications);
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);
router.post('/:id/read', verifyToken, notificationController.markAsRead);
router.post('/read-all', verifyToken, notificationController.markAllAsRead);
router.get('/stream', verifyToken, notificationController.streamNotifications);

module.exports = router;
