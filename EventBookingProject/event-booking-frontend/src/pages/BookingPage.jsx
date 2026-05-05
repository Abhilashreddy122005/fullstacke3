import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Tag, Award } from 'lucide-react';
import { getEventById, createBooking } from '../api/axios';
import BookingForm from '../components/BookingForm';
import BookingSummary from '../components/BookingSummary';
import MultiAttendeeBooking from './MultiAttendeeBooking';

export default function BookingPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data } = await getEventById(eventId);
        setEvent(data);
      } catch (err) {
        setError('Event not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleBooking = async (request) => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await createBooking(request);
      setBooking(data);
      // Update event available tickets in UI
      setEvent(prev => ({
        ...prev,
        availableTickets: prev.availableTickets - request.numberOfTickets
      }));
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Booking failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="shimmer" style={{ height: '32px', width: '200px' }} />
          <div className="shimmer" style={{ height: '200px' }} />
          <div className="shimmer" style={{ height: '300px' }} />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <h3 className="empty-title">Event Not Found</h3>
          <button className="btn btn-primary" onClick={() => navigate('/events')}>
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'TBD';

  return (
    <div className="page">
      {/* Back button */}
      <button
        onClick={() => navigate('/events')}
        className="btn btn-ghost"
        style={{ marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} />
        Back to Events
      </button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: booking ? '1fr 1fr' : '1fr 1fr',
        gap: '2rem',
        alignItems: 'start',
      }}
        className="booking-layout"
      >
        {/* Left: Event Details */}
        <div>
          {/* Event header card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            marginBottom: '1.5rem',
          }}>
            {/* Banner */}
            <div style={{
              height: '160px',
              background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
            }}>
              🎭
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3 }}>
                  {event.eventName}
                </h1>
                <span className="badge badge-primary">
                  <Tag size={10} />
                  {event.department || 'General'}
                </span>
              </div>

              {event.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  {event.description}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { icon: <Calendar size={16} />, text: formattedDate },
                  event.time && { icon: <Clock size={16} />, text: event.time?.substring(0, 5) },
                  event.venue && { icon: <MapPin size={16} />, text: event.venue },
                  { icon: <Users size={16} />, text: `${event.availableTickets} of ${event.totalTickets} tickets available` },
                ].filter(Boolean).map(({ icon, text }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
                    {text}
                  </div>
                ))}
              </div>

              {/* Price */}
              <div style={{
                marginTop: '1.25rem',
                padding: '1rem',
                background: 'rgba(99,102,241,0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ticket Price</span>
                <span style={{
                  fontSize: '1.75rem', fontWeight: 900,
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {Number(event.price) === 0 ? 'FREE' : `₹${Number(event.price).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Booking Form or Summary */}
        <div>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          {booking ? (
            <BookingSummary booking={booking} />
          ) : (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
            }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                🎟️ Book Tickets
              </h2>
              {event.availableTickets > 0 ? (
                // Use multi-attendee booking for team events or when attendee details needed
                event.isTeamEvent ? (
                  <MultiAttendeeBooking event={event} onSuccess={setBooking} />
                ) : (
                  <BookingForm
                    event={event}
                    onSubmit={handleBooking}
                    loading={submitting}
                  />
                )
              ) : (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div className="empty-icon">😔</div>
                  <h3 className="empty-title">Sold Out</h3>
                  <p className="empty-desc">All tickets for this event have been booked.</p>
                  <button className="btn btn-ghost" onClick={() => navigate('/events')}>
                    Browse Other Events
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .booking-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
