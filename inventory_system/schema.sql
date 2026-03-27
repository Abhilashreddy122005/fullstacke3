
DROP DATABASE IF EXISTS inventory_db;
CREATE DATABASE inventory_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventory_db;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(100) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  fullname     VARCHAR(255),
  department   VARCHAR(100),
  designation  VARCHAR(100),
  phone        VARCHAR(20),
  role         ENUM('admin', 'manager', 'user') DEFAULT 'user',
  manager_id   INT,
  warehouse_id INT,
  is_active    TINYINT(1) DEFAULT 1,
  last_login   DATETIME,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_username  (username),
  INDEX idx_email     (email),
  INDEX idx_manager   (manager_id),
  INDEX idx_warehouse (warehouse_id),
  INDEX idx_role      (role)
);

-- ============================================================
-- WAREHOUSES TABLE
-- ============================================================
CREATE TABLE warehouses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  store        VARCHAR(255),
  location     VARCHAR(255),
  state        VARCHAR(100),
  country      VARCHAR(100),
  capacity     INT DEFAULT 10000,
  manager_id   INT,
  description  TEXT,
  is_active    TINYINT(1) DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_name    (name),
  INDEX idx_state   (state),
  INDEX idx_country (country)
);

-- ============================================================
-- INVENTORY TABLE (Product Catalog)
-- ============================================================
CREATE TABLE inventory (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  sku            VARCHAR(100) UNIQUE NOT NULL,
  category       VARCHAR(100) DEFAULT 'General',
  description    TEXT,
  unit_price     DECIMAL(12, 2) DEFAULT 0.00,
  reorder_level  INT DEFAULT 10,
  user_id        INT NOT NULL,
  supplier       VARCHAR(255),
  brand          VARCHAR(100),
  unit_of_measure VARCHAR(50) DEFAULT 'Units',
  is_active      TINYINT(1) DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sku      (sku),
  INDEX idx_name     (name),
  INDEX idx_category (category),
  INDEX idx_user_id  (user_id)
);

-- ============================================================
-- STOCK TABLE (Quantity tracking per warehouse)
-- ============================================================
CREATE TABLE stock (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id   INT NOT NULL,
  warehouse_id   INT NOT NULL,
  quantity       INT NOT NULL DEFAULT 0,
  last_updated   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_item_warehouse (inventory_id, warehouse_id),
  INDEX idx_inventory_id (inventory_id),
  INDEX idx_warehouse_id (warehouse_id)
);

-- ============================================================
-- STOCK HISTORY TABLE (Full Audit Trail)
-- ============================================================
CREATE TABLE stock_history (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id   INT NOT NULL,
  warehouse_id   INT NOT NULL,
  old_quantity   INT DEFAULT 0,
  new_quantity   INT DEFAULT 0,
  change_type    ENUM('add', 'remove', 'adjust', 'move', 'initial') DEFAULT 'adjust',
  notes          TEXT,
  changed_by     INT,
  changed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by)   REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_inventory_id (inventory_id),
  INDEX idx_warehouse_id (warehouse_id),
  INDEX idx_changed_at   (changed_at),
  INDEX idx_change_type  (change_type)
);

-- ============================================================
-- LOGIN LOGS TABLE
-- ============================================================
CREATE TABLE login_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  username   VARCHAR(100),
  success    TINYINT(1) DEFAULT 0,   -- 0=fail, 1=success, 2=logout
  ip_address VARCHAR(50),
  notes      TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id    (user_id),
  INDEX idx_created_at (created_at)
);

-- ============================================================
-- ANALYTICS VIEWS
-- ============================================================
CREATE VIEW inventory_overview AS
SELECT i.id, i.name, i.sku, i.category, i.unit_price,
       COALESCE(SUM(s.quantity), 0) AS total_quantity,
       COALESCE(SUM(s.quantity) * i.unit_price, 0) AS total_value,
       SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock_count,
       SUM(CASE WHEN s.quantity > 0 AND s.quantity < i.reorder_level THEN 1 ELSE 0 END) AS low_stock_count
FROM inventory i
LEFT JOIN stock s ON i.id = s.inventory_id
WHERE i.is_active = 1
GROUP BY i.id;

CREATE VIEW warehouse_stock AS
SELECT w.id AS warehouse_id, w.name AS warehouse_name, w.store, w.state, w.country,
       i.id AS item_id, i.name AS item_name, i.sku, i.category,
       s.quantity, (s.quantity * i.unit_price) AS stock_value
