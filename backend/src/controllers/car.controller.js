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

module.exports = { getCars, getCarById };
