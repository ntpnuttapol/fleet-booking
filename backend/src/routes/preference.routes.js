const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/preference.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, preferenceController.getPreferences);
router.put('/', verifyToken, preferenceController.updatePreferences);

module.exports = router;
