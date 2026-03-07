const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, bookingController.getBookings);
router.post('/', verifyToken, bookingController.createBooking);
router.patch('/:id/status', verifyToken, bookingController.updateBookingStatus);

module.exports = router;