FROM warehouses w
JOIN stock s ON w.id = s.warehouse_id
JOIN inventory i ON i.id = s.inventory_id
WHERE i.is_active = 1;

-- ============================================================
-- ============================================================
-- SAMPLE DATA - SIMPLIFIED SOUTH INDIAN REGION SCENARIO
-- ============================================================
-- ============================================================

-- ============================================================
-- 1. ADMIN & MANAGERS
-- ============================================================
INSERT INTO users (id, username, password, email, fullname, phone, role) VALUES
(1, 'admin',         'Admin@2024', 'admin@invsys.co.in',       'ABHILASH REDDY (System Admin)',       '9900000001', 'admin'),
(2, 'mgr_chennai',   'Mgr@123',    'karthik.s@invsys.co.in',   'Karthik Subramanian (Chennai Head)',  '9811101001', 'manager'),
(3, 'mgr_hyderabad', 'Mgr@123',    'kiran.reddy@invsys.co.in', 'Kiran Reddy (Hyderabad Head)',        '9811102001', 'manager'),
(4, 'mgr_bangalore', 'Mgr@123',    'ananya.k@invsys.co.in',    'Ananya Krishnan (Bangalore Head)',    '9811103001', 'manager');

-- ============================================================
-- 2. WAREHOUSES
-- ============================================================
INSERT INTO warehouses (id, name, store, location, state, country, capacity, manager_id, description) VALUES
(1, 'Chennai Central Hub',      'Unit A1', 'Guindy Industrial Estate', 'Tamil Nadu', 'India', 10000, 2, 'Primary logistics center for Tamil Nadu.'),
(2, 'Hyderabad Assembly Hub',   'Unit H1', 'HITEC City Outskirts',     'Telangana',  'India', 12000, 3, 'Key sorting center for TS and AP.'),
(3, 'Bangalore Tech Park Hub',  'Unit B1', 'Electronic City Phase 1',  'Karnataka',  'India', 8000,  4, 'Dedicated hardware & tech distribution.');

-- ============================================================
-- 3. STAFF USERS
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role, manager_id, warehouse_id) VALUES
('user_ch_1', 'User@123', 'ravi.kumar@invsys.co.in',   'Ravi Kumar - Floor Lead',      '9800201001', 'user', 2, 1),
('user_ch_2', 'User@123', 'priya.s@invsys.co.in',      'Priya Shankar - Audit',        '9800201002', 'user', 2, 1),
('user_hyd_1','User@123', 'srinivas.rao@invsys.co.in', 'Srinivas Rao - Floor Lead',    '9800302001', 'user', 3, 2),
('user_hyd_2','User@123', 'swathi.das@invsys.co.in',   'Swathi Das - QA Controller',   '9800302002', 'user', 3, 2),
('user_bg_1', 'User@123', 'divya.iyer@invsys.co.in',   'Divya Iyer - Floor Lead',      '9800403001', 'user', 4, 3),
('user_bg_2', 'User@123', 'suresh.n@invsys.co.in',     'Suresh Naidu - Dispatches',    '9800403002', 'user', 4, 3);

-- ============================================================
-- 4. INVENTORY (10 Simple Items)
-- ============================================================
INSERT INTO inventory (id, name, sku, category, description, unit_price, reorder_level, user_id, supplier, brand, unit_of_measure) VALUES
(1, 'Smartphone A54',           'PH-A54',    'Electronics', '5G Smartphone 128GB',   24999.00, 20, 1, 'Samsung', 'Samsung', 'Units'),
(2, 'Wireless Earbuds',         'AUD-W1',    'Electronics', 'Bluetooth 5.2 earbuds', 2199.00,  50, 1, 'boAt',    'boAt',    'Units'),
(3, 'Smart LED TV 43"',         'TV-43',     'Electronics', '4K Ultra HD Smart TV',  29999.00, 10, 1, 'Xiaomi',  'Mi',      'Units'),
(4, 'Instant Water Heater 5L',  'WH-5L',     'Appliances',  '5 Litre capacity heater',5499.00,  30, 1, 'Havells', 'Havells', 'Units'),
(5, 'Mixer Grinder 750W',       'MG-750',    'Appliances',  '3 Jars, 750 Watt Motor', 3499.00,  25, 1, 'Prestige','Prestige','Units'),
(6, 'Smart Watch Series 8',     'SW-S8',     'Electronics', 'Fitness tracker, GPS', 45000.00,   15, 1, 'Apple',   'Apple',   'Units'),
(7, 'Ceiling Fan 1200mm',       'FAN-1200',  'Appliances',  'High speed quiet fan',   2100.00,  40, 1, 'Crompton','Crompton','Units'),
(8, 'Bluetooth Speaker 20W',    'SPK-20W',   'Electronics', 'Portable outdoor speaker',2999.00, 35, 1, 'JBL',     'JBL',     'Units'),
(9, 'Microwave Oven 20L',       'MW-20L',    'Appliances',  'Convection oven, 20L',   6499.00,  20, 1, 'LG',      'LG',      'Units'),
(10,'Air Purifier HEPA',        'AP-HEPA',   'Appliances',  'True HEPA filter purifier',9999.00, 20, 1, 'Philips', 'Philips', 'Units');

