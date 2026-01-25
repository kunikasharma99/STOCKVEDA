const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Replace with your Atlas Connection String in a .env file
const DB_URI = process.env.MONGO_URI;

mongoose.connect(DB_URI)
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch(err => console.error("Connection error:", err));

app.listen(5000, () => console.log("Server running on port 5000"));