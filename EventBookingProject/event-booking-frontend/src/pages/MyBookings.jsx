import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, getCertificateUrl } from '../api/axios';
import { getAttendeesByBooking } from '../api/api';
import { Calendar, MapPin, Ticket, Download, RefreshCw, Hash, CheckCircle, Clock, Users, QrCode, X, Award } from 'lucide-react';
import DigitalTicket from '../components/DigitalTicket';

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendeesMap, setAttendeesMap] = useState({}); // bookingId → attendees[]
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [ticketModal, setTicketModal] = useState(null); // { attendee, event, booking }
  const [loadingAttendees, setLoadingAttendees] = useState({}); // bookingId → bool

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getMyBookings(user.userId);
      setBookings(data.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)));
    } catch {
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // Lazy-load attendees when a booking is expanded
  const handleExpandBooking = async (bookingId) => {
    if (expandedBooking === bookingId) {
      setExpandedBooking(null);
      return;
    }
    setExpandedBooking(bookingId);
    if (!attendeesMap[bookingId]) {
      setLoadingAttendees(prev => ({ ...prev, [bookingId]: true }));
      try {
        const { data } = await getAttendeesByBooking(bookingId);
        setAttendeesMap(prev => ({ ...prev, [bookingId]: data }));
      } catch {
        setAttendeesMap(prev => ({ ...prev, [bookingId]: [] }));
      } finally {
        setLoadingAttendees(prev => ({ ...prev, [bookingId]: false }));
      }
    }
  };

  const totalSpent = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const totalTickets = bookings.reduce((sum, b) => sum + (b.numberOfTickets || 0), 0);

  const statusClass = (status) => {
    if (!status) return 'status-pending';
    return status === 'CHECKED_IN' ? 'status-checked-in'
      : status === 'CHECKED_OUT' ? 'status-checked-out'
      : 'status-pending';
  };
  const statusLabel = (status) =>
    status === 'CHECKED_IN' ? '✅ Checked In'
    : status === 'CHECKED_OUT' ? '🔚 Checked Out'
    : '⏳ Pending';

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">📋 My Bookings</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${bookings.length} booking(s) · ${totalTickets} tickets`}
          </p>
        </div>
        <button onClick={fetchBookings} className="btn btn-ghost" disabled={loading}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      {!loading && bookings.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          {[
            { label: 'Total Bookings', value: bookings.length, icon: '📋', color: '#800000' },
            { label: 'Total Tickets', value: totalTickets, icon: '🎟️', color: '#38bdf8' },
            { label: 'Amount Spent', value: `₹${totalSpent.toLocaleString('en-IN')}`, icon: '💰', color: '#22c55e' },
            { label: 'Checked In', value: bookings.filter(b => b.checkedIn).length, icon: '✅', color: '#f59e0b' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="stat-icon" style={{ background: `${stat.color}20` }}>
                <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
              </div>
              <div className="stat-info">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>⚠️ {error}</div>}

      {/* Loading skeletons */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shimmer" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎟️</div>
          <h3 className="empty-title">No Bookings Yet</h3>
          <p className="empty-desc">You haven't booked any tickets. Browse upcoming events!</p>
          <a href="/events" className="btn btn-primary">Browse Events</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {bookings.map(booking => (
            <div key={booking.id} className="booking-card">
              {/* Card Header */}
              <div className="booking-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      {booking.event?.eventName}
                    </h3>
                    <span className={`badge ${booking.checkedIn ? 'badge-success' : 'badge-primary'}`}>
                      {booking.checkedIn ? <><CheckCircle size={10} /> Checked In</> : <><Clock size={10} /> Pending</>}
                    </span>
                    {booking.isTeamBooking && (
                      <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                        <Users size={10} /> {booking.teamName || 'Team'}
                      </span>
                    )}
                  </div>
                  <span className="booking-ref">{booking.bookingReference}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: '1.4rem', fontWeight: 900,
                    background: 'var(--gradient-primary)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                    {Number(booking.totalAmount) === 0 ? 'FREE' : `₹${Number(booking.totalAmount).toLocaleString('en-IN')}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>total paid</div>
                </div>
              </div>

              {/* Card Body */}
              <div className="booking-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { icon: <Calendar size={14} />, label: 'Event Date', value: booking.event?.startDate ? new Date(booking.event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD' },
                    { icon: <MapPin size={14} />, label: 'Venue', value: booking.event?.venue || 'TBD' },
                    { icon: <Ticket size={14} />, label: 'Tickets', value: `${booking.numberOfTickets} ticket(s)` },
                    { icon: <Hash size={14} />, label: 'Booked On', value: new Date(booking.bookingDate).toLocaleDateString('en-IN') },
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>{label}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* View Tickets button */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => handleExpandBooking(booking.id)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <QrCode size={15} />
                    {expandedBooking === booking.id ? 'Hide Tickets' : `View Tickets (${booking.numberOfTickets})`}
                  </button>
                </div>

                {/* ── Attendee Ticket Cards ── */}
                {expandedBooking === booking.id && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <QrCode size={13} />
                      Individual tickets — each attendee has a unique scannable QR code
                    </div>

                    {loadingAttendees[booking.id] ? (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {[...Array(booking.numberOfTickets)].map((_, i) => (
                          <div key={i} className="shimmer" style={{ height: '88px', borderRadius: '14px', flex: 1 }} />
                        ))}
                      </div>
                    ) : (attendeesMap[booking.id] || []).length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '0.875rem' }}>
                        No individual attendee tickets available. Use the QR code on the booking email.
                      </div>
                    ) : (
                      <div className="my-bookings-attendee-list">
                        {(attendeesMap[booking.id] || []).map((attendee, idx) => (
                          <div key={attendee.id || idx} className="attendee-ticket-card">
                            {/* QR thumb */}
                            <div className="attendee-qr-thumb">
                              {attendee.qrCodeData ? (
                                <img src={attendee.qrCodeData} alt={`QR ${attendee.name}`} />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                                  <QrCode size={28} />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="attendee-ticket-info">
                              <div className="attendee-ticket-name">{attendee.name}</div>
                              <div className="attendee-ticket-email">{attendee.email}</div>
                              <span className={`attendee-ticket-status ${statusClass(attendee.attendanceStatus)}`}>
                                {statusLabel(attendee.attendanceStatus)}
                              </span>
                            </div>

                            {/* Download button */}
                            <button
                              className="attendee-ticket-download"
                              onClick={() => setTicketModal({ attendee, event: booking.event, booking })}
                            >
                              <Download size={13} style={{ display: 'inline', marginRight: '4px' }} />
                              Ticket
                            </button>
                            {booking.event?.certificatesEnabled && (
                              <button
                                className="attendee-ticket-download"
                                style={{ background: 'linear-gradient(135deg,#800000,#b30000)', marginLeft: '0.3rem' }}
                                onClick={() => {
                                  const url = getCertificateUrl(booking.id, attendee.id);
                                  const token = JSON.parse(localStorage.getItem('eventUser') || '{}').token;
                                  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                                    .then(r => r.text())
                                    .then(html => {
                                      const w = window.open('', '_blank');
                                      w.document.write(html);
                                      w.document.close();
                                    })
                                    .catch(() => alert('Certificate not available'));
                                }}
                              >
                                <Award size={13} style={{ display: 'inline', marginRight: '4px' }} />
                                Cert
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Ticket Modal ── */}
      {ticketModal && (
        <div className="ticket-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setTicketModal(null); }}>
          <div style={{ position: 'relative' }}>
            <DigitalTicket
              attendee={ticketModal.attendee}
              event={ticketModal.event}
              booking={ticketModal.booking}
              onClose={() => setTicketModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
