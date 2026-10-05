const express = require('express');
const router = express.Router();
const db = require('../db');

// List customers
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR gstin LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY id DESC';
    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create customer
router.post('/', (req, res) => {
  try {
    const { name, phone, address, gstin, state_code = '33' } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO customers (name, phone, address, gstin, state_code, credit_balance)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    const result = stmt.run(name.trim(), phone ? phone.trim() : '', address || '', gstin ? gstin.trim().toUpperCase() : '', state_code);
    const newCust = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: newCust });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update customer
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, address, gstin, state_code } = req.body;

    db.prepare(`
      UPDATE customers SET
        name = ?, phone = ?, address = ?, gstin = ?, state_code = ?
      WHERE id = ?
    `).run(name, phone, address, gstin ? gstin.toUpperCase() : '', state_code || '33', id);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get customer Khata ledger & transaction history
router.get('/:id/ledger', (req, res) => {
  try {
    const id = Number(req.params.id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const transactions = db.prepare(`
      SELECT * FROM credit_transactions 
      WHERE customer_id = ? 
      ORDER BY id DESC
    `).all(id);

    const bills = db.prepare(`
      SELECT * FROM invoices 
      WHERE customer_id = ? 
      ORDER BY id DESC 
      LIMIT 20
    `).all(id);

    res.json({
      success: true,
      data: {
        customer,
        transactions,
        bills
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record repayment of credit balance (Customer paying their Khata debt)
router.post('/:id/pay-credit', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, notes = 'Repayment received / கடன் பாக்கி வரவு', date } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount required' });
    }

    const dateStr = date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO credit_transactions (customer_id, type, amount, notes, date)
      VALUES (?, 'credit', ?, ?, ?)
    `).run(id, paymentAmount, notes, dateStr);

    db.prepare(`
      UPDATE customers SET credit_balance = credit_balance - ? WHERE id = ?
    `).run(paymentAmount, id);

    const updatedCust = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json({ success: true, data: updatedCust });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete single customer
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM credit_transactions WHERE customer_id = ?').run(id);
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Completely delete all customers & customer credit history (Admin only)
router.delete('/', (req, res) => {
  try {
    db.prepare('DELETE FROM credit_transactions').run();
    db.prepare('DELETE FROM customers').run();
    res.json({ success: true, message: 'All customer data and credit history have been completely deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
