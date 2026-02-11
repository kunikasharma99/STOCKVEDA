const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Import Routers
const authRouter = require('./routes/auth');
const stockRouter = require('./routes/stockRoutes'); // New import

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/stocks', stockRouter); // All stock routes now start with /api/stocks

// Health check (kept in index or moved to a general route)
app.get('/api/ai/health', (req, res) => {
    res.status(200).json({
        status: "Node Gateway is online",
        ai_service: "Waiting for connection..."
    });
});

const DB_URI = process.env.MONGO_URI;

mongoose.connect(DB_URI, {
        serverSelectionTimeoutMS: 5000,
    })
    .then(() => {
        console.log("Successfully connected to MongoDB Atlas");
        app.listen(5000, () => console.log("Server running on port 5000"));
    })
    .catch(err => {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    });