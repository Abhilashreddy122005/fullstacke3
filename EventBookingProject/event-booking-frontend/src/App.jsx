import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import BookingPage from './pages/BookingPage';
import MultiAttendeeBooking from './pages/MultiAttendeeBooking';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import QRScanner from './pages/QRScanner';
import Profile from './pages/Profile';
import EventRegistrations from './pages/EventRegistrations';
import PaymentPage from './pages/PaymentPage';
import Notifications from './pages/Notifications';
import Chatbot from './components/Chatbot';

// ── Route Guards ──────────────────────────────────────────────────────────

const ProtectedRoute = ({ children, adminOnly = false, staffOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'FACULTY' && user.role !== 'ADMIN') {
    return <Navigate to="/events" replace />;
  }
  if (staffOnly && user.role === 'STUDENT') {
    return <Navigate to="/events" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/events" replace />;
  return children;
};

// ── App Routes ────────────────────────────────────────────────────────────

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <div className="main-content">
        <Routes>
          {/* Public Landing & Auth */}
          <Route path="/" element={<Events />} />
          <Route path="/events" element={<Events />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Booking — both legacy and new multi-attendee flow */}
          <Route path="/book/:eventId" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path="/book-multi/:eventId" element={<ProtectedRoute><MultiAttendeeBooking /></ProtectedRoute>} />

          {/* Payment */}
          <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />

          {/* My Bookings */}
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />

          {/* Notifications */}
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          {/* Profile */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Admin / Faculty */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/scanner" element={<ProtectedRoute staffOnly><QRScanner /></ProtectedRoute>} />
          <Route path="/admin/events/:eventId/registrations" element={<ProtectedRoute adminOnly><EventRegistrations /></ProtectedRoute>} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Chatbot />
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e1b4b',
              color: '#e0e7ff',
              border: '1px solid #4338ca',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1e1b4b' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#1e1b4b' } },
          }}
        />
      </Router>
    </AuthProvider>
  );
}
