const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());
const UserStock = require('./models/userStock-schema');


// Replace with your Atlas Connection String in a .env file
const DB_URI = process.env.MONGO_URI;

mongoose.connect(DB_URI, {
        serverSelectionTimeoutMS: 5000, // Fail fast if network is bad
    })
    .then(() => {
        console.log("Successfully connected to MongoDB Atlas");
        // Only start the server once DB is ready
        app.listen(5000, () => console.log("Server running on port 5000"));
    })
    .catch(err => {
        console.error("MongoDB connection error:", err.message);
        process.exit(1); // Stop the app if we can't connect
    });

// Single Stock Insert Route
app.post('/api/stocks', async(req, res) => {
    try {
        const newStock = new UserStock({
            userId: req.body.userId,
            ticker: req.body.ticker,
            category: req.body.category || 'wishlist'
        });

        const savedStock = await newStock.save();
        res.status(201).json(savedStock);
    } catch (error) {
        res.status(400).json({ message: "Error saving stock", error: error.message });
    }
});

// Bulk Insert Route
app.post('/api/stocks/bulk', async (req, res) => {
    try {
        // Ensure the body is an array
        const stocksArray = req.body;
        
        if (!Array.isArray(stocksArray)) {
            return res.status(400).json({ message: "Request body must be an array of stocks" });
        }

        // insertMany sends everything in ONE network request to Atlas
        const savedStocks = await UserStock.insertMany(stocksArray, { 
            ordered: true // Set to false if you want to continue even if one doc fails
        });

        res.status(201).json({
            message: `Successfully inserted ${savedStocks.length} documents`,
            data: savedStocks
        });
    } catch (error) {
        res.status(400).json({ message: "Error in bulk insert", error: error.message });
    }
});