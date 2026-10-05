const express = require('express');
const router = express.Router();
const db = require('../db');

// Login endpoint
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = db.prepare('SELECT id, username, role, name, password FROM users WHERE username = ?').get(username.trim());
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current users list (for admin)
router.get('/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, username, role, name, created_at FROM users ORDER BY id ASC').all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update password
router.post('/change-password', (req, res) => {
  try {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
      return res.status(400).json({ success: false, message: 'Username and new password required' });
    }
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newPassword, username);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
