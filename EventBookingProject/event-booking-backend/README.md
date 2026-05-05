## 📁 Project Structure

```
E3/
├─ event-booking-backend/          # Spring Boot REST API
│   ├─ src/main/java/com/eventbooking/
│   │   ├─ controller/          # HTTP endpoints
│   │   │   ├─ AuthController.java          # register / login
│   │   │   ├─ EventController.java          # event lifecycle, coordinator mgmt, campaign
│   │   │   ├─ BookingController.java        # bookings, cancel/withdraw
│   │   │   ├─ QRController.java            # QR validation & check‑in/out
│   │   │   └─ UserController.java          # user CRUD (admin view)
│   │   ├─ model/               # JPA entities
│   │   │   ├─ Event.java          # event fields, status enum, @JsonIgnoreProperties on relations
│   │   │   ├─ Booking.java       # booking fields, status enum, QR data
│   │   │   ├─ User.java          # user profile, role enum
│   │   │   └─ ExpenseRecord.java # optional expense entries per event
│   │   ├─ repository/           # Spring Data JPA interfaces
│   │   │   ├─ EventRepository.java
│   │   │   ├─ BookingRepository.java   # added existsByUserIdAndEventIdAndStatusNot for duplicate‑registration guard
│   │   │   └─ UserRepository.java      # custom query findEligibleStudents()
│   │   ├─ service/              # business logic
│   │   │   ├─ EventService.java      # status transitions, coordinator mgmt, cancel, campaign, robust notification handling (try‑catch)
│   │   │   ├─ BookingService.java    # createBooking now validates registration open, prevents duplicate bookings, supports withdrawal
│   │   │   └─ EmailService.java      # async email templates, safe fall‑back on failures
│   │   └─ config/               # DataInitializer, security config, JWT filter
│   └─ src/main/resources/
│       ├─ application.properties   # DB & mail config, spring.jpa.hibernate.ddl-auto=update
│       └─ static/ (optional)        # static assets for email templates
├─ event-booking-frontend/          # React SPA (Vite)
│   ├─ src/
│   │   ├─ api/axios.js            # central Axios instance with JWT interceptor; added cancelBooking endpoint
│   │   ├─ components/             # reusable UI components (cards, tables, modals)
│   │   ├─ context/                # AuthContext managing user & token state
│   │   ├─ pages/
│   │   │   ├─ Login.jsx
│   │   │   ├─ Register.jsx
│   │   │   ├─ Events.jsx            # event listing & actions (publish, open‑registration etc.)
│   │   │   ├─ BookingPage.jsx       # ticket purchase UI
│   │   │   ├─ MyBookings.jsx        # user‑specific bookings with Cancel button
│   │   │   ├─ AdminDashboard.jsx    # analytics, event creation, coordinator tab
│   │   │   ├─ QRScanner.jsx         # admin QR check‑in/out (html5‑qrcode)
│   │   │   └─ Profile.jsx          # user profile, active / cancelled bookings
│   │   ├─ App.jsx                # router + protected route wrapper, new response format handling
│   │   └─ index.css               # global dark glass‑morphism theme, custom fonts, smooth transitions
│   └─ index.html                # Vite entry point (loads React bundle)
├─ START_EVENTSPHERE.bat          # convenience script – starts DB, backend & frontend

```
---

## 🛠️ Prerequisites
- **Java 17** (or newer)
- **Maven 3.8+**
- **Node 18+**, **npm 9+**
- **MySQL 8** (default DB name `event_db`)
- **Gmail App Password** for email notifications (set in `application.properties`)

---

## 🚀 Running the Application
```bash
# 1️⃣ Clone the repo (already done in your workspace)
# 2️⃣ Initialise DB
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS event_db;"

# 3️⃣ Backend
cd event-booking-backend
mvn spring-boot:run   # starts on http://localhost:8080

# 4️⃣ Frontend (in a new terminal)
cd ../event-booking-frontend
npm install
npm run dev          # starts on http://localhost:5173
```
---

## 🔐 User Roles & Permissions
| Role | Description |
|------|-------------|
| **ADMIN** | Full access – create/edit/delete events, manage coordinators, view all bookings, run analytics, send campaigns, cancel events. |
| **FACULTY** | Can be assigned as *coordinator* to specific events; sees only events they coordinate. |
| **STUDENT** | Browse events, book tickets, view & withdraw own bookings. |

---

