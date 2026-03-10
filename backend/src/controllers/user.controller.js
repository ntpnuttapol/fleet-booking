const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth.middleware');
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, username: true, email: true, department: true, role: true, avatar: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // The frontend currently sends 'email' field, it could contain either email or username
        const identifier = email || "";

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ error: "ชื่อผู้ใช้, อีเมล หรือรหัสผ่านไม่ถูกต้อง" });
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
            select: { id: true, name: true, username: true, email: true, department: true, role: true, avatar: true }
        });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "ไม่มีสิทธิ์ใช้งานส่วนนี้ (เฉพาะ Admin เท่านั้น)" });
        }

        const { name, username, email, password, department, role } = req.body;

        if (!name || (!email && !username) || !password) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" });
        }

        const identifier = email || username;

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // If username not provided, fall back to email split
        const finalUsername = username || (email ? email.split('@')[0] : `user_${Date.now()}`);

        const newUser = await prisma.user.create({
            data: {
                name,
                username: finalUsername,
                email: email || null,
                password: hashedPassword,
                department,
                role: role || 'user',
                avatar: "👤" // Default avatar
            },
            select: { id: true, name: true, username: true, email: true, department: true, role: true, avatar: true }
        });

        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "ไม่มีสิทธิ์ใช้งานส่วนนี้ (เฉพาะ Admin เท่านั้น)" });
        }

        const { id } = req.params;
        const { name, username, email, department, role, password } = req.body;

        const userId = parseInt(id);
        if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

        // Check if username/email already exists for a DIFFERENT user
        const identifier = email || username;
        if (identifier) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    id: { not: userId },
                    OR: [
                        { email: identifier },
                        { username: identifier }
                    ]
                }
            });

            if (existingUser) {
                return res.status(400).json({ error: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว" });
            }
        }

        const updateData = { name, username, email, department, role };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, username: true, email: true, department: true, role: true, avatar: true }
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getUsers, login, getMe, createUser, updateUser };
