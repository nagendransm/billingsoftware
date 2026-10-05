const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all products with search & filters
router.get('/', (req, res) => {
  try {
    const { search, category_id, quick_only, low_stock } = req.query;
    let query = `
      SELECT p.*, c.name_en as category_name_en, c.name_ta as category_name_ta 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.name_en LIKE ? OR p.name_ta LIKE ? OR p.barcode LIKE ? OR p.hsn_code LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (category_id) {
      query += ` AND p.category_id = ?`;
      params.push(Number(category_id));
    }

    if (quick_only === 'true' || quick_only === '1') {
      query += ` AND p.is_quick_item = 1`;
    }

    if (low_stock === 'true' || low_stock === '1') {
      query += ` AND p.stock_quantity <= p.min_stock_alert`;
    }

    query += ` ORDER BY p.name_ta ASC`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Barcode scanner lookup
router.get('/barcode/:barcode', (req, res) => {
  try {
    const barcode = req.params.barcode.trim();
    const stmt = db.prepare(`
      SELECT p.*, c.name_en as category_name_en, c.name_ta as category_name_ta 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.barcode = ?
    `);
    const product = stmt.get(barcode);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found / பொருள் காணப்படவில்லை' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new product
router.post('/', (req, res) => {
  try {
    const {
      barcode,
      name_en,
      name_ta,
      category_id,
      hsn_code,
      unit = 'kg',
      cost_price = 0,
      selling_price,
      mrp,
      discount_percent = 0,
      gst_rate = 5,
      cess_rate = 0,
      stock_quantity = 0,
      min_stock_alert = 10,
      is_loose_item = 0,
      is_quick_item = 0
    } = req.body;

    if (!name_en || !name_ta || selling_price === undefined || !hsn_code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name (EN & TA), selling price, and HSN code are mandatory' 
      });
    }

    // Auto-generate barcode if not provided
    const finalBarcode = barcode && barcode.trim() !== '' 
      ? barcode.trim() 
      : 'GCR' + Math.floor(10000000 + Math.random() * 90000000);

    const stmt = db.prepare(`
      INSERT INTO products (
        barcode, name_en, name_ta, category_id, hsn_code, unit,
        cost_price, selling_price, mrp, discount_percent, gst_rate,
        cess_rate, stock_quantity, min_stock_alert, is_loose_item, is_quick_item
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      finalBarcode,
      name_en.trim(),
      name_ta.trim(),
      category_id ? Number(category_id) : null,
      hsn_code.trim(),
      unit,
      Number(cost_price || 0),
      Number(selling_price),
      mrp ? Number(mrp) : Number(selling_price),
      Number(discount_percent || 0),
      Number(gst_rate || 0),
      Number(cess_rate || 0),
      Number(stock_quantity || 0),
      Number(min_stock_alert || 10),
      is_loose_item ? 1 : 0,
      is_quick_item ? 1 : 0
    );

    const newProd = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: newProd });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update product
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      barcode,
      name_en,
      name_ta,
      category_id,
      hsn_code,
      unit,
      cost_price,
      selling_price,
      mrp,
      discount_percent,
      gst_rate,
      cess_rate,
      stock_quantity,
      min_stock_alert,
      is_loose_item,
      is_quick_item
    } = req.body;

    const stmt = db.prepare(`
      UPDATE products SET
        barcode = ?,
        name_en = ?,
        name_ta = ?,
        category_id = ?,
        hsn_code = ?,
        unit = ?,
        cost_price = ?,
        selling_price = ?,
        mrp = ?,
        discount_percent = ?,
        gst_rate = ?,
        cess_rate = ?,
        stock_quantity = ?,
        min_stock_alert = ?,
        is_loose_item = ?,
        is_quick_item = ?
      WHERE id = ?
    `);

    stmt.run(
      barcode,
      name_en,
      name_ta,
      category_id ? Number(category_id) : null,
      hsn_code,
      unit,
      Number(cost_price || 0),
      Number(selling_price),
      Number(mrp || selling_price),
      Number(discount_percent || 0),
      Number(gst_rate || 0),
      Number(cess_rate || 0),
      Number(stock_quantity || 0),
      Number(min_stock_alert || 10),
      is_loose_item ? 1 : 0,
      is_quick_item ? 1 : 0,
      id
    );

    const updatedProd = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ success: true, data: updatedProd });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Adjust stock quantity
router.post('/:id/adjust-stock', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { adjustment } = req.body; // e.g. +10 or -5
    if (adjustment === undefined) {
      return res.status(400).json({ success: false, message: 'Adjustment quantity required' });
    }

    db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(Number(adjustment), id);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete product
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
