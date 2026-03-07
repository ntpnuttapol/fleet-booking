const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-do-not-use-in-prod';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Fallback for SSE or other direct connections
        if (req.query.token) {
            try {
                const decoded = jwt.verify(req.query.token, JWT_SECRET);
                req.user = decoded;
                return next();
            } catch (err) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
        }
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = { verifyToken, generateToken, JWT_SECRET };
