# Relational Inventory Control & Stock Tracking System

> **NOTE:** This README is the only documentation file you need. For **complete login credentials and testing guide**, see **[LOGIN_CREDENTIALS.md](LOGIN_CREDENTIALS.md)**.  
> All setup, schema and usage instructions are contained here. Use the accompanying `schema.sql` file to create the database – no other SQL files are required.


**A professional, production-ready inventory management application** built with modern technologies for beginners to advanced users.

**Features:**
- 🔐 User authentication & login system with 3-tier role hierarchy (Admin → Manager → User)
- 👤 Admin creates managers; managers create their own team staff
- 🔧 Managers assign users to themselves; users inherit manager's warehouse access
- 📦 Full CRUD (Create, Read, Update, Delete) operations for inventory items
- 📦 **Real-time Stock Management** with role-based warehouse access
- 🏬 Multi-level warehouse & location management (store, state, country)
- 👥 Manager-specific dashboards showing only their team and warehouses
- 📊 Real-time stock statistics and reports by country/state/warehouse
- 🔍 Search and filter capabilities with role-based data isolation
- 💼 Professional, responsive UI design with sidebar navigation
- 🗄️ MySQL relational database with role-based data isolation and audit trails

---

## Requirements & Prerequisites

### What You Need to Install (Before Starting)

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Choose "LTS" version for Windows
   - Installation is straightforward - use default settings

2. **MySQL Server** (v5.7 or higher)
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Choose "MySQL Community Server" for Windows
   - Choose the latest GA Release
   - Run the installer and install with default settings
   - **Remember your MySQL root password** - you'll need it later!

3. **MySQL Workbench** (v8.0 or higher)
   - Usually comes with MySQL Server
   - If not, download from: https://dev.mysql.com/downloads/workbench/
   - This is the visual tool to create and manage databases

---

## Complete Step-by-Step Setup Guide

### STEP 1: Start MySQL Server on Windows

The MySQL server must be running before you can use it.

**Option A: Using Services (Recommended)**
1. Press `Win + R` on your keyboard
2. Type `services.msc` and press Enter
3. In the Services window, scroll down and find **"MySQL80"** (or similar version number)
4. Right-click on it and select **"Start"**
5. It should say "Running" in the Status column
6. You can close this window

**Option B: Using MySQL Installer**
1. Open MySQL Installer from your Start Menu
2. Click "Server" on the left
3. The status should show "Running"

---

### STEP 2: Open MySQL Workbench & Connect to Local Server

1. Open **MySQL Workbench** from your Start Menu
2. You'll see a connection named **"Local instance MySQL80"** (or similar)
3. **Double-click** on it to connect
4. Enter your **root password** (the password you set during MySQL installation)
5. Click **"OK"**
6. You should now see the Workbench interface with a SQL editor

---

### STEP 3: Create the Database & Tables (The Most Important Part!)

Now you'll create the exact, finalized database structure needed for this application.
If you previously created a schema, you may safely delete it before running the script (the SQL
file drops `inventory_db` at the start). The schema has been designed to support multi‑location
warehouses and role‑based access, with complete stats/graph support built into the front end.

**Follow these steps EXACTLY:**

1. In MySQL Workbench, you should see a blank SQL editor at the top
2. **Copy the entire SQL code below** (from `-- Create database...` to the last line)

```sql
-- Create database and tables
CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  quantity INT NOT NULL DEFAULT 0,
  location VARCHAR(255),
  description TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- The full script includes an `admin` account, sample warehouses, and other
-- schema changes. Please refer to the `schema.sql` file for
-- the complete content rather than the simplified snippet shown originally.```

3. **In the SQL editor window**, select all the code (Ctrl+A) and delete it
4. **Open the file** `schema.sql` from the project directory and **copy its entire contents**
5. **Paste that code** into the editor (this script creates the full modern schema including warehouses and an initial admin user)
6. Look at the top toolbar - you should see a **lightning bolt icon** ⚡
7. **Click the lightning bolt** to execute the SQL script
8. You should see green checkmarks appearing - this means success!

**What was created:**
- **Database**: `inventory_db` - The main database container
- **Table 1 - users**: Stores login credentials with role field (admin, manager, user)
  - `id`: Unique identifier for each user
  - `username`: Login username (admin)
  - `password`: Login password (admin123)
  - `email`: User email
  - `created_at`: When user was created
  
