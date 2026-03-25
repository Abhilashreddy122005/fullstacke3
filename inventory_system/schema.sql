-- ============================================================
-- COMPLETE INVENTORY MANAGEMENT SYSTEM - REAL-WORLD SCHEMA
-- DROP & RECREATE FROM SCRATCH
-- ============================================================
-- Instructions:
--   Run this entire script in MySQL Workbench / CLI
--   It will erase all existing data and create fresh tables
--   with realistic Indian FMCG/Electronics inventory data
-- ============================================================

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
-- SAMPLE DATA - REAL-WORLD INDIAN FMCG+ELECTRONICS SCENARIO
-- ============================================================
-- ============================================================


-- ============================================================
-- ADMIN
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role) VALUES
('admin', 'Admin@2024', 'admin@invsys.co.in', 'Rajesh Mehta (System Admin)', '9900000001', 'admin');

-- ============================================================
-- REGIONAL MANAGERS (6 locations across India)
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role) VALUES
('mgr_chennai',   'Mgr@Chennai1',   'mgr.chennai@invsys.co.in',   'Suresh Rajan (South Zone - Tamil Nadu)',   '9811101001', 'manager'),
('mgr_mumbai',    'Mgr@Mumbai1',    'mgr.mumbai@invsys.co.in',    'Priya Kapoor (West Zone - Maharashtra)',   '9811102001', 'manager'),
('mgr_delhi',     'Mgr@Delhi1',     'mgr.delhi@invsys.co.in',     'Vikram Chaudhary (North Zone - Delhi)',    '9811103001', 'manager'),
('mgr_bangalore', 'Mgr@Blr1',       'mgr.bangalore@invsys.co.in', 'Ananya Krishnamurthy (South Zone - KA)',  '9811104001', 'manager'),
('mgr_hyderabad', 'Mgr@Hyd1',       'mgr.hyderabad@invsys.co.in', 'Kiran Reddy (South Zone - Telangana)',    '9811105001', 'manager'),
('mgr_kolkata',   'Mgr@Kol1',       'mgr.kolkata@invsys.co.in',   'Debashish Basu (East Zone - West Bengal)','9811106001', 'manager');

-- ============================================================
-- STAFF USERS - CHENNAI TEAM (manager_id = 2)
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role, manager_id) VALUES
('user_ch_001', 'User@123', 'ravi.kumar@invsys.co.in',    'Ravi Kumar - Warehouse Ops',      '9800201001', 'user', 2),
('user_ch_002', 'User@123', 'priya.shankar@invsys.co.in', 'Priya Shankar - Stock Auditor',   '9800201002', 'user', 2),
('user_ch_003', 'User@123', 'arjun.nair@invsys.co.in',   'Arjun Nair - Dispatch Coord.',    '9800201003', 'user', 2),
('user_ch_004', 'User@123', 'lakshmi.t@invsys.co.in',    'Lakshmi T. - Receiving Clerk',    '9800201004', 'user', 2);

-- ============================================================
-- STAFF USERS - MUMBAI TEAM (manager_id = 3)
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role, manager_id) VALUES
('user_mb_001', 'User@123', 'deepak.patel@invsys.co.in',  'Deepak Patel - Hub Operator',     '9800302001', 'user', 3),
('user_mb_002', 'User@123', 'anjali.verma@invsys.co.in',  'Anjali Verma - Stock Controller',  '9800302002', 'user', 3),
('user_mb_003', 'User@123', 'rohan.gupta@invsys.co.in',   'Rohan Gupta - Logistics Lead',     '9800302003', 'user', 3),
('user_mb_004', 'User@123', 'sneha.joshi@invsys.co.in',   'Sneha Joshi - Inventory Analyst',  '9800302004', 'user', 3);

-- ============================================================
-- STAFF USERS - DELHI TEAM (manager_id = 4)
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role, manager_id) VALUES
('user_dl_001', 'User@123', 'vikram.singh@invsys.co.in',  'Vikram Singh - NCR Main Ops',     '9800403001', 'user', 4),
('user_dl_002', 'User@123', 'neha.kapoor@invsys.co.in',   'Neha Kapoor - Inventory Lead',    '9800403002', 'user', 4),
('user_dl_003', 'User@123', 'sameer.khan@invsys.co.in',   'Sameer Khan - Dispatch Manager',  '9800403003', 'user', 4);