## 🆕 Recent Changes (What the README now reflects)
### 1️⃣ Duplicate‑registration guard
- **`BookingRepository.existsByUserIdAndEventIdAndStatusNot`** added.
- **`BookingService.createBooking`** now:
  - Checks that the event is in `REGISTRATION_OPEN` status.
  - Throws an error if the same user already has a non‑cancelled booking for that event.
  - Returns a clear error message to the UI.
### 2️⃣ Withdrawal / Cancel registration
- New endpoint `DELETE /api/bookings/{id}/cancel` (implemented in `BookingController`).
- `BookingService.cancelBooking` restores ticket count, marks booking `CANCELLED`, and sends a cancellation email.
### 3️⃣ Lifecycle endpoint responses
- All status‑change endpoints (`publish`, `open‑registration`, `pause‑registration`, `close‑registration`, `postpone`, `complete`) now return a **JSON map** `{ message, status, eventId }` instead of the raw `Event` entity. This prevents JSON serialization loops caused by lazy‑loaded `createdBy` / `coordinators` references.
- Wrapped notification calls in `try / catch` so a failing email does **not** rollback the transaction (fixes the 500 Internal Server Error).
### 4️⃣ Coordinator management
- Added `addCoordinator` / `removeCoordinator` endpoints that return simple success messages.
- UI now has an **Coordinators** tab on the admin dashboard for assigning faculty to events.
### 5️⃣ Email robustness
- All async email helpers (`sendNewEventNotifications`, `sendCampaignEmails`, `sendEventCancellationEmails`) are surrounded with error handling; failures are logged but do **not** abort the main flow.
- `EmailService` now logs detailed success/failure for each recipient.
---

## 📚 Technical Documentation (single‑file)
The file `EventSphere_Documentation.md` contains a line‑by‑line walkthrough of each source file, the purpose of every method, and the business rules enforced (e.g., ticket count decrement, duplicate‑registration check, status guard). Keep it in sync with code changes.
---

## 🎨 UI/UX Highlights (Frontend)
- **Dark glass‑morphism theme** with smooth micro‑animations.
- **ProtectedRoute** component redirects unauthenticated users.
- **Profile page** lists active & cancelled bookings; each row features a **Withdraw** button that calls the new cancel endpoint.
- **AdminDashboard** shows analytics, event creation wizard, and a **Coordinators** tab.
- **QRScanner** uses `html5-qrcode` for fast check‑in/out.
---

## 🧪 Testing Checklist
1. Create an event → publish → open registration.
2. Register as a student → verify email receipt with QR attachment.
3. Attempt a second registration for the same event → expect *duplicate* error.
4. Cancel the booking → tickets restored, status = `CANCELLED`.
5. Close registration → further bookings are rejected.
6. Run a campaign email → ensure no transaction rollback on SMTP failure.
---

## 🐞 Known Issues & Future Work
- **Email delivery** still depends on Gmail App Password; consider a dedicated transactional service.
- **Bulk expense export** – UI placeholder exists but back‑end export not yet implemented.
- **Dark‑mode toggle** – currently hard‑coded; will be made user‑configurable.
---

## 📞 Support
Open an issue in the repository or contact the project maintainer at **admin@veltech.edu.in**.

---

*Built for VelTech University – Smart Department Event Management*
---

## 🗂️ Project Structure

```
E3/
├── event-booking-backend/      ← Spring Boot REST API
└── event-booking-frontend/     ← React + Vite SPA
```

---

## 🛠️ Prerequisites

- Java 17+
- Maven 3.8+
- MySQL 8.0+
- Node.js 18+
- npm 9+

---

## ⚙️ Step 1: Database Setup

Open **MySQL Workbench** and run:

```sql
CREATE DATABASE event_db;
```

> Your password is already configured as `Abhi@122005` in `application.properties`.

---

## 📧 Step 2: Test Credentials & Configuration

Open `event-booking-backend/src/main/resources/application.properties` and ensure the following test credentials are set:

### Email Notifications (Gmail)
```properties
spring.mail.username=abhilashreddy122005@gmail.com
spring.mail.password=nmkp gbss fijf gqdr
```
*(The 16-character code is a generated App Password from Google Account → Security → App Passwords).*

### Payment Gateway (Razorpay)
```properties
razorpay.key.id=rzp_test_SklcbNQMbfyAnE
razorpay.key.secret=axRZyyR2liwKAPYWFqUtgy8w
```
*(These are test keys for the sandbox environment. Real money will not be deducted).*

> ⚠️ If you skip configuring the email, bookings will still succeed but ticket emails will fail silently.

