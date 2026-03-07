const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, userController.getUsers);
router.get('/me', verifyToken, userController.getMe);
router.post('/login', userController.login);

module.exports = router;
