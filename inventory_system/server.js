require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const session = require('express-session');

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'inventory_super_secure_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 3600000 } // 8-hour session
}));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_db',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use('/', express.static(path.join(__dirname, 'public')));

// ==================== AUTH MIDDLEWARE ====================

function checkAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

// ==================== AUTHENTICATION ====================

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1',
      [username, password]
    );

    if (rows.length === 0) {
      // Log failed login
      await pool.query(
        'INSERT INTO login_logs (username, success, ip_address) VALUES (?, 0, ?)',
        [username, req.ip]
      ).catch(() => {}); // Don't fail if log table doesn't exist yet
      return res.status(401).json({ error: 'Invalid credentials or account inactive' });
    }

    const user = rows[0];
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.managerId = user.manager_id;
    req.session.warehouseId = user.warehouse_id;
    req.session.fullname = user.fullname;

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Log login
    await pool.query(
      'INSERT INTO login_logs (username, success, ip_address, user_id) VALUES (?, 1, ?, ?)',
      [username, req.ip, user.id]
    ).catch(() => {});

    res.json({
      success: true,
      username: user.username,
      fullname: user.fullname,
      role: user.role
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', checkAuth, (req, res) => {
  const userId = req.session.userId;
  req.session.destroy(async (err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    await pool.query(
      'INSERT INTO login_logs (user_id, username, success, notes) VALUES (?, ?, 2, "logout")',
      [userId, 'logout']
    ).catch(() => {});
    res.json({ success: true });
  });
});

app.get('/api/user', checkAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    username: req.session.username,
    fullname: req.session.fullname,
    role: req.session.role,
    warehouseId: req.session.warehouseId
  });
});

// ==================== SSE EVENTS ====================
let sseClients = [];
app.get('/api/events', checkAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  const client = {
    id: Date.now() + Math.random(),
    res,
    role: req.session.role,
    warehouseId: req.session.warehouseId,
    managerId: req.session.managerId
  };
  sseClients.push(client);
  req.on('close', () => { sseClients = sseClients.filter(c => c.id !== client.id); });
});

function emitStockEvent(warehouse_id, itemName, message, type = 'stock_update') {
  sseClients.forEach(c => {
    let send = false;
    if (c.role === 'admin') send = true;
    else if (c.role === 'manager') send = true; // Managers get all for now, or filter on UI
    else if (c.role === 'user' && c.warehouseId === warehouse_id) send = true;
    
    if (send) {
      c.res.write(`data: ${JSON.stringify({ type, message, warehouse_id, itemName })}\n\n`);
    }
  });
}

// ==================== DASHBOARD (KPIs) ====================

