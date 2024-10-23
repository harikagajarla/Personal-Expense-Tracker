const sqlite3 = require('sqlite3').verbose();

// Initialize the database
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        // Create the transactions table
        db.run(`CREATE TABLE transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT CHECK(type IN ('income', 'expense')),
            category TEXT,
            amount REAL,
            date TEXT,
            description TEXT
        )`);

        // Create the categories table
        db.run(`CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT CHECK(type IN ('income', 'expense'))
        )`);
    }
});

module.exports = db;

const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Add a new transaction
router.post('/transactions', (req, res) => {
    const { type, category, amount, date, description } = req.body;
    const sql = `INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [type, category, amount, date, description], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID });
    });
});

// Get all transactions
router.get('/transactions', (req, res) => {
    db.all('SELECT * FROM transactions', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(rows);
    });
});

// Get a specific transaction by ID
router.get('/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM transactions WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.status(200).json(row);
    });
});

// Update a transaction by ID
router.put('/transactions/:id', (req, res) => {
    const { id } = req.params;
    const { type, category, amount, date, description } = req.body;
    const sql = `UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ?`;
    db.run(sql, [type, category, amount, date, description, id], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.status(200).json({ updatedID: this.changes });
    });
});

// Delete a transaction by ID
router.delete('/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM transactions WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ deletedID: this.changes });
    });
});

// Get transaction summary (total income, total expenses, balance)
router.get('/summary', (req, res) => {
    const sql = 'SELECT type, SUM(amount) as total FROM transactions GROUP BY type';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        let summary = { income: 0, expense: 0, balance: 0 };
        rows.forEach(row => {
            if (row.type === 'income') summary.income = row.total;
            if (row.type === 'expense') summary.expense = row.total;
        });
        summary.balance = summary.income - summary.expense;
        res.status(200).json(summary);
    });
});

module.exports = router;






const express = require('express');
const bodyParser = require('body-parser');
const transactionsRoutes = require('./routes/transactions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Routes
app.use(transactionsRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});