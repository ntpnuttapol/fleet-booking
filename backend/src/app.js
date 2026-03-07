const express = require('express');
const cors = require('cors');
require('dotenv').config();

const notificationRoutes = require('./routes/notification.routes');
const preferenceRoutes = require('./routes/preference.routes');
const carRoutes = require('./routes/car.routes');
const userRoutes = require('./routes/user.routes');
const bookingRoutes = require('./routes/booking.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.send('Notification Backend Service is Running');
});
app.use('/api/notifications', notificationRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;
