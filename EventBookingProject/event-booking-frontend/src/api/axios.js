import axios from 'axios';

const API = axios.create({
  baseURL: '',   // Use Vite proxy — routes /api/* → http://localhost:8081
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
API.interceptors.request.use(
  (config) => {
    const userData = localStorage.getItem('eventUser');
    if (userData) {
      const { token } = JSON.parse(userData);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — only redirect to login on 401 (token expired/missing)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is missing or expired — clear session and go to login
      localStorage.removeItem('eventUser');
      window.location.href = '/login';
    }
    // 403 = forbidden (wrong role) — do NOT redirect, just pass the error through
    return Promise.reject(error);
  }
);

// Auth
export const loginUser = (data) => API.post('/api/auth/login', data);
export const registerUser = (data) => API.post('/api/auth/register', data);
export const sendOtp = (email) => API.post('/api/auth/send-otp', { email });
export const verifyOtp = (email, otp) => API.post('/api/auth/verify-otp', { email, otp });



// Events
export const getEvents = (params) => API.get('/api/events', { params });
export const getAllEvents = () => API.get('/api/events/all');   // Admin: includes cancelled
export const getEventById = (id) => API.get(`/api/events/${id}`);
export const createEvent = (data) => API.post('/api/events', data);
export const updateEvent = (id, data) => API.put(`/api/events/${id}`, data);
export const deleteEvent = (id) => API.delete(`/api/events/${id}`);
export const cancelEvent = (id) => API.post(`/api/events/${id}/cancel`);
export const publishEvent = (id) => API.post(`/api/events/${id}/publish`);
export const openRegistration = (id) => API.post(`/api/events/${id}/open-registration`);
export const pauseRegistration = (id) => API.post(`/api/events/${id}/pause-registration`);
export const closeRegistration = (id) => API.post(`/api/events/${id}/close-registration`);
export const postponeEvent = (id) => API.post(`/api/events/${id}/postpone`);
export const completeEvent = (id) => API.post(`/api/events/${id}/complete`);
export const addCoordinator = (eventId, userId) => API.post(`/api/events/${eventId}/coordinators/${userId}`);
export const removeCoordinator = (eventId, userId) => API.delete(`/api/events/${eventId}/coordinators/${userId}`);
export const sendCampaign = (id, formData) => API.post(`/api/events/${id}/campaign`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Bookings
export const createBooking = (data) => API.post('/api/bookings', data);
export const getMyBookings = (userId) => API.get(`/api/bookings/user/${userId}`);
export const getAllBookings = () => API.get('/api/admin/bookings');
export const cancelBooking = (bookingId) => API.delete(`/api/bookings/${bookingId}/cancel`);
export const getCertificateUrl = (bookingId, attendeeId) => `/api/bookings/${bookingId}/attendees/${attendeeId}/certificate`;

// Per-event booking management (admin)
export const getEventBookings = (eventId) => API.get(`/api/admin/events/${eventId}/bookings`);
export const checkInBooking = (eventId, bookingId) => API.post(`/api/admin/events/${eventId}/bookings/${bookingId}/checkin`);
export const checkOutBooking = (eventId, bookingId) => API.post(`/api/admin/events/${eventId}/bookings/${bookingId}/checkout`);
export const deleteBooking = (eventId, bookingId) => API.delete(`/api/admin/events/${eventId}/bookings/${bookingId}`);
export const editBooking = (eventId, bookingId, data) => API.patch(`/api/admin/events/${eventId}/bookings/${bookingId}`, data);
export const exportEventBookings = (eventId) => `${API.defaults.baseURL}/api/admin/events/${eventId}/bookings/export`;
export const checkInAttendee = (eventId, attendeeId) => API.post(`/api/admin/events/${eventId}/attendees/${attendeeId}/checkin`);
export const checkOutAttendee = (eventId, attendeeId) => API.post(`/api/admin/events/${eventId}/attendees/${attendeeId}/checkout`);
export const addMemberToBooking = (eventId, bookingId, data) => API.post(`/api/admin/events/${eventId}/bookings/${bookingId}/add-member`, data);
export const removeAttendee = (eventId, attendeeId) => API.delete(`/api/admin/events/${eventId}/attendees/${attendeeId}`);
export const editAttendee = (attendeeId, data) => API.put(`/api/attendees/${attendeeId}`, data);
export const faceCheckIn = (eventId, data) => API.post(`/api/admin/events/${eventId}/face-checkin`, data);


// QR Validation
export const validateQR = (bookingReference) =>
  API.post('/api/qr/validate', { bookingReference });

// Admin
export const getAdminStats = () => API.get('/api/admin/stats');
export const sendAnnouncement = (data) => API.post('/api/admin/announcements', data);
export const toggleCertificates = (eventId, enabled) => API.post(`/api/admin/events/${eventId}/certificates/toggle`, { enabled });
export const sendAllCertificates = (eventId) => API.post(`/api/admin/events/${eventId}/certificates/send-all`);

export default API;
