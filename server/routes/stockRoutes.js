const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const UserStock = require('../models/userStock-schema');
const { protect } = require('../middleware/authMiddleware');

// Apply the protect middleware to ALL routes
router.use(protect);

// --- GET ROUTES (The "Kunika Fix") ---

/**
 * @route   GET /api/stocks/my-stocks
 * @desc    Fetch ONLY the logged-in user's stocks (Safest method)
 */
router.get('/my-stocks', async(req, res) => {
    try {
        // req.user.id is extracted from the JWT token by the protect middleware
        const stocks = await UserStock.find({
            userId: new mongoose.Types.ObjectId(req.user.id)
        });
        res.status(200).json(stocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @route   GET /api/stocks/user/:userId
 * @desc    Fetch ALL stocks for a user with Ownership Validation
 */
router.get('/user/:userId', async(req, res) => {
    try {
        const { userId } = req.params;

        // VALIDATION: Prevent User A from seeing User B's stocks
        if (userId !== req.user.id) {
            return res.status(403).json({ message: "Access denied: You can only view your own stocks" });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const stocks = await UserStock.find({ userId: new mongoose.Types.ObjectId(userId) });
        res.status(200).json(stocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- POST ROUTES ---

/**
 * @route   POST /api/stocks/
 * @desc    Single Stock Insert (Auto-assigns userId from token)
 */
router.post('/', async(req, res) => {
    try {
        const newStock = new UserStock({
            userId: req.user.id, // Taken from token, ignore req.body.userId for safety
            ticker: req.body.ticker,
            category: req.body.category || 'wishlist'
        });

        const savedStock = await newStock.save();
        res.status(201).json(savedStock);
    } catch (error) {
        res.status(400).json({ message: "Error saving stock", error: error.message });
    }
});

/**
 * @route   POST /api/stocks/bulk
 * @desc    Bulk Insert (Forces userId from token for every item)
 */
router.post('/bulk', async(req, res) => {
    try {
        let stocksArray = req.body;
        if (!Array.isArray(stocksArray)) {
            return res.status(400).json({ message: "Request body must be an array" });
        }

        // Overwrite any userId in the body with the authenticated token ID
        const secureStocks = stocksArray.map(stock => ({
            ...stock,
            userId: req.user.id
        }));

        const savedStocks = await UserStock.insertMany(secureStocks, { ordered: true });
        res.status(201).json({ message: `Inserted ${savedStocks.length} stocks`, data: savedStocks });
    } catch (error) {
        res.status(400).json({ message: "Error in bulk insert", error: error.message });
    }
});

// --- GET DETAILS BY ID/TICKER ---

router.get('/id/:id', async(req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID" });

        const stock = await UserStock.findOne({ _id: id, userId: req.user.id });
        if (!stock) return res.status(404).json({ message: "Stock not found or unauthorized" });
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/detail/:ticker', async(req, res) => {
    try {
        // Ensures user only finds tickers they own
        const stockDetail = await UserStock.findOne({
            ticker: req.params.ticker.toUpperCase(),
            userId: req.user.id
        });
        if (!stockDetail) return res.status(404).json({ message: "Stock not found in your list" });
        res.status(200).json(stockDetail);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- FILTER ---

router.get('/filter/:userId/:category', async(req, res) => {
    try {
        const { userId, category } = req.params;
        if (userId !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

        const stocks = await UserStock.find({
            userId: new mongoose.Types.ObjectId(userId),
            category: category.toLowerCase()
        });
        res.status(200).json(stocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- PUT ROUTES (With Ownership Checks) ---

router.put('/:id/category', async(req, res) => {
    try {
        const stock = await UserStock.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { category: req.body.category.toLowerCase() }, { new: true });
        if (!stock) return res.status(404).json({ message: "Stock not found or unauthorized" });
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id/holding', async(req, res) => {
    try {
        const stock = await UserStock.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { quantity: req.body.quantity, avgPrice: req.body.avgPrice, category: "holding" }, { new: true });
        if (!stock) return res.status(404).json({ message: "Stock not found or unauthorized" });
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id/wishlist', async(req, res) => {
    try {
        const stock = await UserStock.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { quantity: 0, avgPrice: 0, category: "wishlist" }, { new: true });
        if (!stock) return res.status(404).json({ message: "Stock not found" });
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id/ai-report', async(req, res) => {
    try {
        const stock = await UserStock.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { aiReport: req.body.aiReport }, { new: true });
        if (!stock) return res.status(404).json({ message: "Stock not found" });
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/user/:userId/ticker/:ticker', async(req, res) => {
    try {
        if (req.params.userId !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
        const stock = await UserStock.findOneAndUpdate({ userId: req.params.userId, ticker: req.params.ticker.toUpperCase() },
            req.body, { new: true }
        );
        if (!stock) return res.status(404).json({ message: "Stock not found" });
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/user/:userId/category', async(req, res) => {
    try {
        if (req.params.userId !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
        const result = await UserStock.updateMany({ userId: req.params.userId, category: req.body.from }, { category: req.body.to });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- DELETE ROUTES ---

router.delete('/id/:id', async(req, res) => {
    try {
        const deletedStock = await UserStock.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!deletedStock) return res.status(404).json({ message: "Stock not found" });
        res.status(200).json({ message: "Deleted", deletedStock });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/user/:userId/ticker/:ticker', async(req, res) => {
    try {
        if (req.params.userId !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
        const deletedStock = await UserStock.findOneAndDelete({
            userId: req.params.userId,
            ticker: req.params.ticker.toUpperCase()
        });
        if (!deletedStock) return res.status(404).json({ message: "Stock not found" });
        res.status(200).json({ message: "Deleted", deletedStock });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/user/:userId', async(req, res) => {
    try {
        if (req.params.userId !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
        const result = await UserStock.deleteMany({ userId: req.params.userId });
        res.status(200).json({ message: `Deleted ${result.deletedCount} stocks` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;