app.get('/api/dashboard', checkAuth, async (req, res) => {
  try {
    const role = req.session.role;
    const userId = req.session.userId;
    const warehouseId = req.session.warehouseId;

    // Total unique inventory items
    const [itemCount] = await pool.query(
      `SELECT COUNT(*) as count FROM inventory WHERE is_active = 1`
    );

    // Total warehouses
    const [whCount] = await pool.query(
      `SELECT COUNT(*) as count FROM warehouses WHERE is_active = 1`
    );

    // Total users
    const [userCount] = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND role != 'admin'`
    );

    // Active users (logged in last 24h)
    const [activeUserCount] = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND last_login > NOW() - INTERVAL 1 DAY`
    );

    // Stock metrics (role-filtered)
    let stockFilter = '';
    let stockParams = [];
    if (role === 'manager') {
      stockFilter = 'WHERE w.manager_id = ?';
      stockParams = [userId];
    } else if (role === 'user') {
      stockFilter = 'WHERE w.id = ?';
      stockParams = [warehouseId];
    }

    const [stockMetrics] = await pool.query(`
      SELECT
        COALESCE(SUM(s.quantity), 0) as total_units,
        COALESCE(SUM(s.quantity * i.unit_price), 0) as total_value,
        SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN s.quantity > 0 AND s.quantity < i.reorder_level THEN 1 ELSE 0 END) as low_stock,
        COUNT(DISTINCT s.inventory_id) as stocked_items
      FROM stock s
      JOIN inventory i ON s.inventory_id = i.id
      JOIN warehouses w ON s.warehouse_id = w.id
      ${stockFilter}
    `, stockParams);

    // Top 5 items by stock value
    const [topItems] = await pool.query(`
      SELECT i.name, i.sku, i.category,
             COALESCE(SUM(s.quantity), 0) as total_qty,
             i.unit_price,
             COALESCE(SUM(s.quantity) * i.unit_price, 0) as total_value
      FROM inventory i
      JOIN stock s ON i.id = s.inventory_id
      JOIN warehouses w ON s.warehouse_id = w.id
      ${stockFilter}
      GROUP BY i.id
      ORDER BY total_value DESC
      LIMIT 5
    `, stockParams);

    // Top 5 warehouses by stock
    const [topWarehouses] = await pool.query(`
      SELECT w.name as warehouse_name, w.state, w.country,
             COALESCE(SUM(s.quantity), 0) as total_stock,
             COUNT(DISTINCT s.inventory_id) as item_types
      FROM warehouses w
      LEFT JOIN stock s ON w.id = s.warehouse_id
      ${stockFilter}
      GROUP BY w.id
      ORDER BY total_stock DESC
      LIMIT 5
    `, stockParams);

    // Recent stock changes (last 10)
    let histFilter = '';
    let histParams = [];
    if (role === 'manager') {
      histFilter = 'WHERE w.manager_id = ?';
      histParams = [userId];
    } else if (role === 'user') {
      histFilter = 'WHERE w.id = ?';
      histParams = [warehouseId];
    }

    const [recentActivity] = await pool.query(`
      SELECT sh.changed_at, sh.old_quantity, sh.new_quantity, sh.change_type, sh.notes,
             i.name as item_name, i.sku,
             w.name as warehouse_name,
             u.fullname as changed_by
      FROM stock_history sh
      JOIN inventory i ON sh.inventory_id = i.id
      JOIN warehouses w ON sh.warehouse_id = w.id
      LEFT JOIN users u ON sh.changed_by = u.id
      ${histFilter}
      ORDER BY sh.changed_at DESC
      LIMIT 10
    `, histParams);

    // Category breakdown
    const [categoryBreakdown] = await pool.query(`
      SELECT i.category,
             COUNT(DISTINCT i.id) as item_count,
             COALESCE(SUM(s.quantity), 0) as total_units,
             COALESCE(SUM(s.quantity * i.unit_price), 0) as total_value
      FROM inventory i
      LEFT JOIN stock s ON i.id = s.inventory_id
      LEFT JOIN warehouses w ON s.warehouse_id = w.id
      WHERE i.is_active = 1 ${stockFilter ? `AND ${stockFilter.replace('WHERE ', '')}` : ''}
      GROUP BY i.category
      ORDER BY total_value DESC
    `, stockParams);

    res.json({
      kpis: {
        total_items: itemCount[0].count,
        total_warehouses: whCount[0].count,
        total_users: userCount[0].count,
        active_users: activeUserCount[0].count,
        total_units: stockMetrics[0].total_units || 0,
        total_value: stockMetrics[0].total_value || 0,
        out_of_stock: stockMetrics[0].out_of_stock || 0,
        low_stock: stockMetrics[0].low_stock || 0,
        stocked_items: stockMetrics[0].stocked_items || 0
      },
      top_items: topItems,
      top_warehouses: topWarehouses,
      recent_activity: recentActivity,
      category_breakdown: categoryBreakdown
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// ==================== USER MANAGEMENT ====================

app.post('/api/register', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  const callerRole = req.session.role;
  const callerId = req.session.userId;
  try {
    const { fullname, username, email, password, role, manager_id, phone, warehouse_id, join_date, designation, department } = req.body;

    if (!fullname || !username || !email) {
      return res.status(400).json({ error: 'Full name, username, and email are required' });
    }
    const finalPassword = password || `${username}@123`;
    if (finalPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    let userRole = role || 'user';
    let assigned_manager_id = manager_id || null;
    let assigned_warehouse_id = warehouse_id || null;

    if (callerRole === 'manager') {
      userRole = 'user';
      assigned_manager_id = callerId;
    }
    
    let primary_warehouse_id = null;
    if (userRole === 'user') {
      primary_warehouse_id = Array.isArray(warehouse_id) ? warehouse_id[0] : (warehouse_id || null);
    }

    const [result] = await pool.query(
      'INSERT INTO users (username, password, email, fullname, role, manager_id, phone, warehouse_id, join_date, designation, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, finalPassword, email, fullname, userRole, assigned_manager_id, phone || null, primary_warehouse_id, join_date || null, designation || null, department || null]
    );

    // Initial history log
    const wIds = Array.isArray(warehouse_id) ? warehouse_id : (warehouse_id ? [warehouse_id] : []);
    await pool.query(
      'INSERT INTO user_history (user_id, warehouse_ids, manager_id, changed_by) VALUES (?, ?, ?, ?)',
      [result.insertId, JSON.stringify(wIds), assigned_manager_id, callerId]
    );

    if (userRole === 'manager' && wIds.length > 0) {
      await pool.query('UPDATE warehouses SET manager_id = ? WHERE id IN (?)', [result.insertId, wIds]);
    }

    res.json({ success: true, message: 'Account created successfully', id: result.insertId });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/users', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  const role = req.session.role;
  const userId = req.session.userId;
  try {
    let rows;
    if (role === 'admin') {
      [rows] = await pool.query(`
         SELECT u.id, u.username, u.password, u.email, u.fullname, u.role, u.phone,
                u.manager_id, m.fullname as manager_name,
                u.warehouse_id, u.join_date, u.designation, u.department,
                (CASE 
                  WHEN u.role = 'manager' THEN 
                    (SELECT GROUP_CONCAT(w2.name SEPARATOR ', ') FROM warehouses w2 WHERE w2.manager_id = u.id)
                  ELSE w.name 
                END) as warehouse_name,
                (CASE 
                  WHEN u.role = 'manager' THEN 
                    (SELECT JSON_ARRAYAGG(w2.id) FROM warehouses w2 WHERE w2.manager_id = u.id)
                  ELSE NULL
                END) as managed_warehouse_ids,
                u.is_active, u.last_login, u.created_at
         FROM users u
         LEFT JOIN users m ON u.manager_id = m.id
         LEFT JOIN warehouses w ON u.warehouse_id = w.id
         ORDER BY u.role DESC, u.fullname ASC
       `);
     } else {
       [rows] = await pool.query(`
         SELECT u.id, u.username, u.password, u.email, u.fullname, u.role, u.phone, u.manager_id,
                u.join_date,
                u.warehouse_id, w.name as warehouse_name,
                u.is_active, u.last_login, u.created_at
         FROM users u
         LEFT JOIN warehouses w ON u.warehouse_id = w.id
         WHERE u.manager_id = ?
         ORDER BY u.fullname ASC
       `, [userId]);
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/users/managers', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, fullname FROM users WHERE role IN ('admin','manager') AND is_active=1 ORDER BY fullname ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

app.put('/api/users/:id', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  const caller = req.session.role;
  const id = req.params.id;
  try {
    const { fullname, username, email, role, phone, is_active, manager_id, warehouse_id, join_date, designation, department } = req.body;
    let assigned_warehouse_id = warehouse_id || null;
    let assigned_role = role || 'user';
    let primary_warehouse_id = assigned_role === 'user' ? (Array.isArray(warehouse_id) ? warehouse_id[0] : warehouse_id || null) : null;

    if (caller === 'admin') {
      const [old] = await pool.query('SELECT manager_id, warehouse_id, role, (SELECT JSON_ARRAYAGG(id) FROM warehouses WHERE manager_id=?) as managed_ids FROM users WHERE id=?', [id, id]);
      
      let q = 'UPDATE users SET fullname=?, username=?, email=?, role=?, phone=?, is_active=?, manager_id=?, warehouse_id=?, join_date=?, designation=?, department=?';
      let params = [fullname, username, email, assigned_role, phone || null, is_active !== undefined ? is_active : 1, manager_id || null, primary_warehouse_id, join_date || null, designation || null, department || null];
      
      if (req.body.password) {
        q += ', password=?';
        params.push(req.body.password);
      }
      q += ' WHERE id=?';
      params.push(id);

      await pool.query(q, params);

      // Handle multi-warehouse manager associations
      if (assigned_role === 'manager') {
        const wIds = Array.isArray(warehouse_id) ? warehouse_id : (warehouse_id ? [warehouse_id] : []);
        await pool.query('UPDATE warehouses SET manager_id = NULL WHERE manager_id = ?', [id]);
        if (wIds.length > 0) {
          await pool.query('UPDATE warehouses SET manager_id = ? WHERE id IN (?)', [id, wIds]);
        }
        
        // Log history
        await pool.query(
          'INSERT INTO user_history (user_id, warehouse_ids, manager_id, changed_by) VALUES (?, ?, ?, ?)',
          [id, JSON.stringify(wIds), manager_id || null, req.session.userId]
        );
      } else {
        // Log history for staff
        await pool.query(
          'INSERT INTO user_history (user_id, warehouse_ids, manager_id, changed_by) VALUES (?, ?, ?, ?)',
          [id, JSON.stringify(primary_warehouse_id ? [primary_warehouse_id] : []), manager_id || null, req.session.userId]
        );
      }
    } else {
      const [u] = await pool.query('SELECT role, manager_id FROM users WHERE id=?', [id]);
      if (u.length === 0 || u[0].role !== 'user' || u[0].manager_id !== req.session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await pool.query(
        'UPDATE users SET fullname=?, username=?, email=?, phone=?, is_active=?, warehouse_id=? WHERE id=?',
        [fullname, username, email, phone || null, is_active !== undefined ? is_active : 1, assigned_warehouse_id, id]
      );
    }
    const [rows] = await pool.query(
      'SELECT id, username, email, fullname, role, phone, is_active, manager_id, warehouse_id FROM users WHERE id=?', [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/users/:id', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  const caller = req.session.role;
  const id = req.params.id;
  try {
    if (Number(id) === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    if (caller === 'admin') {
      await pool.query('UPDATE users SET is_active = 0 WHERE id=?', [id]);
    } else {
      const [u] = await pool.query('SELECT role, manager_id FROM users WHERE id=?', [id]);
      if (u.length === 0 || u[0].role !== 'user' || u[0].manager_id !== req.session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await pool.query('UPDATE users SET is_active = 0 WHERE id=?', [id]);
    }
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

app.put('/api/users/:id/activate', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  const caller = req.session.role;
  const id = req.params.id;
  try {
    if (caller === 'admin') {
      await pool.query('UPDATE users SET is_active = 1 WHERE id=?', [id]);
    } else {
      const [u] = await pool.query('SELECT role, manager_id FROM users WHERE id=?', [id]);
      if (u.length === 0 || u[0].role !== 'user' || u[0].manager_id !== req.session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await pool.query('UPDATE users SET is_active = 1 WHERE id=?', [id]);
    }
    res.json({ success: true, message: 'User activated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Activation failed' });
  }
});

// Change password
app.put('/api/users/:id/password', checkAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { current_password, new_password } = req.body;
  try {
    if (req.session.userId !== id && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    if (req.session.role !== 'admin') {
      const [u] = await pool.query('SELECT password FROM users WHERE id=?', [id]);
      if (u.length === 0 || u[0].password !== current_password) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }
    await pool.query('UPDATE users SET password=? WHERE id=?', [new_password, id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

// ==================== WAREHOUSES ====================

app.get('/api/warehouses', checkAuth, async (req, res) => {
  try {
    const role = req.session.role;
    const userId = req.session.userId;
    let query = `
      SELECT w.*, u.fullname as manager_name,
             (SELECT COUNT(*) FROM stock s WHERE s.warehouse_id = w.id) as item_count,
             (SELECT COALESCE(SUM(s.quantity), 0) FROM stock s WHERE s.warehouse_id = w.id) as total_stock
      FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id
      WHERE w.is_active = 1
    `;
    let params = [];
    if (role === 'manager' && req.query.managed === '1') {
      query += ' AND w.manager_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY w.country, w.state, w.name';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/warehouses', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, store, location, state, country, capacity, manager_id, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Warehouse name is required' });

    const assignedManagerId = req.session.role === 'manager' ? req.session.userId : (manager_id || null);

    const [result] = await pool.query(
      `INSERT INTO warehouses (name, store, location, state, country, capacity, manager_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, store || null, location || null, state || null, country || null, capacity || 1000, assignedManagerId, description || null]
    );
    const [row] = await pool.query(`
      SELECT w.*, u.fullname as manager_name FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id WHERE w.id = ?
    `, [result.insertId]);
    res.json(row[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create warehouse' });
  }
});

app.put('/api/warehouses/:id', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const id = req.params.id;
    const { name, store, location, state, country, capacity, manager_id, description } = req.body;

    if (req.session.role === 'manager') {
      const [w] = await pool.query('SELECT manager_id FROM warehouses WHERE id=?', [id]);
      if (w.length === 0 || w[0].manager_id !== req.session.userId) {
        return res.status(403).json({ error: 'You can only edit your own warehouses' });
      }
    }

    await pool.query(
      `UPDATE warehouses SET name=?, store=?, location=?, state=?, country=?, capacity=?, manager_id=?, description=? WHERE id=?`,
      [name, store || null, location || null, state || null, country || null, capacity || 1000, manager_id || null, description || null, id]
    );
    const [row] = await pool.query(`
      SELECT w.*, u.fullname as manager_name FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id WHERE w.id = ?
    `, [id]);
    res.json(row[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update warehouse' });
  }
});

app.delete('/api/warehouses/:id', checkAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    // Check if warehouse has stock
    const [stockCheck] = await pool.query(
      'SELECT SUM(quantity) as total FROM stock WHERE warehouse_id=?', [id]
    );
    if (stockCheck[0].total > 0) {
      return res.status(400).json({ error: 'Cannot delete warehouse with active stock. Transfer or clear stock first.' });
    }
    await pool.query('UPDATE warehouses SET is_active = 0 WHERE id=?', [id]);
    res.json({ success: true, message: 'Warehouse deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete warehouse' });
  }
});

// ==================== INVENTORY (Product Catalog) ====================

app.get('/api/inventory', checkAuth, async (req, res) => {
  try {
    const { category, search, low_stock } = req.query;
    let query = `
      SELECT i.*,
        COALESCE(SUM(s.quantity), 0) as total_quantity,
        COALESCE(SUM(s.quantity * i.unit_price), 0) as total_value,
        COUNT(DISTINCT s.warehouse_id) as warehouse_count
      FROM inventory i
      LEFT JOIN stock s ON i.id = s.inventory_id
      WHERE i.is_active = 1
    `;
    const params = [];
    if (category) { query += ' AND i.category = ?'; params.push(category); }
    if (search) { query += ' AND (i.name LIKE ? OR i.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' GROUP BY i.id';
    if (low_stock === '1') {
      query += ' HAVING total_quantity < i.reorder_level';
    }
    query += ' ORDER BY i.category, i.name ASC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/inventory/:id', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*,
        COALESCE(SUM(s.quantity), 0) as total_quantity,
        COALESCE(SUM(s.quantity * i.unit_price), 0) as total_value
      FROM inventory i
      LEFT JOIN stock s ON i.id = s.inventory_id
      WHERE i.id = ? AND i.is_active = 1
      GROUP BY i.id
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    // Also get stock by warehouse
    const [stockByWarehouse] = await pool.query(`
      SELECT s.id as stock_id, s.quantity, w.id as warehouse_id, w.name as warehouse_name,
             w.state, w.country
      FROM stock s
      JOIN warehouses w ON s.warehouse_id = w.id
      WHERE s.inventory_id = ?
    `, [req.params.id]);
    res.json({ ...rows[0], stock_by_warehouse: stockByWarehouse });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Get all categories
app.get('/api/categories', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT category FROM inventory WHERE is_active=1 AND category IS NOT NULL ORDER BY category ASC`
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/items', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, sku, category, description, unit_price, reorder_level, supplier, brand, unit_of_measure } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: 'Item name and SKU are required' });
    }
    if (unit_price < 0) return res.status(400).json({ error: 'Unit price cannot be negative' });

    const [result] = await pool.query(
      `INSERT INTO inventory (name, sku, category, description, unit_price, reorder_level, user_id, supplier, brand, unit_of_measure)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, category || 'General', description || '', unit_price || 0, reorder_level || 10, req.session.userId, supplier || '', brand || '', unit_of_measure || 'Units']
    );
    res.json({ id: result.insertId, message: 'Item created' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'SKU already exists. Use a unique SKU.' });
    }
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

app.patch('/api/inventory/:id/reorder', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { reorder_level } = req.body;
    if (reorder_level === undefined || reorder_level < 0) return res.status(400).json({ error: 'Invalid reorder level' });
    await pool.query('UPDATE inventory SET reorder_level = ? WHERE id = ?', [reorder_level, req.params.id]);
    res.json({ success: true, message: 'Reorder level updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reorder level' });
  }
});

app.put('/api/items/:id', checkAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, sku, category, description, unit_price, reorder_level, supplier, brand } = req.body;

    if (!name || !sku) return res.status(400).json({ error: 'Name and SKU are required' });

    await pool.query(
      `UPDATE inventory
       SET name=?, sku=?, category=?, description=?, unit_price=?, reorder_level=?, supplier=?, brand=?
       WHERE id=?`,
      [name, sku.toUpperCase(), category || 'General', description || null,
       unit_price || 0, reorder_level || 10, supplier || null, brand || null, id]
    );

    const [rows] = await pool.query('SELECT * FROM inventory WHERE id=?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const id = req.params.id;
    const [stockCheck] = await pool.query(
      'SELECT SUM(quantity) as total FROM stock WHERE inventory_id=?', [id]
    );
    if (stockCheck[0].total > 0) {
      return res.status(400).json({ error: 'Cannot delete item with active stock. Clear stock first.' });
    }
    await pool.query('UPDATE inventory SET is_active=0 WHERE id=?', [id]);
    res.json({ success: true, message: 'Item deactivated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ==================== STOCK ====================

app.get('/api/stock', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id, s.inventory_id, s.warehouse_id, s.quantity, s.last_updated,
             i.name, i.sku, i.category, i.reorder_level, i.unit_price,
             w.name as warehouse_name, w.state, w.country, w.location as warehouse_location
      FROM stock s
      JOIN inventory i ON s.inventory_id = i.id
      JOIN warehouses w ON s.warehouse_id = w.id
      WHERE i.user_id = ? AND i.is_active = 1
      ORDER BY i.name, w.name
    `, [req.session.userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Role-based system-wide stock view
app.get('/api/all-stock', checkAuth, async (req, res) => {
  try {
    const role = req.session.role;
    const userId = req.session.userId;
    const warehouseId = req.session.warehouseId;

    let baseQuery = `
      SELECT s.id, s.inventory_id, s.warehouse_id, s.quantity, s.last_updated,
             i.id as item_id, i.name, i.sku, i.category, i.description,
             i.unit_price, i.reorder_level, i.supplier, i.brand,
             w.id as wh_id, w.name as warehouse_name, w.store, w.location,
             w.state, w.country, w.manager_id, w.capacity,
             u.fullname as manager_name
      FROM stock s
      JOIN inventory i ON s.inventory_id = i.id
      JOIN warehouses w ON s.warehouse_id = w.id
      LEFT JOIN users u ON w.manager_id = u.id
      WHERE i.is_active = 1
    `;

    let params = [];
    if (role === 'admin') {
      baseQuery += ' ORDER BY w.country, w.state, i.name ASC';
    } else if (role === 'manager') {
      baseQuery += ' AND w.manager_id = ? ORDER BY i.name ASC';
      params.push(userId);
    } else {
      baseQuery += ' AND w.id = ? ORDER BY i.name ASC';
      params.push(warehouseId);
    }

    const [rows] = await pool.query(baseQuery, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

app.post('/api/stock', checkAuth, async (req, res) => {
  try {
    const { inventory_id, warehouse_id, quantity, notes } = req.body;

    if (!inventory_id || !warehouse_id) {
      return res.status(400).json({ error: 'Inventory item and warehouse are required' });
    }

    // Get existing quantity for history
    const [existing] = await pool.query(
      'SELECT quantity FROM stock WHERE inventory_id=? AND warehouse_id=?',
      [inventory_id, warehouse_id]
    );
    const oldQty = existing.length > 0 ? existing[0].quantity : 0;

    await pool.query(
      `INSERT INTO stock (inventory_id, warehouse_id, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = ?`,
      [inventory_id, warehouse_id, quantity || 0, quantity || 0]
    );

    // Log to history
    await pool.query(
      `INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by)
       VALUES (?, ?, ?, ?, 'adjust', ?, ?)`,
      [inventory_id, warehouse_id, oldQty, quantity || 0, notes || 'Stock level set', req.session.userId]
    );

    const [rows] = await pool.query(
      'SELECT s.*, i.name as item_name FROM stock s JOIN inventory i ON s.inventory_id = i.id WHERE s.inventory_id=? AND s.warehouse_id=?',
      [inventory_id, warehouse_id]
    );
    
    emitStockEvent(warehouse_id, rows[0].item_name, `Stock set to ${quantity} for ${rows[0].item_name}`);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set stock' });
  }
});

app.put('/api/stock/:id', checkAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { quantity, change_type, notes } = req.body;
    const role = req.session.role;
    const userId = req.session.userId;
    const warehouseId = req.session.warehouseId;

    if (quantity < 0) return res.status(400).json({ error: 'Quantity cannot be negative' });

    const [stockRow] = await pool.query(
      `SELECT s.*, w.manager_id FROM stock s
       JOIN warehouses w ON s.warehouse_id = w.id WHERE s.id=?`,
      [id]
    );

    if (stockRow.length === 0) return res.status(404).json({ error: 'Stock record not found' });

    // Authorization
    if (role !== 'admin') {
      if (role === 'manager' && stockRow[0].manager_id !== userId) {
        return res.status(403).json({ error: 'Not authorized for this warehouse' });
      }
      if (role === 'user' && stockRow[0].warehouse_id !== warehouseId) {
        return res.status(403).json({ error: 'Not authorized for this warehouse' });
      }
    }

    const oldQty = stockRow[0].quantity;
    const newQty = quantity;

    await pool.query('UPDATE stock SET quantity=? WHERE id=?', [newQty, id]);

    // Determine change type from context
    let cType = change_type || (newQty > oldQty ? 'add' : newQty < oldQty ? 'remove' : 'adjust');

    // Log to stock_history
    await pool.query(
      `INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [stockRow[0].inventory_id, stockRow[0].warehouse_id, oldQty, newQty, cType, notes || null, userId]
    );

    const [itemDetails] = await pool.query('SELECT name, reorder_level FROM inventory WHERE id=?', [stockRow[0].inventory_id]);
    const itemName = itemDetails[0].name;

    emitStockEvent(stockRow[0].warehouse_id, itemName, `Stock updated to ${newQty} for ${itemName}`);
    
    if (newQty < itemDetails[0].reorder_level) {
      emitStockEvent(stockRow[0].warehouse_id, itemName, `LOW STOCK WARNING: ${itemName} dropped to ${newQty}`, 'low_stock');
    }

    const [rows] = await pool.query('SELECT * FROM stock WHERE id=?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Stock Transfer between warehouses
app.post('/api/stock/transfer', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { inventory_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;

    if (!inventory_id || !from_warehouse_id || !to_warehouse_id || !quantity) {
      return res.status(400).json({ error: 'All transfer fields are required' });
    }
    if (quantity <= 0) return res.status(400).json({ error: 'Transfer quantity must be positive' });
    if (from_warehouse_id === to_warehouse_id) return res.status(400).json({ error: 'Source and destination must be different' });

    if (req.session.role === 'manager') {
      const [wFrom] = await conn.query('SELECT manager_id FROM warehouses WHERE id=?', [from_warehouse_id]);
      if (!wFrom.length || wFrom[0].manager_id !== req.session.userId) {
        return res.status(403).json({ error: 'You can only transfer stock directly OUT of your own warehouse' });
      }
    }

    await conn.beginTransaction();

    const [source] = await conn.query(
      'SELECT * FROM stock WHERE inventory_id=? AND warehouse_id=? FOR UPDATE',
      [inventory_id, from_warehouse_id]
    );

    if (source.length === 0 || source[0].quantity < quantity) {
      await conn.rollback();
      return res.status(400).json({ error: `Insufficient stock. Available: ${source[0]?.quantity || 0}` });
    }

    const newFromQty = source[0].quantity - quantity;
    await conn.query('UPDATE stock SET quantity=? WHERE inventory_id=? AND warehouse_id=?',
      [newFromQty, inventory_id, from_warehouse_id]);

    // Upsert destination
    await conn.query(
      `INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [inventory_id, to_warehouse_id, quantity, quantity]
    );

    const transferNote = notes || `Transfer of ${quantity} units`;

    // Log source reduction
    await conn.query(
      `INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by)
       VALUES (?, ?, ?, ?, 'move', ?, ?)`,
      [inventory_id, from_warehouse_id, source[0].quantity, newFromQty, transferNote, req.session.userId]
    );

    // Log destination addition
    const [dest] = await conn.query('SELECT quantity FROM stock WHERE inventory_id=? AND warehouse_id=?',
      [inventory_id, to_warehouse_id]);

    await conn.query(
      `INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by)
       VALUES (?, ?, ?, ?, 'move', ?, ?)`,
      [inventory_id, to_warehouse_id, dest[0].quantity - quantity, dest[0].quantity, transferNote, req.session.userId]
    );

    const [itemDetails] = await conn.query('SELECT name FROM inventory WHERE id=?', [inventory_id]);
    emitStockEvent(from_warehouse_id, itemDetails[0].name, `Transferred out ${quantity} of ${itemDetails[0].name}`, 'transfer');
    emitStockEvent(to_warehouse_id, itemDetails[0].name, `Transferred in ${quantity} of ${itemDetails[0].name}`, 'transfer');

    await conn.commit();
    res.json({ success: true, message: `Transferred ${quantity} units successfully` });
  } catch (err) {
    await conn.rollback();
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Transfer failed' });
  } finally {
    conn.release();
  }
});

// ==================== STOCK HISTORY / AUDIT LOG ====================

app.get('/api/stock-history', checkAuth, async (req, res) => {
  try {
    const role = req.session.role;
    const userId = req.session.userId;
    const warehouseId = req.session.warehouseId;
    const { inventory_id, warehouse_id, change_type, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT sh.id, sh.inventory_id, sh.warehouse_id, sh.old_quantity, sh.new_quantity,
             (sh.new_quantity - sh.old_quantity) as delta,
             sh.change_type, sh.notes, sh.changed_at,
             i.name as item_name, i.sku,
             w.name as warehouse_name, w.state, w.country,
             u.fullname as changed_by_name, u.username as changed_by_username
      FROM stock_history sh
      JOIN inventory i ON sh.inventory_id = i.id
      JOIN warehouses w ON sh.warehouse_id = w.id
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (role === 'manager') {
      query += ' AND w.manager_id = ?';
      params.push(userId);
    } else if (role === 'user') {
      query += ' AND w.id = ?';
      params.push(warehouseId);
    }

    if (inventory_id) { query += ' AND sh.inventory_id = ?'; params.push(inventory_id); }
    if (warehouse_id) { query += ' AND sh.warehouse_id = ?'; params.push(warehouse_id); }
    if (change_type) { query += ' AND sh.change_type = ?'; params.push(change_type); }

    query += ' ORDER BY sh.changed_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ==================== STATISTICS ====================

app.get('/api/stats', checkAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const [inventoryCount] = await pool.query(
      'SELECT COUNT(*) as count FROM inventory WHERE user_id=? AND is_active=1', [userId]
    );

    const [totalStock] = await pool.query(
      `SELECT COALESCE(SUM(s.quantity), 0) as total FROM stock s
       JOIN inventory i ON s.inventory_id = i.id
       WHERE i.user_id = ? AND i.is_active = 1`, [userId]
    );

    const [lowStockCount] = await pool.query(
      `SELECT COUNT(*) as low_stock_count FROM (
         SELECT i.id, COALESCE(SUM(s.quantity), 0) as total_qty, i.reorder_level
         FROM inventory i
         LEFT JOIN stock s ON i.id = s.inventory_id
         WHERE i.user_id = ? AND i.is_active = 1
         GROUP BY i.id
         HAVING total_qty < i.reorder_level AND total_qty > 0
       ) tmp`, [userId]
    );

    const [outOfStockCount] = await pool.query(
      `SELECT COUNT(*) as out_count FROM (
         SELECT i.id, COALESCE(SUM(s.quantity), 0) as total_qty
         FROM inventory i
         LEFT JOIN stock s ON i.id = s.inventory_id
         WHERE i.user_id = ? AND i.is_active = 1
         GROUP BY i.id
         HAVING total_qty = 0
       ) tmp`, [userId]
    );

    const [totalValue] = await pool.query(
      `SELECT COALESCE(SUM(s.quantity * i.unit_price), 0) as total_value
       FROM stock s
       JOIN inventory i ON s.inventory_id = i.id
       WHERE i.user_id = ? AND i.is_active = 1`, [userId]
    );

    res.json({
      total_items: inventoryCount[0].count,
      total_quantity: totalStock[0].total,
      low_stock_count: lowStockCount[0].low_stock_count || 0,
      out_of_stock_count: outOfStockCount[0].out_count || 0,
      total_value: totalValue[0].total_value || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

app.get('/api/stats/countries', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(w.country, 'Unknown') AS country,
             COUNT(DISTINCT i.id) AS distinct_items,
             COALESCE(SUM(s.quantity), 0) AS total_units,
             COALESCE(SUM(s.quantity * i.unit_price), 0) AS total_value,
             SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock_items,
             COUNT(DISTINCT w.id) as warehouse_count
      FROM stock s
      JOIN inventory i ON s.inventory_id = i.id
      JOIN warehouses w ON s.warehouse_id = w.id
      WHERE i.is_active = 1
      GROUP BY w.country ORDER BY total_units DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get country stats' });
  }
});

app.get('/api/stats/states', checkAuth, async (req, res) => {
  try {
    const country = req.query.country || null;
    let q = `
      SELECT COALESCE(w.country, 'Unknown') as country,
             COALESCE(w.state, 'Unknown') as state,
             COUNT(DISTINCT i.id) AS distinct_items,
             COALESCE(SUM(s.quantity), 0) AS total_units,
             COALESCE(SUM(s.quantity * i.unit_price), 0) AS total_value,
             COUNT(DISTINCT w.id) as warehouse_count
      FROM stock s
      JOIN inventory i ON s.inventory_id = i.id
      JOIN warehouses w ON s.warehouse_id = w.id
      WHERE i.is_active = 1
    `;
    const params = [];
    if (country) { q += ' AND w.country = ?'; params.push(country); }
    q += ' GROUP BY w.country, w.state ORDER BY total_units DESC';
    const [rows] = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get state stats' });
  }
});

// ==================== REPORTS ====================

app.get('/api/reports/low-stock', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id, i.name, i.sku, i.category, i.reorder_level,
             i.unit_price, i.supplier,
             COALESCE(SUM(s.quantity), 0) as total_quantity,
             (i.reorder_level - COALESCE(SUM(s.quantity), 0)) as shortage
      FROM inventory i
      LEFT JOIN stock s ON i.id = s.inventory_id
      WHERE i.is_active = 1
      GROUP BY i.id
      HAVING total_quantity < i.reorder_level
      ORDER BY shortage DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get low stock report' });
  }
});

app.get('/api/reports/valuation', checkAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id, i.name, i.sku, i.category, i.unit_price,
             COALESCE(SUM(s.quantity), 0) as total_qty,
             COALESCE(SUM(s.quantity) * i.unit_price, 0) as total_value
      FROM inventory i
      LEFT JOIN stock s ON i.id = s.inventory_id
      WHERE i.is_active = 1
      GROUP BY i.id
      ORDER BY total_value DESC
    `);
    const [total] = await pool.query(`
      SELECT COALESCE(SUM(s.quantity * i.unit_price), 0) as grand_total
      FROM stock s JOIN inventory i ON s.inventory_id = i.id WHERE i.is_active=1
    `);
    res.json({ items: rows, grand_total: total[0].grand_total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get valuation report' });
  }
});

// ==================== LOCATIONS ====================

app.get('/api/locations', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT w.id, w.name as warehouse_name, w.store, w.state, w.country,
             w.capacity, w.description,
             u.id as manager_id, u.username, u.fullname as manager_name, u.phone as manager_phone,
             (SELECT COUNT(*) FROM users WHERE manager_id = u.id AND is_active=1) as team_size,
             COALESCE(SUM(s.quantity), 0) as total_stock,
             COUNT(DISTINCT i.id) as distinct_items,
             COALESCE(SUM(s.quantity * i.unit_price), 0) as stock_value,
             SUM(CASE WHEN s.quantity < i.reorder_level AND s.quantity > 0 THEN 1 ELSE 0 END) as low_stock_alerts
      FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id
      LEFT JOIN stock s ON s.warehouse_id = w.id
      LEFT JOIN inventory i ON s.inventory_id = i.id
      WHERE w.is_active = 1
      GROUP BY w.id
      ORDER BY w.state ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

app.get('/api/locations/:id', checkAuth, async (req, res) => {
  try {
    const locationId = req.params.id;

    const [warehouse] = await pool.query(`
      SELECT w.id, w.name, w.store, w.state, w.country, w.capacity, w.location, w.description,
             u.id as manager_id, u.username, u.fullname as manager_name,
             u.email as manager_email, u.phone as manager_phone
      FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id
      WHERE w.id=? AND w.is_active=1
    `, [locationId]);

    if (warehouse.length === 0) return res.status(404).json({ error: 'Location not found' });

    const [team] = await pool.query(`
      SELECT id, username, fullname, email, phone, role, last_login
      FROM users
      WHERE manager_id = ? AND is_active = 1
      ORDER BY fullname ASC
    `, [warehouse[0].manager_id]);

    const [stock] = await pool.query(`
      SELECT i.id, i.name, i.sku, i.category, i.unit_price, i.reorder_level,
             s.id as stock_id, s.quantity, s.last_updated,
             (s.quantity * i.unit_price) as item_value
      FROM inventory i
      LEFT JOIN stock s ON i.id = s.inventory_id AND s.warehouse_id = ?
      WHERE i.is_active=1
      ORDER BY i.category, i.name ASC
    `, [locationId]);

    const [stats] = await pool.query(`
      SELECT COALESCE(COUNT(DISTINCT i.id), 0) as distinct_items,
             COALESCE(SUM(s.quantity), 0) as total_units,
             COALESCE(SUM(s.quantity * i.unit_price), 0) as total_value,
             SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_items,
             SUM(CASE WHEN s.quantity > 0 AND s.quantity < i.reorder_level THEN 1 ELSE 0 END) as low_stock_items
      FROM stock s
      JOIN inventory i ON s.inventory_id = i.id
      WHERE s.warehouse_id = ? AND i.is_active=1
    `, [locationId]);

    res.json({ warehouse: warehouse[0], team, stock, stats: stats[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get location details' });
  }
});

app.get('/api/locations/stats/regional', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT w.state as region, w.country,
             COUNT(DISTINCT w.id) as warehouse_count,
             COUNT(DISTINCT u.id) as manager_count,
             COALESCE(SUM(s.quantity), 0) as total_stock,
             COALESCE(SUM(s.quantity * i.unit_price), 0) as total_value,
             COUNT(DISTINCT i.id) as distinct_items
      FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id
      LEFT JOIN stock s ON s.warehouse_id = w.id
      LEFT JOIN inventory i ON s.inventory_id = i.id
      WHERE w.is_active=1
      GROUP BY w.state, w.country
      ORDER BY total_stock DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get regional stats' });
  }
});

// ==================== STOCK REQUESTS ====================

app.get('/api/stock-requests', checkAuth, async (req, res) => {
  try {
    const role = req.session.role;
    const userId = req.session.userId;
    const warehouseId = req.session.warehouseId;
    
    let query = `
      SELECT sr.*, i.name as item_name, i.sku,
             w_from.name as from_warehouse, w_to.name as to_warehouse,
             w_from.manager_id as from_manager_id, w_to.manager_id as to_manager_id,
             u_req.fullname as requested_by_name, u_act.fullname as action_by_name
      FROM stock_requests sr
      JOIN inventory i ON sr.inventory_id = i.id
      LEFT JOIN warehouses w_from ON sr.from_warehouse_id = w_from.id
      JOIN warehouses w_to ON sr.to_warehouse_id = w_to.id
      LEFT JOIN users u_req ON sr.requested_by = u_req.id
      LEFT JOIN users u_act ON sr.action_by = u_act.id
      WHERE 1=1
    `;
    const params = [];
    
    if (role === 'manager') {
      query += ` AND (w_from.manager_id = ? OR w_to.manager_id = ?)`;
      params.push(userId, userId);
    } else if (role === 'user') {
      query += ` AND (sr.from_warehouse_id = ? OR sr.to_warehouse_id = ?)`;
      params.push(warehouseId, warehouseId);
    }
    
    query += ' ORDER BY sr.created_at DESC LIMIT 200';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock requests' });
  }
});

app.post('/api/stock-requests', checkAuth, async (req, res) => {
  try {
    const { inventory_id, from_warehouse_id, to_warehouse_id, quantity } = req.body;
    if (!inventory_id || !to_warehouse_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    if (req.session.role === 'manager') {
      const [wFromRows] = from_warehouse_id ? await pool.query('SELECT manager_id FROM warehouses WHERE id=?', [from_warehouse_id]) : [[]];
      const [wToRows] = await pool.query('SELECT manager_id FROM warehouses WHERE id=?', [to_warehouse_id]);
      
      const ownsFrom = wFromRows.length > 0 && wFromRows[0].manager_id === req.session.userId;
      const ownsTo = wToRows.length > 0 && wToRows[0].manager_id === req.session.userId;
      
      if (!ownsFrom && !ownsTo) {
        return res.status(403).json({ error: 'You must manage either the source or destination warehouse to create a request' });
      }
    }
    
    const [result] = await pool.query(
      `INSERT INTO stock_requests (inventory_id, from_warehouse_id, to_warehouse_id, quantity, status, requested_by)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [inventory_id, from_warehouse_id || null, to_warehouse_id, quantity, req.session.userId]
    );
    
    // Notify
    emitStockEvent(to_warehouse_id, 'Stock Request', `New request created for ${quantity} units`, 'info');
    if (from_warehouse_id) {
      emitStockEvent(from_warehouse_id, 'Stock Request', `Inbound request received for ${quantity} units`, 'info');
    }
    
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

app.put('/api/stock-requests/:id/status', checkAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = req.params.id;
    const { status, reason, shipping_type, driver_details, tracking_number } = req.body;
    
    const [reqs] = await conn.query('SELECT * FROM stock_requests WHERE id = ? FOR UPDATE', [id]);
    if (reqs.length === 0) throw new Error('Request not found');
    const r = reqs[0];
    
    if (req.session.role === 'manager') {
       const [wFromRows] = r.from_warehouse_id ? await conn.query('SELECT manager_id FROM warehouses WHERE id=?', [r.from_warehouse_id]) : [[]];
       const [wToRows] = await conn.query('SELECT manager_id FROM warehouses WHERE id=?', [r.to_warehouse_id]);
       
       const ownsFrom = wFromRows.length > 0 && wFromRows[0].manager_id === req.session.userId;
       const ownsTo = wToRows.length > 0 && wToRows[0].manager_id === req.session.userId;
       
       if (['approved', 'rejected', 'shipped'].includes(status)) {
         if (r.from_warehouse_id && !ownsFrom) throw new Error('Only the source warehouse manager can approve/reject/ship requests');
         if (!r.from_warehouse_id && !ownsTo) throw new Error('Only the destination manager can approve supplier-direct requests');
       }
       if (status === 'received' && !ownsTo) {
         throw new Error('Only the destination manager can receive the stock');
       }
    }

    if (status === 'received' && r.status !== 'shipped' && r.status !== 'approved') {
       throw new Error('Can only receive shipped or approved stock');
    }
    
    // Update the request
    await conn.query(`
      UPDATE stock_requests 
      SET status = ?, reason = ?, shipping_type = ?, driver_details = ?, tracking_number = ?, action_by = ?
      WHERE id = ?`,
      [status, reason || r.reason, shipping_type || r.shipping_type, driver_details || r.driver_details, tracking_number || r.tracking_number, req.session.userId, id]
    );
    
    // If received, process the actual stock transfer
    if (status === 'received') {
      // 1. Add to destination
      const [destStock] = await conn.query('SELECT quantity FROM stock WHERE inventory_id=? AND warehouse_id=?', [r.inventory_id, r.to_warehouse_id]);
      let newDestQty = r.quantity;
      if (destStock.length > 0) {
        newDestQty = destStock[0].quantity + r.quantity;
        await conn.query('UPDATE stock SET quantity=? WHERE inventory_id=? AND warehouse_id=?', [newDestQty, r.inventory_id, r.to_warehouse_id]);
      } else {
        await conn.query('INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES (?, ?, ?)', [r.inventory_id, r.to_warehouse_id, r.quantity]);
      }
      
      // Log history to destination
      await conn.query(
        `INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by) VALUES (?, ?, ?, ?, 'move', ?, ?)`,
        [r.inventory_id, r.to_warehouse_id, newDestQty - r.quantity, newDestQty, `Received via request #${r.id}`, req.session.userId]
      );
      
      // 2. Subtract from source if provided
      if (r.from_warehouse_id) {
        const [srcStock] = await conn.query('SELECT quantity FROM stock WHERE inventory_id=? AND warehouse_id=?', [r.inventory_id, r.from_warehouse_id]);
        let srcQty = srcStock.length > 0 ? srcStock[0].quantity : 0;
        let newSrcQty = Math.max(0, srcQty - r.quantity);
        
        if (srcStock.length === 0) {
           await conn.query('INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES (?, ?, ?)', [r.inventory_id, r.from_warehouse_id, 0]);
        } else {
           await conn.query('UPDATE stock SET quantity=? WHERE inventory_id=? AND warehouse_id=?', [newSrcQty, r.inventory_id, r.from_warehouse_id]);
        }
        
        // Log history from source
        await conn.query(
          `INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by) VALUES (?, ?, ?, ?, 'move', ?, ?)`,
          [r.inventory_id, r.from_warehouse_id, srcQty, newSrcQty, `Fulfilled request #${r.id}`, req.session.userId]
        );
      }
      
      emitStockEvent(r.to_warehouse_id, 'Stock Received', `Request #${r.id} received in inventory`, 'info');
    }

    await conn.commit();
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  } finally {
    conn.release();
  }
});

// ==================== AUTO-MIGRATION ON STARTUP ====================
// Safely adds missing columns / tables if running against old schema
async function runMigrations() {
  const conn = await pool.getConnection();
  try {
    console.log('🔧 Running auto-migrations...');

    const alterMigrations = [
      // users table new columns
      `ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER email`,
      `ALTER TABLE users ADD COLUMN warehouse_id INT AFTER manager_id`,
      `ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`,
      `ALTER TABLE users ADD COLUMN last_login DATETIME`,
      // warehouses table
      `ALTER TABLE warehouses ADD COLUMN description TEXT`,
      `ALTER TABLE warehouses ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`,
      // inventory table
      `ALTER TABLE inventory ADD COLUMN supplier VARCHAR(255)`,
      `ALTER TABLE inventory ADD COLUMN brand VARCHAR(100)`,
      `ALTER TABLE inventory ADD COLUMN unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Units'`,
      `ALTER TABLE inventory ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`
    ];
    for (const sql of alterMigrations) {
      try { await conn.query(sql); } catch (e) { if(e.code !== 'ER_DUP_FIELDNAME') console.error('Alter error:', e.message); }
    }

    const updates = [
      `UPDATE users SET is_active = 1 WHERE is_active IS NULL OR is_active = 0`,
      `UPDATE warehouses SET is_active = 1 WHERE is_active IS NULL OR is_active = 0`,
      `UPDATE inventory SET is_active = 1 WHERE is_active IS NULL OR is_active = 0`,
      `UPDATE users SET fullname = 'Abhilash Reddy' WHERE role = 'admin'`
    ];
    for (const sql of updates) {
      try { await conn.query(sql); } catch (e) { console.error('Update error:', e.message); }
    }

    // Create login_logs if not exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT, username VARCHAR(100),
        success TINYINT(1) DEFAULT 0,
        ip_address VARCHAR(50), notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create stock_history if not exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inventory_id INT NOT NULL, warehouse_id INT NOT NULL,
        old_quantity INT DEFAULT 0, new_quantity INT DEFAULT 0,
        change_type ENUM('add','remove','adjust','move','initial') DEFAULT 'adjust',
        notes TEXT, changed_by INT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_inventory_id (inventory_id),
        INDEX idx_changed_at (changed_at)
      )
    `);

    // Create stock_requests table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        inventory_id INT NOT NULL,
        warehouse_from_id INT NOT NULL,
        warehouse_to_id INT NOT NULL,
        requested_by INT NOT NULL,
        quantity INT NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'shipped', 'received') DEFAULT 'pending',
        rejection_reason VARCHAR(255),
        shipping_type ENUM('own', 'third_party'),
        driver_details VARCHAR(255),
        tracking_number VARCHAR(100),
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES inventory(id),
        FOREIGN KEY (warehouse_from_id) REFERENCES warehouses(id),
        FOREIGN KEY (warehouse_to_id) REFERENCES warehouses(id),
        FOREIGN KEY (requested_by) REFERENCES users(id)
      )
    `);

    // Ensure users have clear default passwords
    await conn.query(`UPDATE users SET password = CONCAT(username, '@123') WHERE password = 'password123' OR password IS NULL OR password = ''`);

    console.log('✅ Migrations complete.');
  } catch (err) {
    console.error('⚠️  Migration warning:', err.message);
  } finally {
    conn.release();
  }
}

const PORT = process.env.PORT || 3000;
async function startServer() {
  try {
    await pool.query('SELECT 1'); // test DB connection
    console.log('✅ Database connected.');
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`✅ Inventory System running at http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    console.error('   Make sure MySQL is running and DB credentials are correct in .env');
    process.exit(1);
  }
}
startServer();
