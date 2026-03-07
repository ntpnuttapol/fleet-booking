const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

const getPreferences = async (req, res) => {
    try {
        const preferences = await prisma.notificationPreference.findUnique({
            where: { userId: req.user.id }
        });

        // Default if not exist
        res.json(preferences || {
            userId: req.user.id,
            inapp: true,
            email: true,
            line: false,
            lineToken: null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
};

const updatePreferences = async (req, res) => {
    try {
        const { inapp, email, line, lineToken } = req.body;

        const preferences = await prisma.notificationPreference.upsert({
            where: { userId: req.user.id },
            update: { inapp, email, line, lineToken },
            create: { userId: req.user.id, inapp, email, line, lineToken }
        });

        res.json(preferences);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update preferences' });
    }
};

module.exports = {
    getPreferences,
    updatePreferences
};