-- ============================================================
-- STAFF USERS - BANGALORE TEAM (manager_id = 5)
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role, manager_id) VALUES
('user_bg_001', 'User@123', 'karthik.reddy@invsys.co.in', 'Karthik Reddy - Tech Hub Ops',   '9800504001', 'user', 5),
('user_bg_002', 'User@123', 'divya.iyer@invsys.co.in',    'Divya Iyer - Stock Analyst',      '9800504002', 'user', 5),
('user_bg_003', 'User@123', 'suresh.kumar@invsys.co.in',  'Suresh Kumar - Audit Lead',       '9800504003', 'user', 5);

-- ============================================================
-- STAFF USERS - HYDERABAD TEAM (manager_id = 6)
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role, manager_id) VALUES
('user_hyd_001', 'User@123', 'krishna.rao@invsys.co.in',  'Krishna Rao - Hub Coordinator',   '9800605001', 'user', 6),
('user_hyd_002', 'User@123', 'swathi.das@invsys.co.in',   'Swathi Das - Inventory Clerk',    '9800605002', 'user', 6),
('user_hyd_003', 'User@123', 'ramesh.nair@invsys.co.in',  'Ramesh Nair - Stock Supervisor',  '9800605003', 'user', 6);

-- ============================================================
-- STAFF USERS - KOLKATA TEAM (manager_id = 7)
-- ============================================================
INSERT INTO users (username, password, email, fullname, phone, role, manager_id) VALUES
('user_kol_001', 'User@123', 'soumen.das@invsys.co.in',    'Soumen Das - East Hub Ops',      '9800706001', 'user', 7),
('user_kol_002', 'User@123', 'tanmoy.ghosh@invsys.co.in',  'Tanmoy Ghosh - Stock Controller','9800706002', 'user', 7),
('user_kol_003', 'User@123', 'rina.banerjee@invsys.co.in', 'Rina Banerjee - Audit Officer',  '9800706003', 'user', 7);

-- ============================================================
-- WAREHOUSES (one primary per city, multi-zone for Mumbai/Delhi)
-- ============================================================
INSERT INTO warehouses (name, store, location, state, country, capacity, manager_id, description) VALUES
('Chennai South Distribution Hub',   'Block A - Zone 1', 'Ambattur Industrial Estate, Chennai', 'Tamil Nadu',   'India', 12000,  2, 'Primary distribution center for South Tamil Nadu. Temperature-controlled storage.'),
('Mumbai West Fulfillment Center',   'DC Zone 2',        'Bhiwandi Logistics Park, Thane',       'Maharashtra',  'India', 18000,  3, 'Largest hub serving Mumbai Metro, Pune, Nashik corridors.'),
('Delhi NCR Mega Hub',               'Storage Complex',  'IMT Manesar, Gurugram Sector 8',       'Delhi',        'India', 15000,  4, 'North India distribution hub. Serves Delhi, UP, Haryana, Punjab.'),
('Bangalore Tech Park Warehouse',    'Logistics Center', 'Peenya Industrial Area, Bangalore',    'Karnataka',    'India', 10000,  5, 'Electronics and tech products specialized facility.'),
('Hyderabad Outer Ring Hub',         'Fulfillment Unit', 'Patancheru Industrial Area, Hyd',      'Telangana',    'India', 9500,   6, 'Serves twin cities and Andhra Pradesh nearby districts.'),
('Kolkata East Logistics Center',    'East Zone Hub',    'Dankuni Industrial Complex, Hooghly',  'West Bengal',  'India', 8000,   7, 'Eastern India distribution, serves WB, Odisha, NE states.'),
('Mumbai Express Satellite Hub',     'Annex B',          'Kurla Industrial Estate, Mumbai',      'Maharashtra',  'India', 6000,   3, 'Last-mile fulfilment for inner Mumbai zones.'),
('Delhi Sub-Hub Noida',              'Annex Unit',       'Sector 63, Noida, UP',                 'Uttar Pradesh','India', 5000,   4, 'Overflow hub for Delhi. Handles Noida and Greater Noida.');

