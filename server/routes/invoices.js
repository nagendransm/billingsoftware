const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateItemGst, calculateBillTotals, generateHsnSummary, numberToWordsINR } = require('../gstEngine');

// Create a new GST invoice
router.post('/', (req, res) => {
  try {
    const {
      customer_id,
      customer_name = 'Retail Cash Customer / ரொக்க வாடிக்கையாளர்',
      customer_phone = '',
      customer_gstin = '',
      place_of_supply = '33-Tamil Nadu',
      payment_mode = 'cash', // 'cash', 'upi', 'card', 'credit'
      received_amount = 0,
      additional_discount = 0,
      notes = '',
      items = []
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot create bill with empty items' });
    }

    // Determine if inter-state (Outside Tamil Nadu)
    const isInterState = customer_gstin && !customer_gstin.startsWith('33') ? 1 : 0;

    // Fetch settings for bill number generation
    const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'bill_prefix'").get();
    const nextSeqRow = db.prepare("SELECT value FROM settings WHERE key = 'next_bill_number'").get();
    const prefix = prefixRow && prefixRow.value ? prefixRow.value : 'BILL/';
    const seq = nextSeqRow ? parseInt(nextSeqRow.value, 10) : 1001;
    const invoiceNo = `${prefix}${seq}`;

    // Date & Time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toLocaleTimeString('en-IN', { hour12: true });

    // Calculate each item's tax details
    const processedItems = items.map(item => {
      const calc = calculateItemGst({
        unitPrice: Number(item.unit_price),
        quantity: Number(item.quantity),
        discountPercent: Number(item.discount_percent || 0),
        gstRate: Number(item.gst_rate || 0),
        isTaxInclusive: true, // Groceries standard MRP inclusive
        placeOfSupply: isInterState ? 'other' : '33'
      });

      return {
        ...item,
        unit_price: Number(item.unit_price),
        quantity: Number(item.quantity),
        discount_percent: Number(item.discount_percent || 0),
        taxable_value: calc.taxableValue,
        gst_rate: calc.gstRate,
        cgst_rate: calc.cgstRate,
        cgst_amount: calc.cgstAmount,
        sgst_rate: calc.sgstRate,
        sgst_amount: calc.sgstAmount,
        igst_rate: calc.igstRate,
        igst_amount: calc.igstAmount,
        cess_rate: 0,
        cess_amount: 0,
        total: calc.total
      };
    });

    // Calculate invoice overall totals
    const totals = calculateBillTotals(processedItems, { additionalDiscount: additional_discount });
    const grandTotal = totals.grandTotal;
    const received = Number(received_amount) || grandTotal;
    const change = Math.max(0, received - grandTotal);
    const paymentStatus = payment_mode === 'credit' ? 'pending' : 'paid';

    // Insert invoice header
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        invoice_no, date, time, customer_id, customer_name, customer_phone,
        customer_gstin, place_of_supply, is_inter_state, payment_mode, payment_status,
        subtotal_taxable, total_cgst, total_sgst, total_igst, total_cess,
        discount_amount, round_off, grand_total, received_amount, change_amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertInvoice.run(
      invoiceNo,
      dateStr,
      timeStr,
      customer_id ? Number(customer_id) : null,
      customer_name,
      customer_phone,
      customer_gstin,
      place_of_supply,
      isInterState,
      payment_mode,
      paymentStatus,
      totals.subtotalTaxable,
      totals.totalCgst,
      totals.totalSgst,
      totals.totalIgst,
      0,
      totals.totalDiscount,
      totals.roundOff,
      grandTotal,
      received,
      change,
      notes
    );

    const invoiceId = result.lastInsertRowid;

    // Insert invoice items & decrement product stock
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, product_id, barcode, name_en, name_ta, hsn_code, unit,
        quantity, unit_price, mrp, discount_percent, taxable_value, gst_rate,
        cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount,
        cess_rate, cess_amount, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?
    `);

    for (const item of processedItems) {
      insertItem.run(
        invoiceId,
        item.product_id ? Number(item.product_id) : null,
        item.barcode || '',
        item.name_en,
        item.name_ta,
        item.hsn_code,
        item.unit || 'kg',
        item.quantity,
        item.unit_price,
        item.mrp || item.unit_price,
        item.discount_percent || 0,
        item.taxable_value,
        item.gst_rate,
        item.cgst_rate,
        item.cgst_amount,
        item.sgst_rate,
        item.sgst_amount,
        item.igst_rate,
        item.igst_amount,
        0,
        0,
        item.total
      );

      // Decrement stock if product_id is linked
      if (item.product_id) {
        updateStock.run(item.quantity, Number(item.product_id));
      }
    }

    // Handle credit ledger if payment mode is credit (Khata / கடன்)
    if (payment_mode === 'credit' && customer_id) {
      db.prepare(`
        INSERT INTO credit_transactions (customer_id, invoice_id, type, amount, notes, date)
        VALUES (?, ?, 'debit', ?, ?, ?)
      `).run(Number(customer_id), invoiceId, grandTotal, `Bill #${invoiceNo}`, dateStr);

      db.prepare(`
        UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ?
      `).run(grandTotal, Number(customer_id));
    }

    // Increment next bill number
    db.prepare("UPDATE settings SET value = ? WHERE key = 'next_bill_number'").run(String(seq + 1));

    // Fetch full invoice record
    const createdInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    const hsnSummary = generateHsnSummary(invoiceItems);
    const amountInWords = numberToWordsINR(grandTotal);

    res.json({
      success: true,
      data: {
        ...createdInvoice,
        items: invoiceItems,
        hsn_summary: hsnSummary,
        amount_in_words: amountInWords
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List invoices with pagination and filters
router.get('/', (req, res) => {
  try {
    const { start_date, end_date, date, invoice_no, customer_name, search, payment_mode, page = 1, limit = 50 } = req.query;
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }
    if (invoice_no) {
      query += ' AND invoice_no LIKE ?';
      params.push(`%${invoice_no}%`);
    }
    if (customer_name) {
      query += ' AND (customer_name LIKE ? OR customer_phone LIKE ?)';
      const cn = `%${customer_name}%`;
      params.push(cn, cn);
    }
    if (search) {
      query += ' AND (invoice_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (payment_mode) {
      query += ' AND payment_mode = ?';
      params.push(payment_mode);
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const invoices = db.prepare(query).all(...params);
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single invoice by ID with all items & HSN summary
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
    const hsnSummary = generateHsnSummary(items);
    const amountInWords = numberToWordsINR(invoice.grand_total);

    // Get settings for receipt header
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of settingsRows) {
      settings[r.key] = r.value;
    }

    res.json({
      success: true,
      data: {
        ...invoice,
        items,
        hsn_summary: hsnSummary,
        amount_in_words: amountInWords,
        store: settings
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel / Void invoice and restore inventory
router.post('/:id/cancel', (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (invoice.payment_status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Invoice is already cancelled' });
    }

    // Restore inventory
    const items = db.prepare('SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?').all(id);
    const restoreStock = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?');
    for (const item of items) {
      if (item.product_id) {
        restoreStock.run(item.quantity, item.product_id);
      }
    }

    // Reverse credit ledger if credit purchase
    if (invoice.payment_mode === 'credit' && invoice.customer_id) {
      db.prepare(`
        INSERT INTO credit_transactions (customer_id, invoice_id, type, amount, notes, date)
        VALUES (?, ?, 'credit', ?, 'Invoice Cancelled Reversal', date('now'))
      `).run(invoice.customer_id, id, invoice.grand_total);

      db.prepare(`
        UPDATE customers SET credit_balance = credit_balance - ? WHERE id = ?
      `).run(invoice.grand_total, invoice.customer_id);
    }

    // Mark cancelled
    db.prepare("UPDATE invoices SET payment_status = 'cancelled', notes = coalesce(notes, '') || ' [CANCELLED]' WHERE id = ?").run(id);

    res.json({ success: true, message: 'Invoice cancelled successfully and inventory restored' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
