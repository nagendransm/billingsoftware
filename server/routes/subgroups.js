const express = require('express');
const router = express.Router();
const db = require('../db');
const { cleanTamilText } = require('../utils/tamilConverter');

// List all subgroups
router.get('/', (req, res) => {
  try {
    const { category_id } = req.query;
    let query = `
      SELECT sg.*, 
             c.name_en as category_name_en, 
             c.name_ta as category_name_ta,
             (SELECT COUNT(*) FROM products p WHERE p.subgroup_id = sg.id) as product_count
      FROM subgroups sg
      LEFT JOIN categories c ON sg.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id && category_id !== 'all') {
      query += ' AND sg.category_id = ?';
      params.push(Number(category_id));
    }

    query += ' ORDER BY sg.name_ta ASC';

    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new subgroup
router.post('/', (req, res) => {
  try {
    const { name_en, name_ta, category_id } = req.body;
    if (!name_en || !name_ta) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both English and Tamil names are required' 
      });
    }

    const stmt = db.prepare(`
      INSERT INTO subgroups (name_en, name_ta, category_id) 
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      name_en.trim(),
      cleanTamilText(name_ta.trim()),
      category_id ? Number(category_id) : null
    );

    const newSubg = db.prepare(`
      SELECT sg.*, c.name_en as category_name_en, c.name_ta as category_name_ta, 0 as product_count
      FROM subgroups sg
      LEFT JOIN categories c ON sg.category_id = c.id
      WHERE sg.id = ?
    `).get(result.lastInsertRowid);

    res.json({ success: true, data: newSubg, message: 'Subgroup created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update subgroup
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name_en, name_ta, category_id } = req.body;

    if (!name_en || !name_ta) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both English and Tamil names are required' 
      });
    }

    const stmt = db.prepare(`
      UPDATE subgroups 
      SET name_en = ?, name_ta = ?, category_id = ?
      WHERE id = ?
    `);

    stmt.run(
      name_en.trim(),
      cleanTamilText(name_ta.trim()),
      category_id ? Number(category_id) : null,
      id
    );

    const updated = db.prepare(`
      SELECT sg.*, c.name_en as category_name_en, c.name_ta as category_name_ta,
             (SELECT COUNT(*) FROM products p WHERE p.subgroup_id = sg.id) as product_count
      FROM subgroups sg
      LEFT JOIN categories c ON sg.category_id = c.id
      WHERE sg.id = ?
    `).get(id);

    res.json({ success: true, data: updated, message: 'Subgroup updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete subgroup
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);

    // Unlink products that belonged to this subgroup
    db.prepare('UPDATE products SET subgroup_id = NULL WHERE subgroup_id = ?').run(id);

    // Delete subgroup
    const result = db.prepare('DELETE FROM subgroups WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Subgroup not found' });
    }

    res.json({ success: true, message: 'Subgroup deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all products belonging to a subgroup
router.get('/:id/products', (req, res) => {
  try {
    const id = Number(req.params.id);
    const products = db.prepare(`
      SELECT p.*, 
             c.name_en as category_name_en, c.name_ta as category_name_ta,
             sg.name_en as subgroup_name_en, sg.name_ta as subgroup_name_ta
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subgroups sg ON p.subgroup_id = sg.id
      WHERE p.subgroup_id = ?
      ORDER BY p.name_ta ASC
    `).all(id);

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Assign a product to a subgroup
router.post('/:id/assign-product', (req, res) => {
  try {
    const subgroupId = Number(req.params.id);
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ success: false, message: 'product_id is required' });
    }

    db.prepare('UPDATE products SET subgroup_id = ? WHERE id = ?').run(subgroupId, Number(product_id));

    res.json({ success: true, message: 'Product assigned to subgroup successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove a product from a subgroup
router.delete('/:id/products/:productId', (req, res) => {
  try {
    const subgroupId = Number(req.params.id);
    const productId = Number(req.params.productId);

    db.prepare('UPDATE products SET subgroup_id = NULL WHERE id = ? AND subgroup_id = ?')
      .run(productId, subgroupId);

    res.json({ success: true, message: 'Product removed from subgroup successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