-- ============================================================
-- INVENTORY - 25 Realistic Products (FMCG + Electronics + Industrial)
-- All created by admin (user_id = 1)
-- ============================================================
INSERT INTO inventory (name, sku, category, description, unit_price, reorder_level, user_id, supplier, brand, unit_of_measure) VALUES
-- ELECTRONICS
('Samsung Galaxy A54 5G 128GB',         'PHONE-SAM-A54-128',   'Electronics',  'Android smartphone, 6.4" AMOLED, 50MP triple cam, 5000mAh',  24999.00, 20,  1, 'Samsung India Pvt Ltd',         'Samsung',   'Units'),
('Apple iPhone 14 Plus 256GB Blue',     'PHONE-APL-14P-256',   'Electronics',  'A15 Bionic, 6.7", 12MP, 60Hz, MagSafe compatible',            74999.00, 10,  1, 'Apple Authorised Distributor',  'Apple',     'Units'),
('boAt Rockerz 450 Bluetooth Headphone','AUDIO-BOT-R450',       'Electronics',  'On-ear BT 5.0, 70hr battery, 40mm drivers',                  2199.00,  50,  1, 'Imagine Marketing Ltd',         'boAt',      'Units'),
('HP LaserJet Pro M428fdw Printer',     'PRINT-HP-M428FDW',    'Electronics',  'Monochrome laser MFP, WiFi, duplex, ADF, 38ppm',              28999.00, 5,   1, 'HP India Pvt Ltd',              'HP',        'Units'),
('Mi 43" 4K Smart TV X Series',         'TV-MI-43X4K',         'Electronics',  '43-inch 4K UHD, Dolby Vision, PatchWall, Android TV 11',      29999.00, 8,   1, 'Xiaomi India',                  'Mi',        'Units'),
('Lenovo IdeaPad Slim 3 Ryzen 5',       'LAPTOP-LEN-IP3-R5',   'Electronics',  '15.6" FHD, Ryzen 5 5500U, 8GB RAM, 512GB SSD, Win11',         48999.00, 5,   1, 'Lenovo India',                  'Lenovo',    'Units'),
('Havells Instanio 5L Water Heater',    'APPLNC-HAV-IH5L',     'Appliances',   'Instant water heater, ISI marked, 4-star energy rating',       5499.00,  30,  1, 'Havells India Ltd',             'Havells',   'Units'),
('Usha Aerostyle 1200W Iron',           'APPLNC-USHA-1200',    'Appliances',   'Steam iron, 1200W, ceramic soleplate, auto-shut-off',           1299.00,  75,  1, 'Usha International',            'Usha',      'Units'),

-- FMCG / PERSONAL CARE
('Colgate Strong Teeth Toothpaste 500g','FMCG-COLT-SR500',     'Personal Care','Calcium Boost formula, bulk pack 500g',                          180.00,  500, 1, 'Colgate-Palmolive India',       'Colgate',   'Pieces'),
('Dove Intense Repair Shampoo 650ml',   'FMCG-DOVE-SH650',     'Personal Care','Keratin Actives strengthen damaged hair, 650ml pump',            499.00,  300, 1, 'HUL Distribution',              'Dove',      'Bottles'),
('Dettol Original Handwash 500ml',      'FMCG-DETT-HW500',     'Personal Care','Antibacterial liquid handwash, 10X protection',                  279.00,  400, 1, 'Reckitt India Private Ltd',     'Dettol',    'Bottles'),
('Lipton Yellow Label Tea 900g',        'FMCG-LIPT-TEA900',    'Beverages',    'Black tea blend, Assam & Darjeeling leaves, 900g pack',          649.00,  200, 1, 'Hindustan Unilever Ltd',        'Lipton',    'Packets'),
('Parle-G Original Biscuits 800g',      'FMCG-PRLG-800',       'Food',         'Classic glucose biscuits, bulk 800g pack',                        79.00,  800, 1, 'Parle Products Pvt Ltd',        'Parle-G',   'Packets'),
('Maggi 2-Minute Noodles Masala 70g x12','FMCG-MAGG-M70X12',  'Food',         'Carton of 12 x 70g masala noodles',                              168.00,  600, 1, 'Nestle India Ltd',              'Maggi',     'Cartons'),
('Surf Excel Matic Liquid 2L',          'FMCG-SUEX-LQ2L',      'Household',    'Front-load washing machine liquid detergent, 2L bottle',          440.00,  250, 1, 'Hindustan Unilever Ltd',        'Surf Excel', 'Bottles'),
('Harpic Power Plus Toilet Cleaner 1L', 'FMCG-HARP-PP1L',      'Household',    'Max strength, 99.9% germ kill, thick liquid 1L',                  199.00,  350, 1, 'Reckitt India Private Ltd',     'Harpic',    'Bottles'),

