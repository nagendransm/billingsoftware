const express = require('express');
const router = express.Router();
const db = require('../db');

// List categories
router.get('/', (req, res) => {
  try {
    const cats = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
    res.json({ success: true, data: cats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add category
router.post('/', (req, res) => {
  try {
    const { name_en, name_ta, icon = 'Package' } = req.body;
    if (!name_en || !name_ta) {
      return res.status(400).json({ success: false, message: 'Both English and Tamil names are required' });
    }
    const result = db.prepare('INSERT INTO categories (name_en, name_ta, icon) VALUES (?, ?, ?)').run(name_en, name_ta, icon);
    const newCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: newCat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