---

## 🚀 Step 3: Run the Backend

```bash
cd event-booking-backend
mvn spring-boot:run
```

Backend starts at: **http://localhost:8080**

Tables are **auto-created** by Hibernate (`ddl-auto=update`).

---

## ⚛️ Step 4: Run the Frontend

```bash
cd event-booking-frontend
npm install
npm run dev
```

Frontend starts at: **http://localhost:5173**

---

## 🔐 User Roles

| Role  | Access |
|-------|--------|
| USER  | Browse events, book tickets, view bookings, download QR |
| ADMIN | Everything above + Create/Edit/Delete events, View all bookings, Analytics, QR Scanner |

### Creating an Admin Account

Register with `role = ADMIN` on the registration page.

---

## 🌐 REST API Reference

### Auth
```
POST /api/auth/register    → Register user
POST /api/auth/login       → Login & get JWT token
```

### Events
```
GET    /api/events                → List all events (filter: ?search=&department=)
GET    /api/events/{id}           → Get event by ID
POST   /api/events                → Create event (ADMIN only)
PUT    /api/events/{id}           → Update event (ADMIN only)
DELETE /api/events/{id}           → Delete event (ADMIN only)
```

### Bookings
```
POST   /api/bookings              → Create booking (authenticated)
GET    /api/bookings/user/{id}    → Get my bookings
GET    /api/bookings              → Get all bookings (ADMIN)
```

### QR Validation
```
POST   /api/qr/validate           → Validate & check-in (ADMIN)
         Body: { "bookingReference": "BK-XXXXXXXX" }
```

### Admin Analytics
```
GET    /api/admin/stats           → Get dashboard stats (ADMIN)
```

---

## 🧪 Postman Examples

### Register
```json
POST http://localhost:8080/api/auth/register
{
  "name": "Abhi Admin",
  "email": "admin@veltech.edu.in",
  "password": "admin123",
  "department": "CSE",
  "role": "ADMIN"
}
```

### Login
```json
POST http://localhost:8080/api/auth/login
{
  "email": "admin@veltech.edu.in",
  "password": "admin123"
}
```

Response: `{ "token": "eyJ...", "userId": 1, "role": "ADMIN", ... }`

### Create Event (with Bearer token)
```json
POST http://localhost:8080/api/events
Authorization: Bearer eyJ...

{
  "eventName": "Tech Summit 2024",
  "department": "CSE",
  "date": "2024-12-15",
  "time": "10:00",
  "venue": "Main Auditorium",
  "price": 150,
  "totalTickets": 200,
  "description": "Annual technology summit"
}
```

### Book Tickets
```json
POST http://localhost:8080/api/bookings
Authorization: Bearer eyJ...

{
  "eventId": 1,
  "numberOfTickets": 2
}
```

### Validate QR
```json
POST http://localhost:8080/api/qr/validate
Authorization: Bearer eyJ...

{
  "bookingReference": "BK-A1B2C3D4"
}
```

---

## 🎨 UI Pages

| Page | Route | Access |
|------|-------|--------|
| Login | `/login` | Public |
| Register | `/register` | Public |
| Events Dashboard | `/events` | All Users |
| Book Ticket | `/book/:id` | Users |
| My Bookings | `/my-bookings` | Users |
| Admin Dashboard | `/admin` | Admin |
| QR Scanner | `/admin/scanner` | Admin |

---

## ⭐ Key Features

- ✅ JWT Authentication (stateless)
- ✅ Role-Based Access Control (Admin/User)
- ✅ QR Code generation (ZXing) stored as base64
- ✅ Email confirmation with QR attachment
- ✅ Overbooking prevention (transactional)
- ✅ Real-time ticket count updates
- ✅ Department-based event filtering
- ✅ Webcam QR Scanner (html5-qrcode)
- ✅ Responsive UI (mobile + desktop)
- ✅ Admin analytics dashboard
- ✅ Dark glass-morphism UI

---

## 🔧 Troubleshooting

**CORS Error?**
- Ensure backend is on port 8080 and frontend on 5173.

**MySQL Connection Failed?**
- Verify MySQL is running: `mysqladmin -u root -p status`
- Check password in `application.properties`

**Email Not Sending?**
- Add Gmail App Password in `application.properties`
- Enable 2FA on Gmail first, then generate App Password

**JWT 403 Errors?**
- Clear localStorage in browser dev tools and re-login

---

*Built for VelTech University — Smart Department Event Management*