-- OFFICE & STATIONERY
('A4 Copier Paper 75 GSM - 500 Sheets', 'STAT-A4-75G-500',     'Stationery',   'Premium A4 copy paper ream, 500 sheets, bright white',           499.00,  300, 1, 'JK Paper Ltd',                  'JK Copier', 'Reams'),
('Pilot V7 Hi-Tecpoint Pen - Box 12',   'STAT-PLOV7-BX12',     'Stationery',   'Liquid ink roller ball, 0.7mm, blue ink, box of 12',             960.00,  100, 1, 'Pilot Pen India',               'Pilot',     'Boxes'),
('Classmate Spiral Notebook 200 Pages', 'STAT-CM-NB200',        'Stationery',   'A4 spiral-bound notebook, 70GSM ruled pages, 200 pages',         159.00,  500, 1, 'ITC Classmate',                 'Classmate', 'Units'),

-- INDUSTRIAL / HARDWARE
('Stanley FatMax 5-Piece Screwdriver Set','TOOL-STN-SD5PC',    'Tools',        'Phillips & flathead set, chrome-vanadium steel, ergonomic grips', 1299.00, 40,  1, 'Stanley Black & Decker India', 'Stanley',   'Sets'),
('3M 8210 N95 Respirator Mask - Box 10', 'PPE-3M-8210-B10',    'Safety',       'NIOSH approved N95 mask, box of 10, adjustable nose clip',        975.00,  200, 1, '3M India Ltd',                  '3M',        'Boxes'),
('Fevicol SH Adhesive 1kg',             'ADHS-FVC-SH1KG',      'Hardware',     'White craft adhesive, water resistant, 1kg container',            320.00,  150, 1, 'Pidilite Industries Ltd',       'Fevicol',   'Units'),
('Philips T-Bulb 12W LED Pack of 6',    'ELEC-PHP-LED12W6',    'Electricals',  '12W LED bulb, warm white 3000K, B22 base, 6-pack',               899.00,  200, 1, 'Signify India (Philips)',       'Philips',   'Packs'),
('Havells 2.5 Sqmm Wire 90m Roll',      'ELEC-HAV-W25-90M',    'Electricals',  'FR PVC insulated copper wire, 2.5 sq.mm, red, 90m roll',         3799.00, 30,  1, 'Havells India Ltd',             'Havells',   'Rolls'),
('Bosch 13mm Reversible Drill Machine', 'TOOL-BOSH-DRL13',     'Tools',        '500W corded drill, 13mm keyless chuck, variable speed',           3999.00, 15,  1, 'Robert Bosch India Pvt Ltd',   'Bosch',     'Units');

-- ============================================================
-- STOCK - Distribute 25 products across 8 warehouses
-- Realistic Indian supply chain distribution
-- ============================================================

-- -------  ELECTRONICS  -------

-- Samsung Galaxy A54
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(1, 1, 145), (1, 2, 220), (1, 3, 190), (1, 4, 120), (1, 5, 98), (1, 6, 75), (1, 7, 55), (1, 8, 60);

-- Apple iPhone 14 Plus
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(2, 1, 35), (2, 2, 60), (2, 3, 50), (2, 4, 42), (2, 5, 28), (2, 6, 18), (2, 7, 25), (2, 8, 20);

-- boAt Rockerz 450
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(3, 1, 280), (3, 2, 420), (3, 3, 360), (3, 4, 250), (3, 5, 195), (3, 6, 140), (3, 7, 110), (3, 8, 95);

-- HP LaserJet Printer
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(4, 1, 22), (4, 2, 38), (4, 3, 30), (4, 4, 25), (4, 5, 15), (4, 6, 10), (4, 7, 12), (4, 8, 8);

-- Mi 43" 4K TV
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(5, 1, 48), (5, 2, 80), (5, 3, 65), (5, 4, 52), (5, 5, 35), (5, 6, 22), (5, 7, 18), (5, 8, 15);

-- Lenovo IdeaPad
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(6, 1, 30), (6, 2, 55), (6, 3, 48), (6, 4, 62), (6, 5, 25), (6, 6, 14), (6, 7, 20), (6, 8, 18);

-- -------  APPLIANCES  -------

-- Havells Water Heater
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(7, 1, 95), (7, 2, 150), (7, 3, 120), (7, 4, 85), (7, 5, 70), (7, 6, 45), (7, 7, 35), (7, 8, 30);

