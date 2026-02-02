const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User-schema');

const router = express.Router();

// Helper to generate JWT
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// @desc    Register new user
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Create user (password is hashed automatically by the pre-save hook)
        const user = await User.create({ username, email, password });

        return res.status(201).json({
            success: true,
            token: generateToken(user._id)
        });
    } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
});

// @desc    Login user
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check if user exists
        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        // 2. Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        return res.status(200).json({
            success: true,
            token: generateToken(user._id)
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;