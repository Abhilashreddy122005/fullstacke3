import React from 'react';
import { CheckCircle, Download, Calendar, MapPin, Ticket, Hash } from 'lucide-react';

export default function BookingSummary({ booking }) {
  if (!booking) return null;

  const handleDownload = () => {
    if (!booking.qrCodeData) return;
    const link = document.createElement('a');
    link.href = booking.qrCodeData;
    link.download = `QR_Ticket_${booking.bookingReference}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formattedDate = booking.event?.date
    ? new Date(booking.event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'TBD';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Success Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        textAlign: 'center',
      }}>
        <CheckCircle size={48} color="#22c55e" style={{ marginBottom: '0.75rem' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Booking Confirmed! 🎉
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your booking is confirmed. Check your email for the QR code ticket.
        </p>
        <div className="booking-ref" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
          {booking.bookingReference}
        </div>
      </div>

      {/* Details */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(99,102,241,0.05)',
        }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Booking Details</h3>
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: <Hash size={14} />, label: 'Reference', value: booking.bookingReference },
            { icon: <Calendar size={14} />, label: 'Event', value: booking.event?.eventName },
            { icon: <Calendar size={14} />, label: 'Date', value: formattedDate },
            { icon: <MapPin size={14} />, label: 'Venue', value: booking.event?.venue || 'TBD' },
            { icon: <Ticket size={14} />, label: 'Tickets', value: booking.numberOfTickets },
            { icon: <MapPin size={14} />, label: 'Accommodation', value: booking.accommodationRequired ? 'Requested' : 'No' },
            { icon: null, label: 'Total Paid', value: `₹${Number(booking.totalAmount).toLocaleString('en-IN')}` },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '0.9rem',
            }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {icon}{label}
              </span>
              <span style={{
                fontWeight: label === 'Total Paid' ? 800 : 600,
                color: label === 'Total Paid' ? 'var(--accent-success)' : 'var(--text-primary)',
                fontSize: label === 'Total Paid' ? '1.1rem' : '0.9rem',
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code */}
      {booking.qrCodeData && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          textAlign: 'center',
        }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
            🔲 Your QR Code Ticket
          </h3>
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'inline-block',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <img
              src={booking.qrCodeData}
              alt="QR Code Ticket"
              style={{ width: '200px', height: '200px', display: 'block' }}
            />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '1rem' }}>
            Show this QR code at the event entrance
          </p>
          <button
            onClick={handleDownload}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            <Download size={16} />
            Download QR Ticket
          </button>
        </div>
      )}
    </div>
  );
}