-- ============================================================
-- 5. STOCK
-- ============================================================
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(1, 1, 150), (1, 2, 200), (1, 3, 180),
(2, 1, 300), (2, 2, 450), (2, 3, 320),
(3, 1, 80),  (3, 2, 120), (3, 3, 90),
(4, 1, 250), (4, 2, 180), (4, 3, 140),
(5, 1, 100), (5, 2, 150), (5, 3, 200),
(6, 1, 40),  (6, 2, 60),  (6, 3, 50),
(7, 1, 320), (7, 2, 400), (7, 3, 350),
(8, 1, 150), (8, 2, 180), (8, 3, 210),
(9, 1, 45),  (9, 2, 70),  (9, 3, 60),
(10,1, 90),  (10,2, 110), (10,3, 85);

-- ============================================================
-- 6. STOCK HISTORY
-- ============================================================
INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by) VALUES
(1, 1, 0, 150, 'initial', 'Initial allocation', 1),
(2, 2, 0, 450, 'initial', 'Initial allocation', 1),
(3, 3, 0, 90,  'initial', 'Initial allocation', 1);

-- ============================================================
-- STOCK REQUESTS TABLE
-- ============================================================
CREATE TABLE stock_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inventory_id INT NOT NULL,
  from_warehouse_id INT,
  to_warehouse_id INT NOT NULL,
  quantity INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'shipped', 'received') DEFAULT 'pending',
  reason VARCHAR(255),
  shipping_type ENUM('own', 'third_party'),
  driver_details VARCHAR(255),
  tracking_number VARCHAR(100),
  requested_by INT,
  action_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
  FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status)
);

-- ============================================================
-- ============================================================
-- DATA FETCH QUERIES (How the Application Reads Data)
-- These are the exact SELECT queries executed by server.js
-- for each major feature / API endpoint.
-- ============================================================
-- ============================================================

-- ============================================================
-- AUTH: Verify login credentials
-- Used by: POST /api/login
-- ============================================================
SELECT id, username, role, warehouse_id, fullname, email
FROM   users
WHERE  username  = 'mgr_chennai'   -- placeholder: supplied at runtime
  AND  password  = 'Mgr@123'       -- placeholder: supplied at runtime
  AND  is_active = 1;

-- ============================================================
-- SESSION: Return current logged-in user info
-- Used by: GET /api/user
-- ============================================================
SELECT id, username, fullname, email, role,
       warehouse_id, department, designation, phone,
       last_login
FROM   users
WHERE  id = 2              -- placeholder: req.session.userId at runtime
  AND  is_active = 1;

-- ============================================================
-- DASHBOARD: KPI summary cards
-- Used by: GET /api/dashboard
-- ============================================================

-- Total distinct active products
SELECT COUNT(*) AS total_items
FROM   inventory
WHERE  is_active = 1;

-- Total stock units across all warehouses
SELECT COALESCE(SUM(s.quantity), 0) AS total_stock
FROM   stock         s
JOIN   inventory     i ON i.id = s.inventory_id
WHERE  i.is_active = 1;

-- Total inventory value (quantity × unit_price)
SELECT COALESCE(SUM(s.quantity * i.unit_price), 0) AS total_value
FROM   stock         s
JOIN   inventory     i ON i.id = s.inventory_id
WHERE  i.is_active = 1;

-- Count of active warehouses
SELECT COUNT(*) AS total_warehouses
FROM   warehouses
WHERE  is_active = 1;

-- Products whose stock has fallen below the reorder level (low-stock alerts)
SELECT i.id, i.name, i.sku, i.reorder_level,
       SUM(s.quantity)    AS total_qty,
       w.name             AS warehouse_name
FROM   inventory i
JOIN   stock     s ON s.inventory_id  = i.id
JOIN   warehouses w ON w.id           = s.warehouse_id
WHERE  i.is_active = 1
  AND  s.quantity  < i.reorder_level
