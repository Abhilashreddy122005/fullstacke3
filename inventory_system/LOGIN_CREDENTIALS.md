# ðŸ‡®ðŸ‡³ Inventory Control System - India Locations

**System Status:** âœ… Production Ready  
**Version:** 2.0 - India Localized Edition  
**Last Updated:** March 2026

---

## Overview

Comprehensive inventory management system with **5 regional hubs across India**:
- **Chennai** (Tamil Nadu - South)
- **Mumbai** (Maharashtra - West)
- **Delhi** (Delhi NCR - North)
- **Bangalore** (Karnataka - South Central)
- **Hyderabad** (Telangana - Central)

Each region has a dedicated **manager** with a team of **3 warehouse staff**, forming a complete role-based hierarchy (Admin â†’ Manager â†’ User).

---

## System Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    SYSTEM ADMINISTRATOR                          â”‚
â”‚                      (Admin Account)                             â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚          â”‚          â”‚          â”‚          â”‚          â”‚
â”‚    â–¼     â”‚    â–¼     â”‚    â–¼     â”‚    â–¼     â”‚    â–¼     â”‚
â”‚         â”‚          â”‚          â”‚          â”‚          â”‚
â”‚ Chennai  â”‚ Mumbai   â”‚ Delhi    â”‚Bangalore â”‚Hyderabad â”‚
â”‚ Manager  â”‚ Manager  â”‚ Manager  â”‚ Manager  â”‚ Manager  â”‚
â”‚    â”‚     â”‚    â”‚     â”‚    â”‚     â”‚    â”‚     â”‚    â”‚     â”‚
â”‚ â”Œâ”€â”´â”€â”¬â”€â”´â”€â”¬â”€â”´â”€â”¬â”€â”´â”€â”¬â”€â”´â”€â”
â”‚ â”‚ 3 â”‚ 3 â”‚ 3 â”‚ 3 â”‚ 3 â”‚  â†’ Staff Users (15 total)
â”‚ â””â”€â”€â”€â”´â”€â”€â”€â”´â”€â”€â”€â”´â”€â”€â”€â”´â”€â”€â”€â”˜
â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

