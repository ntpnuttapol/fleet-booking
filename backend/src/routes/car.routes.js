const express = require('express');
const router = express.Router();
const carController = require('../controllers/car.controller');

router.get('/', carController.getCars);
router.get('/:id', carController.getCarById);
router.patch('/:id/status', carController.updateCarStatus);
router.post('/', carController.createCar);
router.put('/:id', carController.editCar);

module.exports = router;
