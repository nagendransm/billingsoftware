const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateItemGst, calculateBillTotals, generateHsnSummary, numberToWordsINR } = require('../gstEngine');

// Create a new invoice (Estimate, Tax Invoice, or Return Bill)
router.post('/', (req, res) => {
  try {
    const {
      bill_type = 'tax_invoice', // 'estimate', 'tax_invoice', 'return_bill'
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

    // Determine invoice number according to bill_type
    let invoiceNo = '';
    if (bill_type === 'estimate') {
      const lastEst = db.prepare("SELECT invoice_no FROM invoices WHERE invoice_no LIKE 'EST/%' ORDER BY id DESC LIMIT 1").get();
      let estSeq = 1001;
      if (lastEst && lastEst.invoice_no) {
        const m = lastEst.invoice_no.match(/(\d+)$/);
        if (m) estSeq = parseInt(m[1], 10) + 1;
      }
      invoiceNo = `EST/${estSeq}`;
    } else if (bill_type === 'return_bill') {
      const lastRet = db.prepare("SELECT invoice_no FROM invoices WHERE invoice_no LIKE 'RET/%' ORDER BY id DESC LIMIT 1").get();
      let retSeq = 1001;
      if (lastRet && lastRet.invoice_no) {
        const m = lastRet.invoice_no.match(/(\d+)$/);
        if (m) retSeq = parseInt(m[1], 10) + 1;
      }
      invoiceNo = `RET/${retSeq}`;
    } else {
      // Standard GST Tax Invoice
      const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'bill_prefix'").get();
      const nextSeqRow = db.prepare("SELECT value FROM settings WHERE key = 'next_bill_number'").get();
      const prefix = prefixRow && prefixRow.value ? prefixRow.value : 'BILL/';
      const seq = nextSeqRow ? parseInt(nextSeqRow.value, 10) : 1001;
      invoiceNo = `${prefix}${seq}`;
      db.prepare("UPDATE settings SET value = ? WHERE key = 'next_bill_number'").run(String(seq + 1));
    }

    // Date & Time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toLocaleTimeString('en-IN', { hour12: true });

    // Calculate each item's tax details
    let processedItems = [];
    let totals;

    if (bill_type === 'estimate' || bill_type === 'return_bill') {
      // Estimate bill or Return bill: "no need apply tax"
      processedItems = items.map(item => {
        const unitPrice = Number(item.unit_price);
        const qty = Number(item.quantity);
        const discPercent = Number(item.discount_percent || 0);
        const gross = unitPrice * qty;
        const discAmt = Number(((gross * discPercent) / 100).toFixed(2));
        const effectiveTotal = Number((gross - discAmt).toFixed(2));

        return {
          ...item,
          unit_price: unitPrice,
          quantity: qty,
          discount_percent: discPercent,
          taxable_value: effectiveTotal,
          gst_rate: 0,
          cgst_rate: 0,
          cgst_amount: 0,
          sgst_rate: 0,
          sgst_amount: 0,
          igst_rate: 0,
          igst_amount: 0,
          cess_rate: 0,
          cess_amount: 0,
          total: effectiveTotal
        };
      });

      const grossSum = processedItems.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
      const itemDiscSum = processedItems.reduce((acc, it) => acc + (it.unit_price * it.quantity * (it.discount_percent / 100)), 0);
      const totalDisc = itemDiscSum + Number(additional_discount || 0);
      const netBeforeRound = Math.max(0, grossSum - totalDisc);
      const grandTotal = Math.round(netBeforeRound);
      const roundOff = Number((grandTotal - netBeforeRound).toFixed(2));

      totals = {
        subtotalTaxable: Number(netBeforeRound.toFixed(2)),
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalDiscount: Number(totalDisc.toFixed(2)),
        roundOff,
        grandTotal
      };
    } else {
      // Standard GST Tax Invoice
      processedItems = items.map(item => {
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

      totals = calculateBillTotals(processedItems, { additionalDiscount: additional_discount });
    }

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
        discount_amount, round_off, grand_total, received_amount, change_amount, notes,
        bill_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      notes,
      bill_type
    );

    const invoiceId = result.lastInsertRowid;

    // Insert invoice items
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, product_id, barcode, name_en, name_ta, hsn_code, unit,
        quantity, unit_price, mrp, discount_percent, taxable_value, gst_rate,
        cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount,
        cess_rate, cess_amount, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // For return bills: stock is restored/added back.
    // For sales bills (tax or estimate): stock is deducted.
    const updateStockDeduct = db.prepare(`
      UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?
    `);
    const updateStockAdd = db.prepare(`
      UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?
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

      // Update stock if product_id is linked
      if (item.product_id) {
        if (bill_type === 'return_bill') {
          updateStockAdd.run(item.quantity, Number(item.product_id));
        } else {
          updateStockDeduct.run(item.quantity, Number(item.product_id));
        }
      }
    }

    // Capture previous balance before updating customer credit balance
    let previousBalance = 0;
    if (customer_id) {
      const custRow = db.prepare('SELECT credit_balance FROM customers WHERE id = ?').get(customer_id);
      if (custRow) previousBalance = Number(custRow.credit_balance || 0);
    }

    // Handle credit ledger if payment mode is credit (Khata / கடன்)
    if (payment_mode === 'credit' && customer_id) {
      if (bill_type === 'return_bill') {
        db.prepare(`
          INSERT INTO credit_transactions (customer_id, invoice_id, type, amount, notes, date)
          VALUES (?, ?, 'credit', ?, ?, ?)
        `).run(Number(customer_id), invoiceId, grandTotal, `Return Bill #${invoiceNo}`, dateStr);

        db.prepare(`
          UPDATE customers SET credit_balance = credit_balance - ? WHERE id = ?
        `).run(grandTotal, Number(customer_id));
      } else {
        db.prepare(`
          INSERT INTO credit_transactions (customer_id, invoice_id, type, amount, notes, date)
          VALUES (?, ?, 'debit', ?, ?, ?)
        `).run(Number(customer_id), invoiceId, grandTotal, `Bill #${invoiceNo}`, dateStr);

        db.prepare(`
          UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ?
        `).run(grandTotal, Number(customer_id));
      }
    }

    // Fetch full invoice record
    const createdInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    const hsnSummary = generateHsnSummary(invoiceItems);
    const amountInWords = numberToWordsINR(grandTotal);

    res.json({
      success: true,
      data: {
        ...createdInvoice,
        previous_balance: previousBalance,
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
    const { start_date, end_date, date, invoice_no, customer_name, search, payment_mode, bill_type, page = 1, limit = 50 } = req.query;
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (date) {
      let normalizedDate = String(date).trim();
      // Support DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY
      const dmy = normalizedDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (dmy) {
        const day = dmy[1].padStart(2, '0');
        const month = dmy[2].padStart(2, '0');
        let year = dmy[3];
        if (year.length === 2) year = '20' + year;
        normalizedDate = `${year}-${month}-${day}`;
      }
      query += ' AND date = ?';
      params.push(normalizedDate);
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
    if (bill_type) {
      query += ' AND bill_type = ?';
      params.push(bill_type);
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

    let previousBalance = 0;
    if (invoice.customer_id) {
      const custRow = db.prepare('SELECT credit_balance FROM customers WHERE id = ?').get(invoice.customer_id);
      if (custRow) {
        previousBalance = invoice.payment_mode === 'credit'
          ? Math.max(0, Number(custRow.credit_balance || 0) - Number(invoice.grand_total || 0))
          : Number(custRow.credit_balance || 0);
      }
    }

    res.json({
      success: true,
      data: {
        ...invoice,
        previous_balance: previousBalance,
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

    // Update inventory based on bill_type
    const items = db.prepare('SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?').all(id);
    const restoreStock = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?');
    const deductStock = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?');

    for (const item of items) {
      if (item.product_id) {
        if (invoice.bill_type === 'return_bill') {
          // If return bill is cancelled, stock that was returned must be removed
          deductStock.run(item.quantity, item.product_id);
        } else {
          // If sales bill is cancelled, stock is restored back
          restoreStock.run(item.quantity, item.product_id);
        }
      }
    }

    // Reverse credit ledger if credit purchase / return
    if (invoice.payment_mode === 'credit' && invoice.customer_id) {
      if (invoice.bill_type === 'return_bill') {
        db.prepare(`
          INSERT INTO credit_transactions (customer_id, invoice_id, type, amount, notes, date)
          VALUES (?, ?, 'debit', ?, 'Return Bill Cancelled Reversal', date('now'))
        `).run(invoice.customer_id, id, invoice.grand_total);

        db.prepare(`
          UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ?
        `).run(invoice.grand_total, invoice.customer_id);
      } else {
        db.prepare(`
          INSERT INTO credit_transactions (customer_id, invoice_id, type, amount, notes, date)
          VALUES (?, ?, 'credit', ?, 'Invoice Cancelled Reversal', date('now'))
        `).run(invoice.customer_id, id, invoice.grand_total);

        db.prepare(`
          UPDATE customers SET credit_balance = credit_balance - ? WHERE id = ?
        `).run(invoice.grand_total, invoice.customer_id);
      }
    }

    // Mark cancelled
    db.prepare("UPDATE invoices SET payment_status = 'cancelled', notes = coalesce(notes, '') || ' [CANCELLED]' WHERE id = ?").run(id);

    res.json({ success: true, message: 'Invoice cancelled successfully and inventory adjusted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
