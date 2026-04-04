const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, userController.getUsers);
router.post('/', verifyToken, userController.createUser);
router.put('/:id', verifyToken, userController.updateUser);
router.get('/me', verifyToken, userController.getMe);
router.post('/login', userController.login);
router.post('/sso', userController.loginWithSso);

module.exports = router;
