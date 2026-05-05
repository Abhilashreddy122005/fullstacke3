/**
 * api.js — Default API client re-export + new endpoint helpers
 * Re-exports the configured axios instance from axios.js
 * so components can do: import api from '../api/api'
 */
import API from './axios';
export default API;

// ── Attendees ─────────────────────────────────────────────────────
export const getAttendeesByBooking = (bookingId) =>
  API.get(`/api/attendees/booking/${bookingId}`);

export const getAttendeesByEvent = (eventId) =>
  API.get(`/api/attendees/event/${eventId}`);

export const checkInByQR = (qrToken) =>
  API.post('/api/attendees/checkin', { qrToken });

export const checkOutByQR = (qrToken) =>
  API.post('/api/attendees/checkout', { qrToken });

export const forceAllowAttendee = (attendeeId) =>
  API.post(`/api/attendees/${attendeeId}/force-allow`);

export const getCheckInCount = (eventId) =>
  API.get(`/api/attendees/event/${eventId}/checkin-count`);

// ── Payments ──────────────────────────────────────────────────────
export const createPaymentOrder = (bookingId) =>
  API.post('/api/payments/create-order', { bookingId });

export const verifyPayment = (data) =>
  API.post('/api/payments/verify', data);

// ── Notifications ─────────────────────────────────────────────────
export const getNotifications = () =>
  API.get('/api/notifications');

export const getUnreadNotifications = () =>
  API.get('/api/notifications/unread');

export const getUnreadCount = () =>
  API.get('/api/notifications/unread-count');

export const markNotificationRead = (id) =>
  API.patch(`/api/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  API.patch('/api/notifications/read-all');

// ── Event Approval (Faculty → Admin workflow) ──────────────────────
export const submitEventForApproval = (eventId) =>
  API.post(`/api/events/${eventId}/submit-approval`);

export const approveEvent = (eventId) =>
  API.post(`/api/events/${eventId}/approve`);

export const rejectEvent = (eventId, reason) =>
  API.post(`/api/events/${eventId}/reject`, { reason });
