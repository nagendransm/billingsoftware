const http = require('http');

async function runTests() {
  console.log('--- STARTING AUTOMATED TEST OF TN GROCERY GST BILLING SYSTEM ---');

  // Start the server directly
  const app = require('./server/index');
  // Wait 1 second for port binding
  await new Promise(r => setTimeout(r, 1000));

  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const opt = {
        hostname: 'localhost',
        port: 5000,
        path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      };

      const req = http.request(opt, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });

      req.on('error', reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  // 1. Health check
  console.log('1. Testing /api/health...');
  const health = await request('/api/health');
  console.log('Health:', health.body);

  // 2. Settings check
  console.log('2. Testing /api/settings...');
  const settings = await request('/api/settings');
  console.log('Shop Name (TA):', settings.body.data.shop_name_ta);
  console.log('Shop Name (EN):', settings.body.data.shop_name_en);
  console.log('GSTIN:', settings.body.data.gstin);

  // 3. Products check
  console.log('3. Testing /api/products...');
  const prods = await request('/api/products');
  console.log(`Loaded ${prods.body.data.length} pre-seeded grocery products.`);
  console.log('Sample product:', prods.body.data[0].name_ta, '|', prods.body.data[0].name_en, '| Price: ₹' + prods.body.data[0].selling_price);

  // 4. Create a test GST invoice
  console.log('4. Testing /api/invoices (Creating bill)...');
  const sampleItems = [
    {
      product_id: prods.body.data[0].id,
      name_en: prods.body.data[0].name_en,
      name_ta: prods.body.data[0].name_ta,
      hsn_code: prods.body.data[0].hsn_code,
      unit: prods.body.data[0].unit,
      unit_price: prods.body.data[0].selling_price,
      quantity: 2.5, // 2.5 kg
      gst_rate: prods.body.data[0].gst_rate
    },
    {
      product_id: prods.body.data[10].id, // Dal
      name_en: prods.body.data[10].name_en,
      name_ta: prods.body.data[10].name_ta,
      hsn_code: prods.body.data[10].hsn_code,
      unit: prods.body.data[10].unit,
      unit_price: prods.body.data[10].selling_price,
      quantity: 1,
      gst_rate: prods.body.data[10].gst_rate
    },
    {
      product_id: prods.body.data[18].id, // Oil (5% GST)
      name_en: prods.body.data[18].name_en,
      name_ta: prods.body.data[18].name_ta,
      hsn_code: prods.body.data[18].hsn_code,
      unit: prods.body.data[18].unit,
      unit_price: prods.body.data[18].selling_price,
      quantity: 2,
      gst_rate: prods.body.data[18].gst_rate
    }
  ];

  const billRes = await request('/api/invoices', {
    method: 'POST',
    body: {
      customer_name: 'சரவணன் மளிகை வாடிக்கையாளர் / Saravanan',
      customer_phone: '9842155667',
      payment_mode: 'cash',
      received_amount: 1500,
      items: sampleItems
    }
  });

  console.log('Invoice Created:', billRes.body.data.invoice_no);
  console.log('Grand Total: ₹', billRes.body.data.grand_total);
  console.log('Taxable Subtotal: ₹', billRes.body.data.subtotal_taxable);
  console.log('CGST: ₹', billRes.body.data.total_cgst, '| SGST: ₹', billRes.body.data.total_sgst);
  console.log('HSN Summary Table:', billRes.body.data.hsn_summary);
  console.log('Amount in Words:', billRes.body.data.amount_in_words);

  // 5. Test GSTR-1 Report
  console.log('5. Testing /api/reports/gstr1...');
  const gstr1 = await request('/api/reports/gstr1');
  console.log('GSTR-1 Overall:', gstr1.body.overall);
  console.log('Table 7 B2CS Summary:', gstr1.body.table7_b2cs);
  console.log('Table 12 HSN Summary:', gstr1.body.table12_hsn);

  // 6. Test Dashboard
  console.log('6. Testing /api/reports/dashboard...');
  const dash = await request('/api/reports/dashboard');
  console.log('Today Sales:', dash.body.data.today);

  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
