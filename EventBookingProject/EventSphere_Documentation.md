# EventSphere Architecture & Implementation Documentation

EventSphere is a full-stack event registration and check-in management system designed for university departments. The system provides secure user authentication, event lifecycle management, a robust registration workflow, QR-based check-ins, and administrative dashboards.

## 1. Technology Stack & Frameworks

### Backend
- **Java 17**: Core programming language.
- **Spring Boot 3.x**: Application framework (Web, Security, Data JPA, Validation).
- **MySQL 8.0**: Relational database for persistent storage.
- **Spring Security + JWT**: For secure API access and stateless authentication.
- **Hibernate / Spring Data JPA**: Object-Relational Mapping (ORM) and database querying.
- **JavaMailSender (Jakarta Mail)**: For sending transactional emails (OTP, Welcome, Confirmations).
- **ZXing (Zebra Crossing)**: For generating QR codes embedded in tickets.

### Frontend
- **React (Vite)**: Lightning-fast frontend framework and bundler.
- **React Router DOM**: Client-side routing.
- **Axios**: HTTP client with request/response interceptors for automatic JWT injection.
- **Lucide React**: Modern, lightweight SVG icons.
- **HTML5-QRCode**: For scanning physical QR codes via device cameras.

---

## 2. Core Concepts & Database Models

The database revolves around three core entities:
1. **User**: Represents all individuals (Admin, Faculty, Student). It tracks their authentication credentials, role, department, and approval status.
2. **Event**: Represents an activity organized by an Admin. It tracks tickets available, price, dates, status (Draft, Open, Paused, Published, Cancelled), and the banner image.
3. **Booking**: The association between a `User` and an `Event`. It tracks the unique booking reference (`BK-XXXX`), number of tickets, total cost, accommodation preference, and whether the attendee has checked in.

---

## 3. Backend Code Breakdown

### Configurations
- **`SecurityConfig.java`**: Configures the CORS policy, disables CSRF (since we use JWTs), and defines authorization rules. All `/api/auth/**` routes are public, while `/api/admin/**` requires `ROLE_ADMIN` or `ROLE_FACULTY`.
- **`JwtUtil.java`**: Utility class that signs and verifies JSON Web Tokens using a secret key.
- **`DataInitializer.java`**: Automatically runs on startup to guarantee an Admin account (`admin@veltech.edu.in`) always exists in the database.

### Controllers (The API Layer)
- **`AuthController.java`**: Handles `/register` and `/login`. Returns the JWT token to the frontend.
- **`EventController.java`**: Handles CRUD operations for events. Also handles the file upload mechanism for event banners.
- **`BookingController.java`**: Allows students to book tickets and view their past bookings.
- **`AdminController.java`**: A secure controller solely for management. It handles retrieving all bookings for a specific event, manual check-ins, check-outs, booking deletions, and CSV exports.
- **`QRController.java`**: Exposes the `/api/qr/validate` endpoint to securely verify a booking reference and mark the attendee as checked-in.

### Services (The Business Logic)
- **`AuthService.java`**: Handles the registration pipeline. Automatically approves students, but sets faculty accounts to `pending` until approved by an admin.
- **`EventService.java`**: Manages event states (opening, closing, cancelling, publishing).
- **`BookingService.java`**: Core transaction logic. It checks if enough tickets are available, deducts them from the event pool, generates the unique `BK-` reference, generates the QR code via `QRCodeService`, saves the booking, and triggers the `EmailService`.
- **`EmailService.java`**: Uses an asynchronous thread (`@Async`) to send HTML emails. Notably, it embeds the QR code image as an inline **CID (Content-ID) attachment** to ensure the image reliably appears in major email clients like Gmail and Outlook without being blocked.
- **`QRCodeService.java`**: Uses ZXing to draw a 2D QR Code image, converting it into a base64 string to be attached to the email.

---

## 4. Frontend Code Breakdown

### Architecture
- **`App.jsx`**: The root component. Defines all React Router paths and wraps the application in the `AuthProvider`. Protects internal routes using a `<ProtectedRoute>` wrapper.
- **`AuthContext.jsx`**: Global state management for authentication. It reads the JWT from `localStorage` on load, tracks the logged-in user, and handles the `login` and `logout` actions seamlessly across the app.
- **`axios.js`**: A pre-configured Axios instance. The **request interceptor** automatically attaches `Bearer <token>` to all API calls. The **response interceptor** catches `401 Unauthorized` errors and automatically redirects the user to the login screen if their token expires.

### Core Pages

#### 1. Authentication
- **`Login.jsx` & `Register.jsx`**: Clean, fully responsive auth forms. They handle real-time validation and show a "pending approval" screen if a Faculty registers.

#### 2. Event Discovery & Booking
- **`Events.jsx`**: The main dashboard. Displays a grid of available events.
- **`BookingPage.jsx`**: The checkout process. It allows the user to select ticket quantities, toggle accommodation, and displays a dynamic total cost. Upon submission, it calls the `/api/bookings` endpoint.
- **`MyBookings.jsx`**: Shows the logged-in user all their upcoming and past tickets.

#### 3. Administration & Management
- **`AdminDashboard.jsx`**: The central hub for Admins. Features multi-tab navigation to manage all Events, manage all Users (approve/reject faculty), and broadcast announcements.
- **`EventRegistrations.jsx`**: The granular per-event control panel. Accessible by clicking the 👥 icon on any event.
  - Features real-time statistics cards (Revenue, Checked-In vs Pending).
  - A dynamic progress bar showing check-in completion percentage.
  - A comprehensive data table with live-search, department filtering, and status filtering.
  - Action buttons to manually check-in attendees, edit their booking details, or completely delete the registration (which triggers a refund of available tickets to the event pool).
  - An "Export CSV" button to download a spreadsheet of attendees.

#### 4. Check-in System
- **`QRScanner.jsx`**: A dual-mode check-in interface.
  - **Manual Mode**: Admins can type the `BK-XXXX` reference manually.
  - **Camera Mode**: Uses `html5-qrcode` to access the device's rear camera. It rapidly scans the physical QR code on a student's phone/printout, automatically submits the reference, validates it against the backend, and displays a large success or error banner.

## 5. Security & Flow Considerations

- **Ticket Integrity**: Booking operations run within `@Transactional` blocks in Spring Boot. This ensures that if two users try to buy the last ticket simultaneously, the database locks prevent overselling.
- **Email Reliability**: By moving away from `base64` strings in `<img src="">` (which Gmail blocks) to inline CID attachments (`<img src="cid:...">`), ticket emails are robust and professional.
- **State Integrity**: The frontend `EventRegistrations.jsx` maintains perfect synchronization with the backend. For example, deleting a booking instantly updates the "Seats Left" and "Revenue" stat cards dynamically.