-- Usha Iron
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(8, 1, 240), (8, 2, 380), (8, 3, 310), (8, 4, 225), (8, 5, 180), (8, 6, 120), (8, 7, 95), (8, 8, 85);

-- -------  PERSONAL CARE  -------

-- Colgate Toothpaste
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(9, 1, 1200), (9, 2, 1900), (9, 3, 1650), (9, 4, 1100), (9, 5, 850), (9, 6, 620), (9, 7, 480), (9, 8, 395);

-- Dove Shampoo
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(10, 1, 680), (10, 2, 1050), (10, 3, 920), (10, 4, 620), (10, 5, 480), (10, 6, 340), (10, 7, 260), (10, 8, 210);

-- Dettol Handwash
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(11, 1, 950), (11, 2, 1480), (11, 3, 1220), (11, 4, 840), (11, 5, 660), (11, 6, 475), (11, 7, 360), (11, 8, 295);

-- -------  BEVERAGES  -------

-- Lipton Tea
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(12, 1, 430), (12, 2, 680), (12, 3, 560), (12, 4, 380), (12, 5, 290), (12, 6, 210), (12, 7, 155), (12, 8, 125);

-- -------  FOOD  -------

-- Parle-G Biscuits
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(13, 1, 2200), (13, 2, 3500), (13, 3, 2900), (13, 4, 1900), (13, 5, 1500), (13, 6, 1100), (13, 7, 850), (13, 8, 680);

-- Maggi Noodles
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(14, 1, 1600), (14, 2, 2550), (14, 3, 2100), (14, 4, 1400), (14, 5, 1100), (14, 6, 800), (14, 7, 620), (14, 8, 495);

-- -------  HOUSEHOLD  -------

-- Surf Excel
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(15, 1, 720), (15, 2, 1150), (15, 3, 940), (15, 4, 640), (15, 5, 500), (15, 6, 355), (15, 7, 275), (15, 8, 220);

-- Harpic
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(16, 1, 880), (16, 2, 1380), (16, 3, 1140), (16, 4, 760), (16, 5, 590), (16, 6, 430), (16, 7, 330), (16, 8, 265);

-- -------  STATIONERY  -------

-- A4 Paper
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(17, 1, 680), (17, 2, 1080), (17, 3, 890), (17, 4, 600), (17, 5, 465), (17, 6, 340), (17, 7, 260), (17, 8, 210);

-- Pilot Pen Box
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(18, 1, 310), (18, 2, 490), (18, 3, 405), (18, 4, 280), (18, 5, 215), (18, 6, 155), (18, 7, 120), (18, 8, 95);

-- Classmate Notebook
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(19, 1, 920), (19, 2, 1460), (19, 3, 1200), (19, 4, 820), (19, 5, 630), (19, 6, 460), (19, 7, 355), (19, 8, 280);

-- -------  TOOLS  -------

-- Stanley Screwdriver Set
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(20, 1, 115), (20, 2, 180), (20, 3, 150), (20, 4, 102), (20, 5, 78), (20, 6, 55), (20, 7, 42), (20, 8, 35);

-- 3M N95 Mask Box
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(21, 1, 420), (21, 2, 670), (21, 3, 550), (21, 4, 380), (21, 5, 290), (21, 6, 210), (21, 7, 160), (21, 8, 130);

-- Fevicol
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(22, 1, 360), (22, 2, 570), (22, 3, 470), (22, 4, 315), (22, 5, 245), (22, 6, 175), (22, 7, 135), (22, 8, 110);

-- Philips LED Pack
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(23, 1, 580), (23, 2, 920), (23, 3, 760), (23, 4, 510), (23, 5, 395), (23, 6, 285), (23, 7, 220), (23, 8, 175);

-- Havells Wire
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(24, 1, 145), (24, 2, 230), (24, 3, 190), (24, 4, 128), (24, 5, 98), (24, 6, 72), (24, 7, 55), (24, 8, 44);

-- Bosch Drill
INSERT INTO stock (inventory_id, warehouse_id, quantity) VALUES
(25, 1, 68), (25, 2, 108), (25, 3, 90), (25, 4, 60), (25, 5, 46), (25, 6, 33), (25, 7, 25), (25, 8, 20);

-- ============================================================
-- STOCK HISTORY - Seed with realistic recent transactions
-- ============================================================

