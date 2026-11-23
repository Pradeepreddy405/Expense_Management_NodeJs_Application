
const db = require('../config/db');

// POST API - Add Expense
exports.addExpense = (req, res) => {
    const {
        title,
        amount,
        category,
        expense_date,
        description
    } = req.body;

    if (!title || amount === undefined || amount === null ||
        !category || !expense_date) {
        return res.status(400).json({
            message: 'Title, amount, category and expense date are required'
        });
    }

    const sql = `
        INSERT INTO expenses
        (title, amount, category, expense_date, description)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [title, amount, category, expense_date, description || null],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: 'Failed to add expense',
                    error: err.message
                });
            }

            res.status(201).json({
                message: 'Expense added successfully',
                expenseId: result.insertId
            });
        }
    );
};


// GET API - Retrieve All Expenses
exports.getAllExpenses = (req, res) => {
    const sql = 'SELECT * FROM expenses ORDER BY expense_date DESC';

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: 'Failed to retrieve expenses',
                error: err.message
            });
        }

        res.status(200).json({
            message: 'Expenses retrieved successfully',
            data: results
        });
    });
};


// PUT API - Update Existing Expense
exports.updateExpense = (req, res) => {
    const id = Number(req.params.id);

    const {
        title,
        amount,
        category,
        expense_date,
        description
    } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: 'Invalid expense ID'
        });
    }

    if (!title || amount === undefined || amount === null ||
        !category || !expense_date) {
        return res.status(400).json({
            message: 'Title, amount, category and expense date are required'
        });
    }

    const checkSql = 'SELECT id FROM expenses WHERE id = ?';

    db.query(checkSql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: 'Failed to check expense',
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: 'Expense not found'
            });
        }

        const updateSql = `
            UPDATE expenses
            SET title = ?,
                amount = ?,
                category = ?,
                expense_date = ?,
                description = ?
            WHERE id = ?
        `;

        db.query(
            updateSql,
            [title, amount, category, expense_date, description || null, id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Failed to update expense',
                        error: err.message
                    });
                }

                res.status(200).json({
                    message: 'Expense updated successfully',
                    expenseId: id
                });
            }
        );
    });
};


// DELETE API - Delete Existing Expense
exports.deleteExpense = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: 'Invalid expense ID'
        });
    }

    const sql = 'DELETE FROM expenses WHERE id = ?';

    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: 'Failed to delete expense',
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Expense not found'
            });
        }

        res.status(200).json({
            message: 'Expense deleted successfully',
            expenseId: id
        });
    });
};

