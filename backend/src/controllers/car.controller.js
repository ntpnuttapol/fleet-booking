const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getCars = async (req, res) => {
    try {
        const cars = await prisma.car.findMany();
        res.json(cars);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCarById = async (req, res) => {
    try {
        const car = await prisma.car.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!car) return res.status(404).json({ error: "Car not found" });
        res.json(car);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateCarStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['available', 'booked', 'maintenance', 'inactive'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const updatedCar = await prisma.car.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.json(updatedCar);
    } catch (error) {
        console.error("Error updating car status:", error);
        res.status(500).json({ error: error.message });
    }
};

const createCar = async (req, res) => {
    try {
        const { name, licensePlate, type, color, image } = req.body;
        if (!name || !licensePlate || !type || !color || !image) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const newCar = await prisma.car.create({
            data: { name, licensePlate, type, color, status: 'available', image }
        });
        res.status(201).json(newCar);
    } catch (error) {
        console.error("Error creating car:", error);
        res.status(500).json({ error: error.message });
    }
};

const editCar = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, licensePlate, type, color, image } = req.body;

        if (!name || !licensePlate || !type || !color || !image) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updatedCar = await prisma.car.update({
            where: { id: parseInt(id) },
            data: { name, licensePlate, type, color, image }
        });

        res.json(updatedCar);
    } catch (error) {
        console.error("Error editing car:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getCars, getCarById, updateCarStatus, createCar, editCar };
