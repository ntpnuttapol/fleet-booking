const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth.middleware');
const prisma = new PrismaClient();

const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, department: true, role: true, avatar: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        // Generate JWT Token
        const token = generateToken(user);

        // Return user data (excluding password) and the token
        const { password: _, ...userData } = user;
        res.json({ token, user: userData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, department: true, role: true, avatar: true }
        });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getUsers, login, getMe };
