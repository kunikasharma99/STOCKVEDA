console.log(" index.js loaded");
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());
const UserStock = require('./models/userStock-schema');
const User = require('./models/User-schema');
const authRouter = require('./routes/auth');

// mount auth routes
app.use('/api/auth', authRouter);

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

// POST ROUTES
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
app.post('/api/stocks/bulk', async(req, res) => {
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

// GET ROUTES

// Health check
app.get('/api/ai/health', (req, res) => {
    res.status(200).json({
        status: "Node Gateway is online",
        ai_service: "Waiting for connection..."
    });
});


// Fetch stock by MongoDB _id
// GET /api/stocks/id/:id
app.get('/api/stocks/id/:id', async(req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid stock ID" });
        }

        const stock = await UserStock.findById(id);

        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Fetch stock details by ticker
// GET /api/stocks/detail/:ticker
app.get('/api/stocks/detail/:ticker', async(req, res) => {
    try {
        const { ticker } = req.params;

        const stockDetail = await UserStock.findOne({
            ticker: ticker.toUpperCase()
        });

        if (!stockDetail) {
            return res.status(404).json({ message: "Stock not found" });
        }

        res.status(200).json(stockDetail);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Filter stocks by category for a user
// GET /api/stocks/filter/:userId/:category
app.get('/api/stocks/filter/:userId/:category', async(req, res) => {
    try {
        const { userId, category } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const stocks = await UserStock.find({
            userId: new mongoose.Types.ObjectId(userId),
            category: category.toLowerCase()
        });

        res.status(200).json(stocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Fetch ALL stocks for a user (Dashboard)
// GET /api/stocks/user/:userId
app.get('/api/stocks/user/:userId', async(req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const stocks = await UserStock.find({
            userId: new mongoose.Types.ObjectId(userId)
        });

        res.status(200).json(stocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//PUT ROUTES

//CASE 1: Update stock category(wishlist <-> holding)
app.put('/api/stocks/:id/category', async(req, res) => {
    try {
        const { id } = req.params;
        const { category } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid stockId" });
        }

        if (!category) {
            return res.status(400).json({ message: "Category is required" });
        }

        const stock = await UserStock.findByIdAndUpdate(
            id, { category: category.toLowerCase() }, { new: true }
        );

        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        res.status(200).json(stock);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//CASE 2: Update quantity & avgPrice (buy / update holding)
app.put('/api/stocks/:id/holding', async(req, res) => {
    try {
        const { id } = req.params;
        const { quantity, avgPrice } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid stock id" });
        }

        const stock = await UserStock.findByIdAndUpdate(
            id, {
                quantity,
                avgPrice,
                category: "holding"
            }, { new: true }
        );

        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//CASE 3: Move stock to wishlist (reset holding)
app.put('/api/stocks/:id/wishlist', async(req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid stock id" });
        }

        const stock = await UserStock.findByIdAndUpdate(
            id, { quantity: 0, avgPrice: 0, category: "wishlist" }, { new: true }
        );

        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//CASE 4: Update aiReport only
app.put('/api/stocks/:id/ai-report', async(req, res) => {
    try {
        const { id } = req.params;
        const { aiReport } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid stock id" });
        }

        const stock = await UserStock.findByIdAndUpdate(
            id, { aiReport }, { new: true }
        );

        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//CASE 5: Update stock by userId + ticker
app.put('/api/stocks/user/:userId/ticker/:ticker', async(req, res) => {
    try {
        const { userId, ticker } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const stock = await UserStock.findOneAndUpdate({ userId, ticker },
            updateData, { new: true }
        );

        if (!stock) {
            return res.status(404).json({ message: "Stock not found" });
        }

        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//CASE 6: Bulk update category (All from wishlist -> holding)
app.put('/api/stocks/user/:userId/category', async(req, res) => {
    try {
        const { userId } = req.params;
        const { from, to } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const result = await UserStock.updateMany({ userId, category: from }, { category: to });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//DELETER ROUTES
//Case 1: Delete by Mongo _id
app.delete('/api/stocks/id/:id', async(req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid stock ID" });
        }

        const deletedStock = await UserStock.findByIdAndDelete(id);
        if (!deletedStock) return res.status(404).json({ message: "Stock not found" });

        res.status(200).json({ message: "Stock deleted successfully", deletedStock });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//Case 2: Delete by userId + ticker
app.delete('/api/stocks/user/:userId/ticker/:ticker', async(req, res) => {
    try {
        const { userId, ticker } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const deletedStock = await UserStock.findOneAndDelete({
            userId: new mongoose.Types.ObjectId(userId),
            ticker: ticker.toUpperCase()
        });

        if (!deletedStock) return res.status(404).json({ message: "Stock not found" });

        res.status(200).json({ message: "Stock deleted successfully", deletedStock });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//Case 3: Delete all stocks for a user
app.delete('/api/stocks/user/:userId', async(req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const result = await UserStock.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });

        res.status(200).json({ message: `Deleted ${result.deletedCount} stocks for user` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});