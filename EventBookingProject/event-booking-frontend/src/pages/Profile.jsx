import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, cancelBooking } from '../api/axios';
import { User, Mail, Building, LayoutDashboard, Calendar, MapPin, Ticket, XCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadBookings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getMyBookings(user.id);
      setBookings(data.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (!authLoading) {
      loadBookings(); 
    }
  }, [user, authLoading]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelBooking(cancelTarget.id);
      notify('✅ Registration cancelled successfully. Tickets have been released.');
      setCancelTarget(null);
      loadBookings();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to cancel registration.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const statusColor = {
    CONFIRMED: '#22c55e',
    PENDING: '#f59e0b',
    CANCELLED: '#ef4444',
  };

  const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
          padding: '0.875rem 1.25rem',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(34,197,94,0.95)',
          backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-lg)',
          color: 'white', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCancelTarget(null)}>
          <div className="modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#ef4444' }}>⚠️ Cancel Registration</h2>
            </div>
            <div style={{ padding: '0 0 1rem' }}>
              <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                Are you sure you want to cancel your registration for <strong>{cancelTarget.event?.eventName}</strong>?
              </p>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: '0.875rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Ref:</strong> {cancelTarget.bookingReference}<br />
                <strong>Tickets:</strong> {cancelTarget.numberOfTickets} ticket(s) will be released<br />
                <strong>Note:</strong> This action cannot be undone if you are already checked in.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setCancelTarget(null)}>Keep Registration</button>
              <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : <><XCircle size={15} /> Yes, Cancel</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Profile Card */}
        <div className="card" style={{ padding: '2rem', position: 'sticky', top: '1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 800, color: 'white', boxShadow: '0 8px 20px rgba(99,102,241,0.4)'
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.25rem' }}>{user?.name}</h2>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: user?.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' : user?.role === 'FACULTY' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
              color: user?.role === 'ADMIN' ? '#f87171' : user?.role === 'FACULTY' ? '#fbbf24' : '#818cf8'
            }}>
              {user?.role}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: <Mail size={14} />, label: 'Email', value: user?.email },
              ...(user?.vtuNumber ? [{ icon: <User size={14} />, label: 'VTU Number', value: user.vtuNumber }] : []),
              ...(user?.ttsNumber ? [{ icon: <User size={14} />, label: 'TTS Number', value: user.ttsNumber }] : []),
              { icon: <Building size={14} />, label: 'Department', value: user?.department || 'N/A' },
              { icon: <LayoutDashboard size={14} />, label: 'Role', value: user?.role },
              ...(user?.yearOfStudy ? [{ icon: <Calendar size={14} />, label: 'Year', value: `Year ${user.yearOfStudy}` }] : []),
            ].map(item => (
              <div key={item.label} style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#818cf8' }}>{activeBookings.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(34,197,94,0.1)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>
                {bookings.filter(b => b.checkedIn).length}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Attended</div>
            </div>
          </div>
        </div>

        {/* Right: Bookings */}
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.25rem' }}>🎟️ My Registrations</h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎫</div>
              <h3 className="empty-title">No Registrations Yet</h3>
              <p className="empty-desc">You haven't registered for any events. Browse events to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Active Bookings */}
              {activeBookings.map(booking => (
                <div key={booking.id} className="card" style={{
                  padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start',
                  borderLeft: `4px solid ${booking.checkedIn ? '#22c55e' : statusColor[booking.status] || '#6366f1'}`
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{booking.event?.eventName}</h3>
                      {booking.checkedIn ? (
                        <span className="badge badge-success"><CheckCircle size={10} /> Checked In</span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <Clock size={10} /> Registered
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={12} /> {booking.event?.venue || 'TBD'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={12} /> {booking.event?.startDate ? new Date(booking.event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Ticket size={12} /> {booking.numberOfTickets} ticket(s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Ref: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{booking.bookingReference}</strong></span>
                      <span>Amount: <strong style={{ color: '#22c55e' }}>₹{Number(booking.totalAmount).toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>

                  {/* QR Code */}
                  {booking.qrCodeData && (
                    <img
                      src={`data:image/png;base64,${booking.qrCodeData}`}
                      alt="QR"
                      style={{ width: '72px', height: '72px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}
                    />
                  )}

                  {/* Cancel button — only if not checked in */}
                  {!booking.checkedIn && (
                    <button
                      className="btn btn-ghost"
                      style={{ color: '#ef4444', fontSize: '0.78rem', padding: '0.4rem 0.75rem', flexShrink: 0 }}
                      onClick={() => setCancelTarget(booking)}
                      title="Withdraw registration"
                    >
                      <XCircle size={13} /> Withdraw
                    </button>
                  )}
                </div>
              ))}

              {/* Cancelled Bookings (collapsed section) */}
              {cancelledBookings.length > 0 && (
                <details style={{ marginTop: '0.5rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', userSelect: 'none' }}>
                    <AlertTriangle size={13} style={{ display: 'inline', marginRight: '0.3rem' }} />
                    {cancelledBookings.length} Cancelled Registration{cancelledBookings.length > 1 ? 's' : ''}
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cancelledBookings.map(booking => (
                      <div key={booking.id} className="card" style={{
                        padding: '1rem', opacity: 0.6,
                        borderLeft: '4px solid #ef4444'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <XCircle size={14} color="#ef4444" />
                          <span style={{ fontWeight: 600 }}>{booking.event?.eventName}</span>
                          <span className="badge badge-danger">Cancelled</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                          Ref: {booking.bookingReference}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
