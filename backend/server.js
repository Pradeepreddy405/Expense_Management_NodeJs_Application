
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const expenseRoutes = require('./routes/expenseRoutes');

const app = express();

// HTTP Request Logging Middleware
app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        console.log(
            `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | ${res.statusCode} | ${Date.now() - startTime}ms`
        );
    });

    next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Expense Routes
app.use('/api/expenses', expenseRoutes);

// Test API
app.get('/', (req, res) => {
    res.send('Expense Tracker Backend is Running!');
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

