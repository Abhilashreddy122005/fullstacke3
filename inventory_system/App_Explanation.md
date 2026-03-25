# Inventory Management System - Explanatory Document

## 1. Application Overview
This project is a robust, production-ready **Relational Inventory Control & Stock Tracking System**. It is a full-stack web application designed to help businesses manage their inventory accurately across multiple warehouses or locations. The system enforces strict Role-Based Access Control (RBAC) with three primary user tiers: Admin, Manager, and User, ensuring that users only interact with data they are authorized to see.

## 2. Main Features & Capabilities
- **User Authentication & Authorization:** Secure login sessions utilizing `express-session` combined with secure credential management. Unauthenticated access is strictly blocked via Express middleware.
- **Hierarchical Access Control:** 
  - **Admins** have global visibility and can manage everything and everyone.
  - **Managers** govern their specific assigned warehouses and can oversee sub-users within their territory.
  - **Regular Users** operate on the ground level and can strictly only manage their own inventory items.
- **Complete Inventory CRUD:** Full lifecycle management where users can Create new stock, Read existing lists, Update stock counts, and Delete obsolete inventory records.
- **Real-Time Dashboards & Analytics:** Instant calculation of dynamic metrics including 'Total Items' (unique SKUs), 'Total Units' (physical count), and actionable 'Low-Stock' indicators.
- **Smart Filtering & Search:** Built-in client-side search functionality to rapidly filter large data tables and locate specific items by name or tracking SKU.
- **Premium Modern UI:** Responsive, glassmorphism-inspired aesthetic featuring a dark mode interface, built without heavy libraries using native HTML/CSS/JS for maximum performance.

## 3. Technology Stack & Architecture Setup
- **Frontend Markup/Structure:** `index.html` (Main Dashboard), `login.html` (Authentication Entry), `register.html` (User Onboarding)
- **Frontend Styling:** Vanilla CSS (`styles.css`) utilizing modern specs like Custom CSS Variables, Flexbox, and complex visual filters for a frosted glass effect.
- **Frontend Logic:** Vanilla JavaScript (`app.js`) performing asynchronous `fetch` calls and dynamic Document Object Model (DOM) updates.
- **Backend Server:** Node.js executing the Express.js lightweight web framework (`server.js`) to handle API endpoints.
- **Database Backend:** Relational MySQL Database handling atomic data storage, utilizing `.env` files for secure, environment-isolated connection strings.

*(If you wish to include a Database Entity Relationship Diagram here, use the following AI Prompt)*
> **AI Image Generation Prompt (For Database Schema Diagram):**
> *"A professional Entity-Relationship Diagram (ERD) for an inventory database. Show two tables: 'Users' (id, username, password, role) and 'Items' (id, name, sku, quantity, user_id). Draw a clear relational line connecting 'Users.id' to 'Items.user_id'. Dark futuristic theme, clean technical aesthetic, glowing blue connecting lines, high resolution."*

## 4. In-Depth Code Explanation

### Frontend Execution (`public/app.js`, `public/styles.css`, `public/*.html`)
- **Authentication Flow:** The application lifecycle begins at `login.html`. Upon submitting credentials, JavaScript intercepts the default form submission (`e.preventDefault()`) and initiates an asynchronous `fetch` POST HTTP request targeting `/api/login`. 
- **Dashboard Initialization & Rendering:** On successful authentication, the API responds with a token/session, and the client redirects to `index.html`. The `app.js` script immediately performs an initialization sequence:
  1. Executes `GET /api/user` to verify the session integrity and retrieve role-based rules for the current user.
  2. Executes `GET /api/items` to fetch the JSON array of inventory records authorized for that user.
  3. Iterates over the array and dynamically constructs HTML `<tr>` string templates, injecting them into the DOM (`<tbody>`).
  4. Calculates real-time statistics (e.g., counting items where `quantity < 10` for low stock) and updates the dashboard metric cards.

### Backend Execution (`server.js`)
- **Server Initialization:** Express.js mounts on port 3000 (configurable via `process.env.PORT`). It statically serves all frontend assets directly from the `/public` directory using `express.static`.
- **Database Connection Pooling:** Utilizes the `mysql2` package to establish a robust connection pool. This is far more efficient than single connections, allowing the Node server to execute concurrent SQL queries without bottlenecks. Connections are authenticated using `.env` variables (`DB_HOST`, `DB_USER`, `DB_PASS`).
- **Session Security Layer:** Routes are shielded by a custom authentication middleware function. If an HTTP request targets `/api/items` without a valid `req.session.userId`, the middleware aborts the request, returning a `401 Unauthorized` HTTP status code.
- **Core API Endpoints:** 
  - `POST /api/login`: Looks up the username in the `users` table and compares passwords.
  - `GET /api/items`: Executes dynamic SQL `SELECT` queries that conditionally append `WHERE user_id = ?` clauses depending on whether `req.session.role` is Admin or User.
  - `POST /api/items`, `PUT /api/items/:id`, `DELETE /api/items/:id`: Strictly uses parameterized queries (e.g., `INSERT INTO items (name, sku) VALUES (?, ?)`) to inherently prevent SQL Injection attacks.

### Database Architecture (`schema.sql`)
- The backend relies on a normalized, relational table architecture to prevent data anomalies. 
- The `users` table acts as the master record for accounts and access levels. 
- The `items` table maintains the physical inventory state. Crucially, the `items` table possesses a foreign key reference (`user_id`) mapping directly back to the `users` table. This one-to-many relationship allows the backend to efficiently pull only the items owned by or assigned to the actively authenticated session.

## 5. System Execution & Data Flow
1. **Bootstrapping:** Execute `npm start` (or `node server.js`) within the root directory. This binds the Node process to the port and connects to MySQL.
2. **Client Access:** The user navigates a browser to `http://localhost:3000`.
3. **Transaction Routing:** Actions triggered via the interactive UI buttons map directly to specific RESTful endpoints. The Express server translates these REST calls into raw SQL `INSERT`, `UPDATE`, or `DELETE` statements, executes them against MySQL, and returns a JSON payload denoting success or failure.
4. **State Synchronization:** Following a successful modification, the frontend automatically triggers a re-fetch of the `/api/items` endpoint to obtain the latest source of truth from the database, effortlessly keeping the UI synchronized in real-time.

*(If you wish to include a Flowchart Diagram here, use the following AI Prompt)*
> **AI Image Generation Prompt (For Workflow Diagram):**
> *"A highly detailed technical flowchart illustrating a web application request lifecycle. Start with 'Browser Client' sending a REST API request to an 'Express Middleware' block. The arrow then points to a 'Node.js Controller', which queries a 'MySQL Database'. Return arrows show data traveling back as JSON. Minimalist neon style, dark background, clear legible text block labels, modern developer documentation aesthetic."*
