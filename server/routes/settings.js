const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all settings as key-value map
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update settings
router.post('/', (req, res) => {
  try {
    const updates = req.body;
    const upsert = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, String(value));
    }

    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }

    res.json({ success: true, data: settings, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