-- Initial stock setup entries
INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by) VALUES
(1, 1, 0, 145, 'initial', 'Initial stock setup - Samsung A54, Chennai', 1),
(1, 2, 0, 220, 'initial', 'Initial stock setup - Samsung A54, Mumbai', 1),
(1, 3, 0, 190, 'initial', 'Initial stock setup - Samsung A54, Delhi', 1),
(2, 2, 0, 60,  'initial', 'Initial stock setup - iPhone 14 Plus, Mumbai', 1),
(9, 1, 0, 1200,'initial', 'Initial stock setup - Colgate, Chennai', 1),
(13,2, 0, 3500,'initial', 'Initial stock setup - Parle-G, Mumbai', 1);

-- Recent add operations (simulating replenishments)
INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by, changed_at) VALUES
(3, 2, 380, 420, 'add',    'Replenishment from Samsung vendor - Q1 2024', 3, '2025-01-15 10:30:00'),
(10, 3, 850, 920,'add',    'HUL March batch delivery received', 4, '2025-01-18 14:15:00'),
(7, 1, 80, 95,  'add',    'Havells restock - winter season demand', 2, '2025-02-05 09:45:00'),
(5, 2, 60, 80,  'add',    'Mi TV received - Flipkart B2B partnership', 3, '2025-02-12 11:00:00'),
(14, 5, 980, 1100,'add',  'Nestle Maggi April shipment', 6, '2025-02-20 16:30:00'),
(22, 4, 280, 315,'add',   'Pidilite Fevicol quarterly order received', 5, '2025-03-01 08:30:00');

-- Recent remove operations (simulating dispatch/sales)
INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by, changed_at) VALUES
(1, 4, 150, 120, 'remove', 'Dispatched 30 units to Croma Bangalore stores', 5, '2025-01-20 13:00:00'),
(2, 3, 65, 50,   'remove', 'B2B order - Reliance Digital Delhi NCR', 4, '2025-01-25 15:30:00'),
(13, 1, 2500, 2200,'remove','Dispatch to D-Mart Chennai outlets Q4 batch', 2, '2025-02-08 10:00:00'),
(9, 6, 700, 620, 'remove', 'Kolkata distribution to retail chains', 7, '2025-02-14 12:00:00'),
(11, 2, 1600, 1480,'remove','HyperCity Mumbai monthly replenishment', 3, '2025-02-22 14:45:00'),
(6, 4, 75, 62,  'remove',  '13 units to IT company - Infosys Bangalore order', 5, '2025-03-05 09:15:00'),
(23, 3, 820, 760,'remove', 'Dispatch to electrician contractor network, Delhi', 4, '2025-03-10 11:30:00');

-- Stock transfers between warehouses
INSERT INTO stock_history (inventory_id, warehouse_id, old_quantity, new_quantity, change_type, notes, changed_by, changed_at) VALUES
(1, 2, 240, 220, 'move', 'Transfer 20 units Mumbai→Kolkata to balance demand', 1, '2025-01-28 16:00:00'),
(1, 6, 55, 75,  'move',  'Transfer 20 units Mumbai→Kolkata receive', 1, '2025-01-28 16:00:00'),
(15, 3, 1000, 940,'move','Transfer 60 units Delhi→Noida Hub overflow stock', 4, '2025-02-11 09:00:00'),
(15, 8, 160, 220,'move', 'Transfer 60 units Delhi→Noida Hub receive', 4, '2025-02-11 09:00:00');

-- ============================================================
-- VERIFICATION QUERIES (run after setup)
-- ============================================================
-- SELECT TABLE_NAME, TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='inventory_db';
-- SELECT u.username, u.role, m.username AS manager FROM users u LEFT JOIN users m ON u.manager_id=m.id;
-- SELECT i.name, SUM(s.quantity) as total_stock, i.unit_price, SUM(s.quantity)*i.unit_price AS total_value FROM inventory i JOIN stock s ON i.id=s.inventory_id GROUP BY i.id ORDER BY total_value DESC;
-- SELECT w.name, SUM(s.quantity) as units, SUM(s.quantity*i.unit_price) as value FROM warehouses w JOIN stock s ON w.id=s.warehouse_id JOIN inventory i ON s.inventory_id=i.id GROUP BY w.id ORDER BY units DESC;
-- ============================================================
-- END OF SCRIPT
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
