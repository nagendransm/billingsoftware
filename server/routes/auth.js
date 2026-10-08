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

// Get current users list
router.get('/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, username, role, name, created_at FROM users ORDER BY id ASC').all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new user
router.post('/users', (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'Username, password, and name are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanRole = (role === 'admin') ? 'admin' : 'user';

    if (cleanUsername === 'root') {
      return res.status(400).json({ success: false, message: 'Cannot create root account. Root account is already reserved.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const result = db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run(
      cleanUsername,
      password,
      cleanRole,
      name.trim()
    );

    res.json({
      success: true,
      message: 'User created successfully',
      data: {
        id: Number(result.lastInsertRowid),
        username: cleanUsername,
        role: cleanRole,
        name: name.trim()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user (change role, name, or password)
router.put('/users/:id', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { name, role, password } = req.body;

    const user = db.prepare('SELECT id, username, role, name FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let targetRole = user.role;
    if (user.role === 'root') {
      // Root cannot have role changed
      targetRole = 'root';
    } else if (role) {
      targetRole = (role === 'admin') ? 'admin' : 'user';
    }

    const targetName = (name && name.trim()) ? name.trim() : user.name;

    if (password && password.trim()) {
      db.prepare('UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?').run(targetName, targetRole, password.trim(), userId);
    } else {
      db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(targetName, targetRole, userId);
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { id: userId, username: user.username, role: targetRole, name: targetName }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete user
router.delete('/users/:id', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'root' || user.username.toLowerCase() === 'root') {
      return res.status(403).json({ success: false, message: 'Master Root account cannot be deleted.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ success: true, message: `User '${user.username}' deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update password (legacy)
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

