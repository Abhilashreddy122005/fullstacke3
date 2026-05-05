import React, { useState } from 'react';
import { Minus, Plus, CreditCard, Info } from 'lucide-react';

export default function BookingForm({ event, onSubmit, loading }) {
  const [tickets, setTickets] = useState(1);
  const [accommodationRequired, setAccommodationRequired] = useState(false);
  const [customResponses, setCustomResponses] = useState({});

  const price = Number(event?.price || 0);
  const total = price * tickets;
  const max = event?.availableTickets || 0;
  
  const customFields = event?.customRegistrationFields ? JSON.parse(event.customRegistrationFields) : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      eventId: event.id, 
      numberOfTickets: tickets,
      accommodationRequired,
      customFieldResponses: Object.keys(customResponses).length > 0 ? JSON.stringify(customResponses) : null
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Ticket Count */}
        <div>
          <label className="form-label">Number of Tickets</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <div className="ticket-selector">
              <button
                type="button"
                className="ticket-btn"
                onClick={() => setTickets(t => Math.max(1, t - 1))}
                disabled={tickets <= 1}
              >
                <Minus size={16} />
              </button>
              <span className="ticket-count">{tickets}</span>
              <button
                type="button"
                className="ticket-btn"
                onClick={() => setTickets(t => Math.min(max, t + 1))}
                disabled={tickets >= max || tickets >= 10}
              >
                <Plus size={16} />
              </button>
            </div>
            <span className="text-muted text-sm">
              Max {Math.min(max, 10)} per booking
            </span>
          </div>
        </div>

        {/* Accommodation Option */}
        {event?.accommodationProvided && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox" 
                checked={accommodationRequired} 
                onChange={(e) => setAccommodationRequired(e.target.checked)} 
                style={{ width: '20px', height: '20px', accentColor: '#800000' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Require Accommodation?</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Check this if you need stay arrangements during the {event?.numberOfDays || 1}-day event.</div>
              </div>
            </label>
          </div>
        )}

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Additional Information</h4>
            {customFields.map((field, idx) => (
              <div key={idx} className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{field.name} {field.required && '*'}</label>
                <input 
                  type={field.type === 'number' ? 'number' : 'text'}
                  className="form-input"
                  required={field.required}
                  value={customResponses[field.name] || ''}
                  onChange={(e) => setCustomResponses(p => ({ ...p, [field.name]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        {/* Price Breakdown */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="text-muted text-sm">Price per ticket</span>
            <span style={{ fontWeight: 600 }}>
              {price === 0 ? 'FREE' : `₹${price.toLocaleString('en-IN')}`}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="text-muted text-sm">Quantity</span>
            <span style={{ fontWeight: 600 }}>× {tickets}</span>
          </div>
          <div style={{
            height: '1px', background: 'var(--border-color)', margin: '0.75rem 0'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total Amount</span>
            <span style={{
              fontSize: '1.5rem', fontWeight: 800,
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {price === 0 ? 'FREE' : `₹${total.toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>

        {/* Info note */}
        <div className="alert alert-info" style={{ fontSize: '0.82rem' }}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>A QR code ticket will be generated and emailed to you after successful booking.</span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary btn-lg btn-full"
          disabled={loading || tickets < 1 || tickets > max}
        >
          {loading ? (
            <>
              <div className="spinner spinner-sm" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Confirm Booking — {price === 0 ? 'FREE' : `₹${total.toLocaleString('en-IN')}`}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