GROUP  BY i.id, w.id
ORDER  BY total_qty ASC
LIMIT  10;

-- Top 5 products by total stock value
SELECT i.name, i.sku, i.category,
       SUM(s.quantity)              AS total_qty,
       SUM(s.quantity * i.unit_price) AS total_value
FROM   inventory i
JOIN   stock     s ON s.inventory_id = i.id
WHERE  i.is_active = 1
GROUP  BY i.id
ORDER  BY total_value DESC
LIMIT  5;

-- Top 5 warehouses by total stock value
SELECT w.name AS warehouse_name, w.state,
       SUM(s.quantity * i.unit_price) AS total_value
FROM   warehouses w
JOIN   stock      s ON  s.warehouse_id  = w.id
JOIN   inventory  i ON  i.id            = s.inventory_id
WHERE  w.is_active = 1 AND i.is_active = 1
GROUP  BY w.id
ORDER  BY total_value DESC
LIMIT  5;

-- ============================================================
-- INVENTORY / PRODUCTS PAGE: Full product list with stock totals
-- Used by: GET /api/inventory
-- ============================================================
SELECT i.id, i.name, i.sku, i.category, i.description,
       i.unit_price, i.reorder_level, i.supplier, i.brand,
       i.unit_of_measure, i.created_at,
       COALESCE(SUM(s.quantity), 0)              AS total_quantity,
       COALESCE(SUM(s.quantity * i.unit_price), 0) AS total_value,
       u.username                                AS created_by
FROM   inventory i
LEFT JOIN stock   s ON s.inventory_id = i.id
LEFT JOIN users   u ON u.id           = i.user_id
WHERE  i.is_active = 1
GROUP  BY i.id
ORDER  BY i.name ASC;

-- ============================================================
-- STOCK PAGE: Stock levels per product, per warehouse
-- Used by: GET /api/stock
-- Admin/Manager sees all warehouses; User sees own warehouse only.
-- ============================================================

-- Admin / Manager view (all warehouses)
SELECT s.id, s.quantity, s.last_updated,
       i.id   AS inventory_id, i.name AS item_name,
       i.sku, i.category, i.unit_price, i.reorder_level,
       w.id   AS warehouse_id, w.name AS warehouse_name,
       w.state
FROM   stock      s
JOIN   inventory  i ON i.id = s.inventory_id
JOIN   warehouses w ON w.id = s.warehouse_id
WHERE  i.is_active = 1
ORDER  BY i.name, w.name;

-- User view (own warehouse only – warehouse_id supplied from session)
SELECT s.id, s.quantity, s.last_updated,
       i.id   AS inventory_id, i.name AS item_name,
       i.sku, i.category, i.unit_price, i.reorder_level,
       w.id   AS warehouse_id, w.name AS warehouse_name
FROM   stock      s
JOIN   inventory  i ON i.id = s.inventory_id
JOIN   warehouses w ON w.id = s.warehouse_id
WHERE  i.is_active = 1
  AND  s.warehouse_id = 1            -- placeholder: req.session.warehouseId
ORDER  BY i.name;

-- ============================================================
-- STOCK HISTORY: Audit trail of every quantity change
-- Used by: GET /api/stock-history  (also shown in Audit page)
-- ============================================================
SELECT sh.id, sh.old_quantity, sh.new_quantity, sh.change_type,
       sh.notes,  sh.changed_at,
       i.name     AS item_name, i.sku,
       w.name     AS warehouse_name,
       u.username AS changed_by_user
FROM   stock_history sh
JOIN   inventory     i ON i.id  = sh.inventory_id
JOIN   warehouses    w ON w.id  = sh.warehouse_id
LEFT JOIN users      u ON u.id  = sh.changed_by
ORDER  BY sh.changed_at DESC
LIMIT  100;

-- ============================================================
-- STOCK REQUESTS: Inter-warehouse transfer requests
-- Used by: GET /api/stock-requests
-- ============================================================

-- Admin view: all requests
SELECT sr.id, sr.quantity, sr.status, sr.reason,
       sr.shipping_type, sr.tracking_number, sr.created_at,
       i.name      AS item_name, i.sku,
       fw.name     AS from_warehouse,
       tw.name     AS to_warehouse,
       ru.username AS requested_by,
       au.username AS action_by
FROM   stock_requests sr
JOIN   inventory      i  ON  i.id  = sr.inventory_id
LEFT JOIN warehouses  fw ON  fw.id = sr.from_warehouse_id
JOIN   warehouses     tw ON  tw.id = sr.to_warehouse_id
LEFT JOIN users       ru ON  ru.id = sr.requested_by
LEFT JOIN users       au ON  au.id = sr.action_by
ORDER  BY sr.created_at DESC;

