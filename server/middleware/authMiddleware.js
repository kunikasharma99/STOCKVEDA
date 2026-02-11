const jwt = require('jsonwebtoken');
const User = require('../models/User-schema');

const protect = async(req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch user and check if they still exist in DB
            const currentUser = await User.findById(decoded.id).select('-password');

            if (!currentUser) {
                return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
            }

            // Grant access to protected route
            req.user = currentUser;
            next();
        } catch (error) {
            console.error("JWT Error Log:", error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };