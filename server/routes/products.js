const express = require('express');
const router = express.Router();
const db = require('../db');
const { cleanTamilText } = require('../utils/tamilConverter');

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
      cleanTamilText(name_ta),
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
      cleanTamilText(name_ta),
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

// Bulk import products (from Excel/CSV)
router.post('/bulk-import', (req, res) => {
  try {
    const { items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items provided for import' });
    }

    const checkStmt = db.prepare('SELECT id FROM products WHERE barcode = ?');
    const updateStmt = db.prepare(`
      UPDATE products SET
        name_en = ?,
        name_ta = ?,
        hsn_code = ?,
        unit = ?,
        cost_price = ?,
        selling_price = ?,
        mrp = ?,
        gst_rate = ?,
        stock_quantity = ?,
        min_stock_alert = ?
      WHERE barcode = ?
    `);

    const insertStmt = db.prepare(`
      INSERT INTO products (
        barcode, name_en, name_ta, category_id, hsn_code, unit,
        cost_price, selling_price, mrp, discount_percent, gst_rate,
        cess_rate, stock_quantity, min_stock_alert, is_loose_item, is_quick_item
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Unique barcode generator helper
    const generateUniqueBarcode = () => {
      let candidate;
      let exists;
      do {
        candidate = 'GCR' + Math.floor(10000000 + Math.random() * 90000000);
        exists = checkStmt.get(candidate);
      } while (exists);
      return candidate;
    };

    db.exec('BEGIN TRANSACTION;');
    try {
      for (let i = 0; i < items.length; i++) {
        try {
          const item = items[i];
          const rawTa = item.name_ta || item.name_en || '';
          const rawEn = item.name_en || item.name_ta || '';
          
          let name_ta = cleanTamilText(rawTa);
          let name_en = String(rawEn || name_ta).trim();
          if (!name_ta) name_ta = name_en;

          let selling_price = Number(item.selling_price || item.price || 0);
          const mrp = Number(item.mrp || selling_price);
          const cost_price = Number(item.cost_price || 0);

          // If selling price is 0, fall back to MRP or cost price
          if (isNaN(selling_price) || selling_price <= 0) {
            if (!isNaN(mrp) && mrp > 0) selling_price = mrp;
            else if (!isNaN(cost_price) && cost_price > 0) selling_price = cost_price;
          }

          if (!name_ta && !name_en) {
            skippedCount++;
            errors.push(`Row ${i + 1}: Name is required`);
            continue;
          }

          if (isNaN(selling_price) || selling_price <= 0) {
            skippedCount++;
            errors.push(`Row ${i + 1} (${name_en || name_ta}): Valid selling price is required`);
            continue;
          }

          const hsn_code = (item.hsn_code || '1006').toString().trim();
          const unit = (item.unit || 'kg').toString().trim().toLowerCase();
          const gst_rate = Number(item.gst_rate !== undefined ? item.gst_rate : 5);
          const stock_quantity = Number(item.stock_quantity !== undefined ? item.stock_quantity : 100);
          const min_stock_alert = Number(item.min_stock_alert !== undefined ? item.min_stock_alert : 10);

          let barcode = item.barcode ? item.barcode.toString().trim() : '';
          // Clean scientific notation or float barcode string e.g. "8.90103E+12"
          if (barcode.includes('e+') || barcode.includes('E+')) {
            const num = Number(barcode);
            if (!isNaN(num)) barcode = BigInt(Math.round(num)).toString();
          }

          if (barcode) {
            const existing = checkStmt.get(barcode);
            if (existing) {
              updateStmt.run(
                name_en,
                name_ta,
                hsn_code,
                unit,
                cost_price,
                selling_price,
                mrp,
                gst_rate,
                stock_quantity,
                min_stock_alert,
                barcode
              );
              updatedCount++;
              continue;
            }
          } else {
            barcode = generateUniqueBarcode();
          }

          insertStmt.run(
            barcode,
            name_en,
            name_ta,
            item.category_id ? Number(item.category_id) : null,
            hsn_code,
            unit,
            cost_price,
            selling_price,
            mrp,
            0,
            gst_rate,
            0,
            stock_quantity,
            min_stock_alert,
            item.is_loose_item ? 1 : 0,
            item.is_quick_item ? 1 : 0
          );
          insertedCount++;
        } catch (rowErr) {
          skippedCount++;
          errors.push(`Row ${i + 1}: ${rowErr.message}`);
        }
      }
      db.exec('COMMIT;');
    } catch (txnErr) {
      db.exec('ROLLBACK;');
      throw txnErr;
    }

    res.json({
      success: true,
      message: `Import completed! Inserted: ${insertedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`,
      data: { insertedCount, updatedCount, skippedCount, errors: errors.slice(0, 10) }
    });
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

// Completely delete all products (Admin only)
router.delete('/', (req, res) => {
  try {
    db.prepare('DELETE FROM products').run();
    res.json({ success: true, message: 'All products have been deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
