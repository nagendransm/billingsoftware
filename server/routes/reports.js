const express = require('express');
const router = express.Router();
const db = require('../db');

// Dashboard statistics
router.get('/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's summary
    const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(subtotal_taxable), 0) as total_taxable,
        COALESCE(SUM(total_cgst), 0) as total_cgst,
        COALESCE(SUM(total_sgst), 0) as total_sgst,
        COALESCE(SUM(total_igst), 0) as total_igst,
        COALESCE(SUM(discount_amount), 0) as total_discount
      FROM invoices
      WHERE date = ? AND payment_status != 'cancelled'
    `).get(today);

    // Payment mode breakdown today
    const paymentBreakdown = db.prepare(`
      SELECT payment_mode, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as amount
      FROM invoices
      WHERE date = ? AND payment_status != 'cancelled'
      GROUP BY payment_mode
    `).all(today);

    // Low stock items count
    const lowStock = db.prepare(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE stock_quantity <= min_stock_alert
    `).get();

    // Total products & inventory value
    const inventoryVal = db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        COALESCE(SUM(stock_quantity * cost_price), 0) as total_cost_value,
        COALESCE(SUM(stock_quantity * selling_price), 0) as total_retail_value
      FROM products
    `).get();

    // Top selling items today
    const topItems = db.prepare(`
      SELECT 
        ii.name_en, ii.name_ta, ii.unit,
        SUM(ii.quantity) as total_qty,
        SUM(ii.total) as total_amount
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.date = ? AND i.payment_status != 'cancelled'
      GROUP BY ii.name_en, ii.name_ta, ii.unit
      ORDER BY total_amount DESC
      LIMIT 6
    `).all(today);

    // Recent 5 bills
    const recentBills = db.prepare(`
      SELECT id, invoice_no, time, customer_name, payment_mode, grand_total, payment_status
      FROM invoices
      WHERE date = ?
      ORDER BY id DESC
      LIMIT 5
    `).all(today);

    res.json({
      success: true,
      data: {
        today: todayStats,
        paymentBreakdown,
        lowStockCount: lowStock.count,
        inventory: inventoryVal,
        topItems,
        recentBills
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Daily Sales & Tax Register for a date range
router.get('/daily-register', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];

    const start = start_date || defaultStart;
    const end = end_date || defaultEnd;

    const rows = db.prepare(`
      SELECT 
        date,
        COUNT(*) as bill_count,
        COALESCE(SUM(subtotal_taxable), 0) as taxable_value,
        COALESCE(SUM(total_cgst), 0) as cgst,
        COALESCE(SUM(total_sgst), 0) as sgst,
        COALESCE(SUM(total_igst), 0) as igst,
        COALESCE(SUM(total_cgst + total_sgst + total_igst), 0) as total_tax,
        COALESCE(SUM(discount_amount), 0) as discount,
        COALESCE(SUM(grand_total), 0) as net_sales
      FROM invoices
      WHERE date >= ? AND date <= ? AND payment_status != 'cancelled'
      GROUP BY date
      ORDER BY date DESC
    `).all(start, end);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GSTR-1 Sales Report (Tamil Nadu Grocery GST compliant)
router.get('/gstr1', (req, res) => {
  try {
    const { month, year, start_date, end_date } = req.query;
    let start, end;

    if (start_date && end_date) {
      start = start_date;
      end = end_date;
    } else {
      const now = new Date();
      const y = year ? parseInt(year, 10) : now.getFullYear();
      const m = month ? parseInt(month, 10) : (now.getMonth() + 1);
      const padM = String(m).padStart(2, '0');
      start = `${y}-${padM}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      end = `${y}-${padM}-${String(lastDay).padStart(2, '0')}`;
    }

    // 1. Table 7: B2CS Summary (Unregistered Customers grouped by GST Rate)
    const b2csSummary = db.prepare(`
      SELECT 
        ii.gst_rate,
        '33-Tamil Nadu' as place_of_supply,
        'OE' as supply_type,
        ROUND(SUM(ii.taxable_value), 2) as taxable_value,
        ROUND(SUM(ii.cgst_amount), 2) as central_tax,
        ROUND(SUM(ii.sgst_amount), 2) as state_tax,
        ROUND(SUM(ii.igst_amount), 2) as integrated_tax,
        0 as cess_amount,
        ROUND(SUM(ii.total), 2) as total_value
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.date >= ? AND i.date <= ? 
        AND i.payment_status != 'cancelled'
        AND (i.customer_gstin IS NULL OR trim(i.customer_gstin) = '')
      GROUP BY ii.gst_rate
      ORDER BY ii.gst_rate ASC
    `).all(start, end);

    // 2. Table 4: B2B Invoices (Registered Customers with GSTIN)
    const b2bInvoices = db.prepare(`
      SELECT 
        i.customer_gstin,
        i.customer_name,
        i.invoice_no,
        i.date as invoice_date,
        i.grand_total as invoice_value,
        i.place_of_supply,
        'N' as reverse_charge,
        'Regular' as invoice_type,
        ROUND(SUM(ii.taxable_value), 2) as taxable_value,
        ROUND(SUM(ii.cgst_amount), 2) as central_tax,
        ROUND(SUM(ii.sgst_amount), 2) as state_tax,
        ROUND(SUM(ii.igst_amount), 2) as integrated_tax,
        0 as cess
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      WHERE i.date >= ? AND i.date <= ?
        AND i.payment_status != 'cancelled'
        AND i.customer_gstin IS NOT NULL AND trim(i.customer_gstin) != ''
      GROUP BY i.id
      ORDER BY i.date DESC
    `).all(start, end);

    // 3. Table 12: HSN Summary of Outward Supplies
    const hsnSummary = db.prepare(`
      SELECT 
        ii.hsn_code,
        min(ii.name_en) as description_en,
        min(ii.name_ta) as description_ta,
        CASE 
          WHEN ii.unit = 'kg' THEN 'KGS-KILOGRAMS'
          WHEN ii.unit = 'ltr' THEN 'LTR-LITRES'
          WHEN ii.unit = 'pkt' THEN 'PAC-PACKS'
          ELSE 'NOS-NUMBERS'
        END as uqc,
        ROUND(SUM(ii.quantity), 2) as total_quantity,
        ROUND(SUM(ii.total), 2) as total_value,
        ROUND(SUM(ii.taxable_value), 2) as taxable_value,
        ii.gst_rate,
        ROUND(SUM(ii.cgst_amount), 2) as central_tax,
        ROUND(SUM(ii.sgst_amount), 2) as state_tax,
        ROUND(SUM(ii.igst_amount), 2) as integrated_tax,
        0 as cess_amount
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.date >= ? AND i.date <= ? AND i.payment_status != 'cancelled'
      GROUP BY ii.hsn_code, ii.gst_rate
      ORDER BY ii.hsn_code ASC
    `).all(start, end);

    // Overall Totals
    const overall = db.prepare(`
      SELECT 
        COUNT(DISTINCT i.id) as total_invoices,
        ROUND(COALESCE(SUM(ii.taxable_value), 0), 2) as total_taxable_value,
        ROUND(COALESCE(SUM(ii.cgst_amount), 0), 2) as total_cgst,
        ROUND(COALESCE(SUM(ii.sgst_amount), 0), 2) as total_sgst,
        ROUND(COALESCE(SUM(ii.igst_amount), 0), 2) as total_igst,
        ROUND(COALESCE(SUM(ii.cgst_amount + ii.sgst_amount + ii.igst_amount), 0), 2) as total_tax,
        ROUND(COALESCE(SUM(ii.total), 0), 2) as total_invoice_value
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.date >= ? AND i.date <= ? AND i.payment_status != 'cancelled'
    `).get(start, end);

    res.json({
      success: true,
      period: { start, end },
      overall,
      table7_b2cs: b2csSummary,
      table4_b2b: b2bInvoices,
      table12_hsn: hsnSummary
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stock status & low stock alert report
router.get('/stock', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name_en as category_name_en, c.name_ta as category_name_ta,
        (p.stock_quantity * p.cost_price) as stock_cost_value,
        (p.stock_quantity * p.selling_price) as stock_retail_value,
        CASE WHEN p.stock_quantity <= p.min_stock_alert THEN 1 ELSE 0 END as is_low_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY is_low_stock DESC, p.stock_quantity ASC
    `).all();

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