- **Table 2 - items**: Stores inventory items
  - `id`: Unique product ID
  - `name`: Product name
  - `sku`: Product code (SKU)
  - `quantity`: Number in stock
  - `location`: Where item is stored
  - `description`: Product details
  - `user_id`: Which user owns this item (links to users table)
  - `created_at`: When item was added

 **Sample Data Inserted:**
 - 1 admin user with username `admin` and password `admin123`
 - 1 manager user with username `manager1` and password `manager123` (can manage regular users and warehouses)

---

### STEP 4: Verify Your Database Was Created (Important!)

1. In MySQL Workbench, on the left sidebar, click the **refresh icon** 🔄 (next to "SCHEMAS")
2. You should now see `inventory_db` listed
3. Click the arrow next to `inventory_db` to expand it
4. You should see two tables:
   - `items` (your products)
   - `users` (your user accounts)
5. **If you see these - congratulations! Your database is ready!**

---

### STEP 5: Get the Project Files Ready

1. Navigate to your project folder: `c:\Users\sanna\Downloads\E3\inventory_system`
2. You should see these files/folders:
   - `.env.example` - Database configuration template
   - `package.json` - Node dependencies list
   - `server.js` - Backend server code
   - `db.sql` - The SQL file (already used)
   - `public/` folder with `index.html`, `styles.css`, `app.js`, `login.html`

---

### STEP 6: Create .env File with Your Database Credentials

The `.env` file tells the application how to connect to your database.

1. In your project folder `inventory_system`, find `.env.example`
2. **Right-click** and select **"Copy"**
3. **Right-click** in empty space and select **"Paste"**
4. Rename the pasted file from `.env.example (copy)` to **`.env`** (remove "example")
5. **Right-click** on `.env` and select **"Edit with Code"** (or open with Notepad)

**Your `.env` file should look like this:**

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=inventory_db
DB_PORT=3306
-- 2a. MANAGER ACCOUNT (optional):
--    - Use username `manager1` / password `manager123` after you have an admin
--    - Managers can log in to view and edit inventory, warehouses and also create regular users
--    - They cannot add or modify other managers/admins, and they only see the "Users" tab with regular accounts
```

**Now change the values:**
- `DB_HOST`: Keep as `localhost` ✓
--    - Admin and managers can manage warehouses and user accounts (managers limited to regular users)
- `DB_USER`: Keep as `root` ✓
- `DB_PASSWORD`: **Replace `your_mysql_password` with the password you set during MySQL installation**
  - For example: if your password is `mypass123`, write: `DB_PASSWORD=mypass123`
  - If you didn't set a password (left it blank), just write: `DB_PASSWORD=`
- `DB_NAME`: Keep as `inventory_db` ✓
- `DB_PORT`: Keep as `3306` ✓

**Save the file** (Ctrl+S)

---

### STEP 7: Install Node Dependencies

Now you need to install the necessary software packages for Node.js.

1. Open **PowerShell** as Administrator:
   - Press `Win + R`
   - Type `powershell`
   - Press `Ctrl + Shift + Enter` to open as Administrator

2. Navigate to your project folder:
```powershell
cd "c:\Users\sanna\Downloads\E3\inventory_system"
```

3. Install dependencies by typing:
```powershell
npm install
```

**This will:**
- Download `express` (web server framework)
- Download `mysql2` (database connector)
- Download `dotenv` (reads your .env file)
- Download `cors` (handles requests from browser)
- Download `express-session` (handles login sessions)
- Create a `node_modules` folder with all these packages

**This takes 1-2 minutes. Wait for it to complete.**

---

### STEP 8: Start the Server

You're almost there! Now start the application.

1. In the same PowerShell window, type:
```powershell
npm run start
```

2. You should see this message:
```
Server listening on http://localhost:3000
```

**The server is now running!** ✓

---

### STEP 9: Open the Application in Your Browser

1. Open your web browser (Chrome, Edge, Firefox, etc.)
2. Go to: `http://localhost:3000`
3. You should see the **LOGIN PAGE** with:
   - A purple gradient background
   - A login form (no public registration link)

**Login with:**
- Username: `admin`
- Password: `admin123`

4. After login, you'll see the **INVENTORY DASHBOARD** with:
   - A sidebar on the left containing tabs: Items, Statistics, Warehouses (manager/admin), and Users (admin & manager)
   - Add/Update Item form at top
   - Statistics (Total Items, Total Units, Low Stock)
   - Table showing your sample products
   - Search functionality
   - New sections for managing warehouses and user accounts (visible based on your role)

---

## How to Use the Application

### Adding a New Item

