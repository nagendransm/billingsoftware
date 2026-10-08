const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/subgroups', require('./routes/subgroups'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Tamil Nadu Grocery GST Billing System',
    state_code: '33',
    time: new Date().toISOString()
  });
});

// Serve static frontend in production if built
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Universal fallback for SPA
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(clientDist, 'index.html');
    return res.sendFile(indexPath, err => {
      if (err) {
        res.status(200).send('API Server running. Please build client or run Vite dev server.');
      }
    });
  }
  next();
});

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛒 தமிழ் & English GST Grocery Billing Server running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🏷️ State: 33 - Tamil Nadu (CGST + SGST Support)`);
  console.log(`=======================================================`);
});

module.exports = server;