-- Manager / User view: only requests for their warehouse
SELECT sr.id, sr.quantity, sr.status, sr.reason, sr.created_at,
       i.name     AS item_name, i.sku,
       fw.name    AS from_warehouse,
       tw.name    AS to_warehouse,
       ru.username AS requested_by
FROM   stock_requests sr
JOIN   inventory      i  ON  i.id  = sr.inventory_id
LEFT JOIN warehouses  fw ON  fw.id = sr.from_warehouse_id
JOIN   warehouses     tw ON  tw.id = sr.to_warehouse_id
LEFT JOIN users       ru ON  ru.id = sr.requested_by
WHERE  sr.to_warehouse_id   = 1       -- placeholder: req.session.warehouseId
   OR  sr.from_warehouse_id = 1
ORDER  BY sr.created_at DESC;

-- ============================================================
-- WAREHOUSES PAGE: All warehouse info with manager name
-- Used by: GET /api/warehouses
-- ============================================================
SELECT w.id, w.name, w.store, w.location, w.state,
       w.country, w.capacity, w.description, w.is_active,
       u.fullname  AS manager_name,
       u.username  AS manager_username
FROM   warehouses w
LEFT JOIN users   u ON u.id = w.manager_id
WHERE  w.is_active = 1
ORDER  BY w.name;

-- ============================================================
-- USERS PAGE: User list (role-filtered)
-- Used by: GET /api/users
-- ============================================================

-- Admin: all users
SELECT u.id, u.username, u.fullname, u.email, u.role,
       u.department, u.designation, u.phone,
       u.is_active, u.last_login, u.created_at,
       w.name     AS warehouse_name,
       m.username AS manager_username
FROM   users      u
LEFT JOIN warehouses w ON w.id = u.warehouse_id
LEFT JOIN users      m ON m.id = u.manager_id
ORDER  BY u.role, u.fullname;

-- Manager: only their own team (users they manage)
SELECT u.id, u.username, u.fullname, u.email, u.role,
       u.department, u.phone, u.is_active,
       w.name AS warehouse_name
FROM   users      u
LEFT JOIN warehouses w ON w.id = u.warehouse_id
WHERE  u.manager_id = 2             -- placeholder: req.session.userId
ORDER  BY u.fullname;

-- ============================================================
-- ANALYTICS / STATS: Category-wise stock summary
-- Used by: GET /api/stats/category
-- ============================================================
SELECT i.category,
       COUNT(DISTINCT i.id)              AS product_count,
       COALESCE(SUM(s.quantity), 0)      AS total_qty,
       COALESCE(SUM(s.quantity * i.unit_price), 0) AS total_value
FROM   inventory i
LEFT JOIN stock  s ON s.inventory_id = i.id
WHERE  i.is_active = 1
GROUP  BY i.category
ORDER  BY total_value DESC;

-- State-wise stock analysis
-- Used by: GET /api/stats/state
SELECT w.state,
       COUNT(DISTINCT w.id)                       AS warehouse_count,
       COALESCE(SUM(s.quantity), 0)               AS total_qty,
       COALESCE(SUM(s.quantity * i.unit_price), 0) AS total_value
FROM   warehouses w
JOIN   stock      s ON  s.warehouse_id  = w.id
JOIN   inventory  i ON  i.id            = s.inventory_id
WHERE  w.is_active = 1 AND i.is_active = 1
GROUP  BY w.state
ORDER  BY total_value DESC;

-- ============================================================
-- AUDIT / LOGIN LOGS: Security and activity history
-- Used by: GET /api/audit  (Admin only)
-- ============================================================
SELECT ll.id, ll.username, ll.success, ll.ip_address,
       ll.notes, ll.created_at,
       u.fullname AS user_fullname,
       u.role     AS user_role
FROM   login_logs ll
LEFT JOIN users   u ON u.id = ll.user_id
ORDER  BY ll.created_at DESC
LIMIT  200;

-- ============================================================
-- ANALYTICS VIEWS (pre-defined, query directly)
-- ============================================================

-- Overall inventory overview (uses the VIEW created above)
SELECT * FROM inventory_overview ORDER BY total_value DESC;

-- Warehouse-level stock details (uses the VIEW created above)
SELECT * FROM warehouse_stock
WHERE  warehouse_name = 'Chennai Central Hub'   -- optional filter
ORDER  BY item_name;
