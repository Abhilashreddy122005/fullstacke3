import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Tag } from 'lucide-react';

const DEPT_EMOJIS = {
  'CSE': '💻', 'IT': '🖥️', 'ECE': '⚡', 'EEE': '🔌',
  'MECH': '⚙️', 'CIVIL': '🏗️', 'MBA': '📈', 'MCA': '🖱️',
  'default': '🎓'
};

const DEPT_IMAGES = {
  'CSE': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600',
  'IT': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600',
  'ECE': 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=600',
  'MECH': 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&q=80&w=600',
  'CIVIL': 'https://images.unsplash.com/photo-1503387762-592dea58ef21?auto=format&fit=crop&q=80&w=600',
  'default': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=600'
};

export default function EventCard({ event }) {
  const navigate = useNavigate();

  const dept = event.department?.toUpperCase() || 'default';
  const imageUrl = event.imageUrl || DEPT_IMAGES[dept] || DEPT_IMAGES['default'];

  const ticketStatus =
    event.availableTickets === 0 ? 'sold-out' :
    event.availableTickets <= 10 ? 'low' : 'normal';

  const ticketLabel =
    event.availableTickets === 0 ? 'Sold Out' :
    event.availableTickets <= 10 ? `Only ${event.availableTickets} left!` :
    `${event.availableTickets} tickets available`;

  const formattedDate = event.startDate && event.endDate
    ? `${new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(event.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : event.startDate || event.date
      ? new Date(event.startDate || event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'TBD';

  const formattedTime = event.time
    ? event.time.substring(0, 5)
    : null;

  const handleClick = () => {
    if (event.availableTickets > 0) {
      navigate(`/book/${event.id}`);
    }
  };

  return (
    <div
      className="event-card"
      onClick={handleClick}
      style={{ cursor: event.availableTickets > 0 ? 'pointer' : 'default' }}
    >
      {/* Card Image */}
      <div className="event-card-img" style={{ 
        backgroundImage: `url(${imageUrl})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        aspectRatio: '16/9',
        height: 'auto'
      }}>
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' 
        }} />
        {/* Department badge */}
        <div style={{
          position: 'absolute', top: '0.75rem', left: '0.75rem',
        }}>
          <span className="badge badge-secondary" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <Tag size={10} />
            {event.department || 'General'}
          </span>
        </div>
        {/* Sold out overlay */}
        {event.availableTickets === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: 'rgba(244, 63, 94, 0.9)',
              color: 'white', fontWeight: 800, padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)', fontSize: '0.9rem',
              transform: 'rotate(-12deg)',
            }}>SOLD OUT</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="event-card-body">
        <h3 className="event-card-title">{event.eventName}</h3>

        {event.description && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {event.description.length > 80 ? event.description.substring(0, 80) + '...' : event.description}
          </p>
        )}

        <div className="event-card-meta">
          <div className="event-meta-item">
            <Calendar size={14} />
            <span>{formattedDate}</span>
            {formattedTime && (
              <>
                <Clock size={14} style={{ marginLeft: '0.25rem' }} />
                <span>{formattedTime}</span>
              </>
            )}
          </div>
          {event.venue && (
            <div className="event-meta-item">
              <MapPin size={14} />
              <span>{event.venue}</span>
            </div>
          )}
          <div className="event-meta-item">
            <Users size={14} />
            <span className={`event-tickets ${ticketStatus}`}>{ticketLabel}</span>
          </div>
          {event.isTeamEvent && (
            <div className="event-meta-item" style={{ marginTop: '0.2rem', color: '#818cf8', fontWeight: 600 }}>
              <Users size={14} style={{ opacity: 0 }} />
              <span>Team Event (Max {event.maxTeamSize} per team)</span>
            </div>
          )}
          {event.maxTeams > 0 && event.isTeamEvent && (
            <div className="event-meta-item" style={{ marginTop: '0.2rem' }}>
              <Users size={14} style={{ opacity: 0 }} />
              <span>Limit: {event.maxTeams} teams</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="event-card-footer">
        <div>
          <div className={`event-price ${event.price === 0 ? 'free' : ''}`}>
            {event.price === 0 || event.price === '0' || event.price === '0.00'
              ? 'FREE'
              : `₹${Number(event.price).toLocaleString('en-IN')}`
            }
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>per ticket</div>
        </div>
        <button
          className="btn btn-primary"
          disabled={event.availableTickets === 0}
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          style={{ 
            fontSize: '0.75rem', padding: '0.5rem 1.25rem', 
            borderRadius: 'var(--radius-full)', border: 'none',
            fontWeight: 800, color: '#ffffff'
          }}
        >
          {event.availableTickets > 0 ? 'BOOK TICKET' : 'UNAVAILABLE'}
        </button>
      </div>
    </div>
  );
}