1. Fill out the form at the top:
   - **Item Name**: Required (e.g., "Laptop")
   - **SKU Code**: Optional product code (e.g., "LAPTOP-001")
   - **Quantity**: Number in stock (default 0)
   - **Location**: Where it's stored (e.g., "Shelf A1")
   - **Description**: Optional details

2. Click **"💾 Save Item"** button
3. Item appears in the table below

### Editing an Item

1. In the items table, click the **"✏️ Edit"** button
2. The form above auto-fills with that item's details
3. Change what you need
4. Click **"💾 Save Item"** to update
5. Or click **"↺ Clear"** to cancel

### Deleting an Item

1. Click the **"🗑️ Delete"** button next to an item
2. Confirm the deletion
3. Item is removed from database

### Searching Items

1. Use the **search box** to find items by:
   - Item name (type "Widget")
   - SKU code (type "WIDGET-A")
2. Results update instantly as you type

### Viewing Statistics

1. At the top you'll see 3 stat cards:
   - **Total Items**: How many different products you have
   - **Total Units**: Total quantity across all items
   - **Low Stock**: Items with less than 20 units

### Logging Out

1. Click **"🚪 Logout"** in the sidebar
2. You'll return to the login page

---

## Database Structure Explained

### Users Table

*Analytic views* provide ready‑made queries for reporting and graphs:
- `inventory_overview` computes total quantity, low/out‑of‑stock counts per item
- `warehouse_stock` flattens quantities by warehouse and item

### Users Table

| Column | Type | Purpose |
|--------|------|---------|
| id | INT | Unique user ID |
| username | VARCHAR | Login name |
| password | VARCHAR | Login password |
| email | VARCHAR | Email address |
| created_at | TIMESTAMP | When account was created |

### Items Table

| Column | Type | Purpose |
|--------|------|---------|
| id | INT | Unique product ID |
| name | VARCHAR | Product name |
| sku | VARCHAR | SKU/product code |
| quantity | INT | Quantity in stock |
| location | VARCHAR | Storage location |
| description | TEXT | Product description |
| user_id | INT | Which user owns this |
| created_at | TIMESTAMP | When item was added |

---

## Troubleshooting

### Issue: "Cannot connect to database"
**Solution:**
1. Check MySQL Server is running (Step 1)
2. Check `.env` file has correct password
3. Make sure database `inventory_db` exists (Step 3)

### Issue: "Port 3000 already in use"
**Solution:**
1. Close other applications using port 3000
2. Or change PORT in `.env` to 3001 and restart

### Issue: "Module not found: mysql2"
**Solution:**
1. Run `npm install` again in PowerShell
2. Make sure you're in the right folder: `c:\Users\sanna\Downloads\E3\inventory_system`

### Issue: Login fails
**Solution:**
1. Check username is exactly `admin` (case-sensitive)
2. Check password is exactly `admin123`
3. Verify users table exists in database (Step 4)

### Issue: Can't find `npm` command
**Solution:**
1. Node.js not installed - go to https://nodejs.org/ and install
2. Restart PowerShell after installing Node.js

---

## File Structure Explained

```
inventory_system/
├── server.js              # Main server - runs on port 3000
├── db.sql                 # Database creation script
├── package.json           # Node dependencies list
├── .env                   # Your database credentials (KEEP SECRET!)
├── .env.example           # Template for .env
├── README.md              # This file
└── public/                # Frontend files (served by server)
    ├── index.html         # Main dashboard page
    ├── login.html         # Login page
    ├── app.js             # Dashboard logic
    └── styles.css         # All styling
```

---

## API Endpoints (For Developers)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/user` | Get current user |
| GET | `/api/items` | Get all items |
| POST | `/api/items` | Create new item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |

---

## Production Deployment Tips

**For actual use:**
1. Don't keep password in `.env` file - use environment variables
2. Hash passwords before storing
3. Use HTTPS instead of HTTP
4. Add input validation on server
5. Implement proper error handling
6. Add database backups

---

## Development Mode with Auto-Reload

If you want the server to restart automatically when you change code:

```powershell
npm run dev
```

This requires `nodemon` (already installed) and watches for file changes.

---

## Need Help?

**Common issues checklist:**
- ✓ MySQL Server running?
- ✓ Database `inventory_db` created?
- ✓ `.env` file exists with correct password?
- ✓ `npm install` completed?
- ✓ No errors when running `npm run start`?
- ✓ Can access http://localhost:3000?

---

**Created with ❤️ for beginners**

Version 1.0 | Last Updated: 2026