Total Users: 1 Admin + 5 Managers + 15 Staff = 21 users
Locations: 5 regional hubs
Access Control: Role-based with manager hierarchy
```

---

## Login Credentials

### ðŸ” ADMIN ACCOUNT (Full System Access)

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `admin123` |
| **Email** | admin@inventory.com |
| **Role** | Admin |
| **Permissions** | â€¢ View all warehouses globally<br>â€¢ Create/edit/delete managers<br>â€¢ Manage all users<br>â€¢ Access all stock across all regions<br>â€¢ View analytics globally |

**Use Case:** System setup, user management, global reporting

---

### ðŸ¢ LOCATION MANAGERS (Regional Authority)

Each manager supervises their regional hub and team.

#### Manager 1: CHENNAI (Tamil Nadu)
| Field | Value |
|-------|-------|
| **Username** | `mgr_chennai` |
| **Password** | `mgr123` |
| **Email** | mgr.chennai@inventory.com |
| **Region** | Tamil Nadu |
| **Warehouse** | Chennai Hub - South |
| **Role** | Manager |
| **Team Size** | 3 Staff Members |
| **Permissions** | â€¢ View Chennai warehouse<br>â€¢ Create/assign staff to Chennai<br>â€¢ Update Chennai stock<br>â€¢ View team activity |

**Staff Team:**
- `user_ch_001` / `user123` â†’ Ravi Kumar (Warehouse Coordinator)
- `user_ch_002` / `user123` â†’ Priya Sharma (Operations Officer)
- `user_ch_003` / `user123` â†’ Arjun Singh (Stock Controller)

---

#### Manager 2: MUMBAI (Maharashtra)
| Field | Value |
|-------|-------|
| **Username** | `mgr_mumbai` |
| **Password** | `mgr123` |
| **Email** | mgr.mumbai@inventory.com |
| **Region** | Maharashtra |
| **Warehouse** | Mumbai Central - West |
| **Role** | Manager |
| **Team Size** | 3 Staff Members |
| **Permissions** | â€¢ View Mumbai warehouse<br>â€¢ Create/assign staff to Mumbai<br>â€¢ Update Mumbai stock<br>â€¢ View team activity |

**Staff Team:**
- `user_mb_001` / `user123` â†’ Deepak Patel (Hub 1 Supervisor)
- `user_mb_002` / `user123` â†’ Anjali Verma (Hub 2 Supervisor)
- `user_mb_003` / `user123` â†’ Rohan Gupta (Logistics Coordinator)

---

#### Manager 3: DELHI (Delhi NCR)
| Field | Value |
|-------|-------|
| **Username** | `mgr_delhi` |
| **Password** | `mgr123` |
| **Email** | mgr.delhi@inventory.com |
| **Region** | Delhi |
| **Warehouse** | Delhi MainHub - North |
| **Role** | Manager |
| **Team Size** | 3 Staff Members |
| **Permissions** | â€¢ View Delhi warehouse<br>â€¢ Create/assign staff to Delhi<br>â€¢ Update Delhi stock<br>â€¢ View team activity |

**Staff Team:**
- `user_dl_001` / `user123` â†’ Vikram Singh (Main Hub Lead)
- `user_dl_002` / `user123` â†’ Neha Kapoor (East Branch Manager)
- `user_dl_003` / `user123` â†’ Sameer Khan (Operations Lead)

---

#### Manager 4: BANGALORE (Karnataka)
| Field | Value |
|-------|-------|
| **Username** | `mgr_bangalore` |
| **Password** | `mgr123` |
| **Email** | mgr.bangalore@inventory.com |
| **Region** | Karnataka |
| **Warehouse** | Bangalore Tech Hub |
| **Role** | Manager |
| **Team Size** | 3 Staff Members |
| **Permissions** | â€¢ View Bangalore warehouse<br>â€¢ Create/assign staff to Bangalore<br>â€¢ Update Bangalore stock<br>â€¢ View team activity |

**Staff Team:**
- `user_bg_001` / `user123` â†’ Karthik Reddy (Warehouse Manager)
- `user_bg_002` / `user123` â†’ Divya Iyer (Stock Analyst)
- `user_bg_003` / `user123` â†’ Suresh Kumar (Audit Officer)

---

#### Manager 5: HYDERABAD (Telangana)
| Field | Value |
|-------|-------|
| **Username** | `mgr_hyderabad` |
| **Password** | `mgr123` |
| **Email** | mgr.hyderabad@inventory.com |
| **Region** | Telangana |
| **Warehouse** | Hyderabad Express Hub |
| **Role** | Manager |
| **Team Size** | 3 Staff Members |
| **Permissions** | â€¢ View Hyderabad warehouse<br>â€¢ Create/assign staff to Hyderabad<br>â€¢ Update Hyderabad stock<br>â€¢ View team activity |

**Staff Team:**
- `user_hyd_001` / `user123` â†’ Krishna Rao (Hub Lead)
- `user_hyd_002` / `user123` â†’ Swathi Das (Operations Manager)
- `user_hyd_003` / `user123` â†’ Ramesh Nair (Stock Controller)

---

### ðŸ‘¥ STAFF USERS (Regional Warehouse Staff)

**Total:** 15 staff members (3 per location)

| Username | Password | Full Name | Location | Manager |
|----------|----------|-----------|----------|---------|
| user_ch_001 | user123 | Ravi Kumar | Chennai | mgr_chennai |
| user_ch_002 | user123 | Priya Sharma | Chennai | mgr_chennai |
| user_ch_003 | user123 | Arjun Singh | Chennai | mgr_chennai |
| user_mb_001 | user123 | Deepak Patel | Mumbai | mgr_mumbai |
| user_mb_002 | user123 | Anjali Verma | Mumbai | mgr_mumbai |
| user_mb_003 | user123 | Rohan Gupta | Mumbai | mgr_mumbai |
| user_dl_001 | user123 | Vikram Singh | Delhi | mgr_delhi |
| user_dl_002 | user123 | Neha Kapoor | Delhi | mgr_delhi |
| user_dl_003 | user123 | Sameer Khan | Delhi | mgr_delhi |
| user_bg_001 | user123 | Karthik Reddy | Bangalore | mgr_bangalore |
| user_bg_002 | user123 | Divya Iyer | Bangalore | mgr_bangalore |
| user_bg_003 | user123 | Suresh Kumar | Bangalore | mgr_bangalore |
| user_hyd_001 | user123 | Krishna Rao | Hyderabad | mgr_hyderabad |
| user_hyd_002 | user123 | Swathi Das | Hyderabad | mgr_hyderabad |
| user_hyd_003 | user123 | Ramesh Nair | Hyderabad | mgr_hyderabad |

**Permissions (All Staff):**
- View assigned warehouse stock only
- Update stock quantities
- Cannot create users or managers
- Cannot access other regions

---

## Testing Scenarios

### Scenario 1: Admin Global View
1. Login: `admin` / `admin123`
2. Navigate to **"Locations"** tab
3. See **5 location cards** with:
   - Regional hub name
   - Manager details
   - Team size (3 members each)
   - Total stock count
   - Item count
4. Click any location to **drill down** and see:
   - Detailed team roster
   - Full inventory breakdown
   - Stock statistics (out of stock, low stock)

**Expected Result:** âœ… Admin sees all 5 regions with complete visibility

---

### Scenario 2: Regional Manager Access
1. Login: `mgr_mumbai` / `mgr123`
2. Navigate to **"Locations"** tab
3. See **all 5 location cards** (read-only view)
4. Click **"Mumbai"** location card
5. See:
   - Mumbai team (3 members)
   - Mumbai warehouse inventory
   - Statistics for Mumbai region only

**Expected Result:** âœ… Manager sees all regions but detailed access only to their own warehouse

---

### Scenario 3: Staff User Stock Update
1. Login: `user_ch_001` / `user123` (Chennai staff)
2. Navigate to **"Stock"** tab
3. See **only Chennai warehouse items**
4. Update quantities for items in Chennai
5. Try to access Mumbai items â†’ **Access Denied**

**Expected Result:** âœ… Staff can only see and update their manager's warehouse

---

### Scenario 4: Hierarchy & Permissions
1. Login as `mgr_bangalore` / `mgr123`
2. Click **"Users"** tab
3. Create new staff user:
   - Name: John Smith
   - Role: User (force-assigned to Bangalore)
4. New user can now update Bangalore warehouse stock only

**Expected Result:** âœ… Manager can create users; new users inherit manager's warehouse access

---

## Features & Functionality

### ðŸ“ Location Dashboard
- **5 Location Cards:** Each showing manager, team, and stock summary
- **Drill-Down View:** Click any location to see:
  - Detailed team roster with email
  - Full inventory with SKU and quantity
  - Location-specific statistics
  - Out of stock & low stock alerts

### ðŸ‘¥ Role Hierarchy
- **Admin:** Full system control across all regions
- **Manager:** Control team and warehouse, see global regions
- **User:** Update stock in manager's warehouse only

### ðŸ“¦ Stock Management
- Role-based warehouse access
- Real-time quantity updates
- Low stock warnings
- Location-specific inventory view

### ðŸ“Š Analytics
- **Global view:** All regions combined
- **By State:** Statistics per Indian state/region
- **By Location:** Detailed breakdown at warehouse level
- Charts showing stock distribution, item counts

### ðŸ¢ Warehouse Management
- 5 pre-configured Indian locations
- Manager assignment per warehouse
- Regional organization

---

## API Endpoints (Location-based)

### Public Endpoints (All Authenticated Users)

**GET `/api/locations`**
- Returns all 5 location cards with summary
- Response: Location name, manager, team size, stock, items

**GET `/api/locations/:id`**
- Returns detailed view for location ID
- Response: Warehouse info, team roster, full inventory, statistics

**GET `/api/locations/stats/regional`**
- Returns regional statistics by state
- Response: Region name, warehouse count, stock, items

---

## First-Time Setup

1. **Start the server:**
   ```bash
   npm install
   npm start
   # Server runs on http://localhost:3000
   ```

2. **Login to Dashboard:**
   - Open http://localhost:3000
   - Username: `admin`
   - Password: `admin123`

3. **Explore Locations:**
   - Click **"ðŸŒ Locations"** in sidebar
   - See all 5 India hubs
   - Click any location to view details

4. **Manage Your Region (as Manager):**
   - Login as `mgr_mumbai` / `mgr123`
   - View Mumbai location details
   - Manage your team
   - Update warehouse stock

5. **Update Stock (as Staff):**
   - Login as `user_ch_001` / `user123`
   - Access **"ðŸ“¦ Stock"** tab
   - Update Chennai warehouse quantities only

---

## Database Schema (India Edition)

### Sample Data
- **Admin Users:** 1
- **Managers:** 5 (one per location)
- **Staff Users:** 15 (3 per manager)
- **Warehouses:** 5 (Indian cities)
- **Sample Inventory Items:** 5
- **Stock Records:** 25 (5 items Ã— 5 warehouses)

### Warehouse Assignments
```
Chennai Hub          â†’ mgr_chennai
Mumbai Central       â†’ mgr_mumbai
Delhi MainHub        â†’ mgr_delhi
Bangalore Tech Hub   â†’ mgr_bangalore
Hyderabad Express    â†’ mgr_hyderabad
```

---

## Troubleshooting

### "Can't see Locations tab"
- âœ… **Solution:** Login as **admin** or **manager**
- Staff users only see Stock tab

### "No team members showing"
- âœ… **Solution:** Check if manager exists
- Use admin to create managers if missing

### "Stock update failed"
- âœ… **Solution:** Verify you're updating correct warehouse
- Managers can only update their warehouse
- Users can only update manager's warehouse

### "Database connection error"
- âœ… **Solution:** Ensure MySQL is running
- Check `.env` file for correct DB credentials
- Run `npm start` from `inventory_system` directory

---

## Contact & Support

For issues or questions:
1. Check `.env` MySQL configuration
2. Restart Node.js server
3. Clear browser cache and refresh
4. Check browser console for errors (F12)

---

**Happy Inventory Management! ðŸŽ¯**
