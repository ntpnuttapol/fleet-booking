const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateToken } = require('../middleware/auth.middleware');
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

const DEFAULT_HUB_URL = process.env.HUB_URL || process.env.NEXT_PUBLIC_HUB_URL || 'https://polyfoampfs-hub.vercel.app';
const BOOKING_SSO_SYSTEM_ID = process.env.SSO_SYSTEM_ID || 'booking';
const ALLOWED_HUB_ORIGINS = new Set(
    [DEFAULT_HUB_URL, 'https://polyfoampfs-hub.vercel.app', 'https://pfs-portal.vercel.app', 'http://localhost:3000']
        .map((value) => {
            try {
                return new URL(value).origin;
            } catch {
                return null;
            }
        })
        .filter(Boolean)
);

function resolveHubValidateUrl(hubOrigin) {
    const normalizedOrigin = (() => {
        try {
            return hubOrigin ? new URL(hubOrigin).origin : null;
        } catch {
            return null;
        }
    })();

    const origin = normalizedOrigin && ALLOWED_HUB_ORIGINS.has(normalizedOrigin)
        ? normalizedOrigin
        : new URL(DEFAULT_HUB_URL).origin;

    return `${origin}/api/sso/validate`;
}

function normalizeEmail(value) {
    return typeof value === 'string' && value.trim()
        ? value.trim().toLowerCase()
        : null;
}

function sanitizeUsername(value) {
    if (!value || typeof value !== 'string') return null;

    const cleaned = value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/[._-]{2,}/g, '.')
        .replace(/^[._-]+|[._-]+$/g, '');

    return cleaned || null;
}

function buildSsoIdentity(hubEmail, hubMetadata = {}) {
    const normalizedEmail = normalizeEmail(hubEmail);
    const emailLocalPart = normalizedEmail ? normalizedEmail.split('@')[0] : null;
    const fullName =
        (typeof hubMetadata.full_name === 'string' && hubMetadata.full_name.trim()) ||
        (typeof hubMetadata.name === 'string' && hubMetadata.name.trim()) ||
        (typeof hubMetadata.username === 'string' && hubMetadata.username.trim()) ||
        emailLocalPart ||
        'Fleet Booking User';

    const usernameCandidates = [
        hubMetadata.username,
        hubMetadata.employee_code,
        hubMetadata.employeeId,
        hubMetadata.employee_id,
        emailLocalPart,
        fullName,
    ]
        .map(sanitizeUsername)
        .filter(Boolean);

    return {
        email: normalizedEmail,
        fullName,
        usernameCandidates: Array.from(new Set(usernameCandidates)),
        department:
            typeof hubMetadata.department === 'string' && hubMetadata.department.trim()
                ? hubMetadata.department.trim()
                : null,
    };
}

async function findExistingSsoUser({ email, usernameCandidates }) {
    const orConditions = [];

    if (email) {
        orConditions.push({ email });
    }

    usernameCandidates.forEach((username) => {
        orConditions.push({ username });
    });

    if (orConditions.length === 0) {
        return null;
    }

    return prisma.user.findFirst({
        where: { OR: orConditions },
    });
}

async function createUniqueUsername(usernameCandidates) {
    const baseUsername = usernameCandidates[0] || `booking-user-${Date.now()}`;

    for (let suffix = 0; suffix < 1000; suffix += 1) {
        const candidate = suffix === 0 ? baseUsername : `${baseUsername}.${suffix}`;
        const existing = await prisma.user.findUnique({
            where: { username: candidate },
            select: { id: true },
        });

        if (!existing) {
            return candidate;
        }
    }

    return `booking-user-${Date.now()}`;
}

async function findOrProvisionSsoUser(hubEmail, hubMetadata = {}) {
    const identity = buildSsoIdentity(hubEmail, hubMetadata);
    const existingUser = await findExistingSsoUser(identity);

    if (existingUser) {
        const updateData = {};

        if (!existingUser.email && identity.email) {
            updateData.email = identity.email;
        }

        if ((!existingUser.name || existingUser.name === existingUser.username) && identity.fullName) {
            updateData.name = identity.fullName;
        }

        if (!existingUser.department && identity.department) {
            updateData.department = identity.department;
        }

        if (Object.keys(updateData).length > 0) {
            const updatedUser = await prisma.user.update({
                where: { id: existingUser.id },
                data: updateData,
            });
            return { user: updatedUser, autoProvisioned: false };
        }

        return { user: existingUser, autoProvisioned: false };
    }

    const username = await createUniqueUsername(identity.usernameCandidates);
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const createdUser = await prisma.user.create({
        data: {
            username,
            email: identity.email,
            password: passwordHash,
            name: identity.fullName,
            department: identity.department,
            role: 'user',
            avatar: '👤',
        },
    });
    return { user: createdUser, autoProvisioned: true };
}

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

const loginWithSso = async (req, res) => {
    try {
        const { sso_token, hub_origin } = req.body;

        if (!sso_token) {
            return res.status(400).json({ error: 'Missing sso_token' });
        }

        const validateUrl = resolveHubValidateUrl(hub_origin);
        const validateRes = await fetch(validateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: sso_token,
                systemId: BOOKING_SSO_SYSTEM_ID,
            }),
        });

        const validateData = await validateRes.json();

        if (!validateRes.ok || validateData.error) {
            return res.status(validateRes.status || 401).json({
                error: validateData.error || 'SSO login failed',
            });
        }

        const hubUser = validateData.user || {};
        const { user: localUser, autoProvisioned } = await findOrProvisionSsoUser(
            hubUser.hubEmail,
            hubUser.hubUserMetadata || {}
        );

        const token = generateToken(localUser);

        return res.json({
            token,
            user: {
                id: localUser.id,
                name: localUser.name,
                username: localUser.username,
                email: localUser.email || null,
                department: localUser.department || null,
                role: localUser.role,
                avatar: localUser.avatar || '👤',
            },
            autoProvisioned,
        });
    } catch (error) {
        console.error('SSO login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

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

module.exports = { getUsers, login, loginWithSso, getMe, createUser, updateUser };
