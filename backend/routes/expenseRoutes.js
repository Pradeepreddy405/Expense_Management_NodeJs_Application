const express = require('express');
const router = express.Router();

const {
    addExpense,
    getAllExpenses,
    updateExpense,
    deleteExpense
} = require('../controllers/expenseController');

// POST API - Add Expense
router.post('/', addExpense);

// GET API - Retrieve All Expenses
router.get('/', getAllExpenses);

// PUT API - Update Expense
router.put('/:id', updateExpense);

// DELETE API - Delete Expense
router.delete('/:id', deleteExpense);

module.exports = router;
