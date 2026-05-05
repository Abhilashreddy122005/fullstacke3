import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import api from '../api/api';
import toast from 'react-hot-toast';

// ── College Config (scalable) ──────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Puducherry','Chandigarh','Other'
];

const DEPARTMENTS_LIST = ['CSE','IT','ECE','EEE','MECH','CIVIL','MBA','MCA','Other'];

const COLLEGE_CONFIG = {
  'Vel Tech University': {
    idLabel: 'VTA / VTP / VTU Number',
    idPlaceholder: 'e.g. VTU/VTA12345',
    suppressAccommodation: true,
    extraFields: false,
  },
  'Other College / University': {
    idLabel: 'College ID / Enrollment No.',
    idPlaceholder: 'Your college roll number',
    suppressAccommodation: false,
    extraFields: true,  // asks collegeName, state, location, dept, year
  },
};

const COLLEGES = Object.keys(COLLEGE_CONFIG);

const EMPTY_ATTENDEE = {
  name: '', email: '', phone: '',
  college: '', collegeId: '',
  collegeName: '', collegeState: '', collegeLocation: '',
  department: '', yearOfStudy: '',
  otherDepartment: '', otherCollegeState: '',
  teamLeader: false,
};

export default function MultiAttendeeBooking({ event, onSuccess }) {
  const navigate = useNavigate();
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [attendees, setAttendees] = useState([{ ...EMPTY_ATTENDEE, teamLeader: true }]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [accommodationRequired, setAccommodationRequired] = useState(false);

  const maxSlots = event?.isTeamEvent ? (event.maxTeamSize || 10) : (event?.availableTickets || 1);

  // Leader's college drives form-wide accommodation behaviour
  const leaderCollege = attendees[0]?.college || '';
  const isVelTech = leaderCollege === 'Vel Tech University';
  const showAccommodation = event?.accommodationProvided && !isVelTech;



  // ── Attendee helpers ──────────────────────────────────────────────────────
  const addAttendee = () => {
    if (attendees.length >= maxSlots) { toast.error(`Maximum ${maxSlots} allowed.`); return; }
    setAttendees(p => [...p, { ...EMPTY_ATTENDEE, college: leaderCollege }]);
  };

  const removeAttendee = (idx) => {
    if (idx === 0) { toast.error('Cannot remove the team leader.'); return; }
    setAttendees(p => p.filter((_, i) => i !== idx));
  };

  const updateAttendee = (idx, field, value) => {
    setAttendees(p => {
      const next = [...p];
      next[idx] = { ...next[idx], [field]: value };
      if (idx === 0 && field === 'college') {
        // Reset ID + extra fields when college changes
        return next.map((a, i) => i === 0 ? a : { ...a, college: value, collegeId: '', collegeName: '', collegeState: '', collegeLocation: '', department: '', yearOfStudy: '', otherDepartment: '', otherCollegeState: '' });
      }
      return next;
    });
    const errKey = `${idx}_${field}`;
    if (errors[errKey]) setErrors(e => { const n = { ...e }; delete n[errKey]; return n; });
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    attendees.forEach((a, i) => {
      if (!a.name.trim())  errs[`${i}_name`]  = 'Name is required';
      if (!a.email.trim()) errs[`${i}_email`] = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) errs[`${i}_email`] = 'Invalid email';
      if (a.phone && !/^\d{10}$/.test(a.phone)) errs[`${i}_phone`] = 'Phone must be 10 digits';
      if (!a.college)         errs[`${i}_college`] = 'College is required';
      if (a.college === 'Vel Tech University' && !a.collegeId.trim()) errs[`${i}_collegeId`] = 'VTA/VTP/VTU Number is required';
      if (a.college === 'Other College / University') {
        if (!a.collegeName.trim()) errs[`${i}_collegeName`] = 'College name is required';
        if (!a.collegeState)       errs[`${i}_collegeState`] = 'State is required';
        if (!a.collegeLocation.trim()) errs[`${i}_collegeLocation`] = 'City is required';
        if (!a.collegeId.trim())   errs[`${i}_collegeId`] = 'College ID is required';
      }
    });
    if (event?.isTeamEvent && isTeamMode && !teamName.trim()) errs['teamName'] = 'Team name is required';
    const emails = attendees.map(a => a.email.toLowerCase());
    emails.forEach((e, i) => { if (emails.indexOf(e) !== i) errs[`${i}_email`] = 'Duplicate email'; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };



  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) { toast.error('Please fix the errors below.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        eventId: event.id,
        numberOfTickets: attendees.length,
        accommodationRequired: showAccommodation ? accommodationRequired : false,
        teamBooking: event.isTeamEvent && isTeamMode,
        teamName: isTeamMode ? teamName : null,
        attendees: attendees.map((a, i) => ({
          name: a.name.trim(),
          email: a.email.trim(),
          phone: a.phone?.trim() || null,
          teamLeader: i === 0,
          customFields: JSON.stringify({
            college: a.college,
            collegeId: a.collegeId,
            collegeName: a.collegeName || null,
            collegeState: a.collegeState === 'Other' && a.otherCollegeState ? a.otherCollegeState : a.collegeState || null,
            collegeLocation: a.collegeLocation || null,
            department: a.department === 'Other' && a.otherDepartment ? a.otherDepartment : a.department || null,
            yearOfStudy: a.yearOfStudy || null,
          }),
        })),
      };

      const res = await api.post('/api/bookings', payload);
      const booking = res.data;

      const hasPrice = (event.price > 0) ||
                       (showAccommodation && accommodationRequired && event.accommodationPrice > 0);

      if (hasPrice) {
        navigate('/payment', { state: { bookingId: booking.id, event, booking } });
      } else {
        toast.success('Booking confirmed! 🎉');
        if (onSuccess) onSuccess(booking);
        else navigate('/my-bookings');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Booking failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Total amount calculation ───────────────────────────────────────────────
  const ticketTotal = (event?.price || 0) * attendees.length;
  const accTotal = showAccommodation && accommodationRequired ? (event?.accommodationPrice || 0) * attendees.length : 0;
  const grandTotal = ticketTotal + accTotal;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="multi-attendee-booking">
      {/* Header */}
      <div className="booking-header">
        <h2>Register for <span className="event-name-highlight">{event?.eventName}</span></h2>
        {event?.isTeamEvent && (
          <div className="team-toggle">
            <button className={`toggle-btn ${!isTeamMode ? 'active' : ''}`} onClick={() => setIsTeamMode(false)}>
              <User size={16} /> Individual
            </button>
            <button className={`toggle-btn ${isTeamMode ? 'active' : ''}`} onClick={() => setIsTeamMode(true)}>
              <Users size={16} /> Team
            </button>
          </div>
        )}
      </div>

      {/* Team Name & Size */}
      {isTeamMode && (
        <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group team-name-group" style={{ flex: 2, margin: 0 }}>
            <label>Team Name *</label>
            <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder="e.g. Code Ninjas" className={errors.teamName ? 'input-error' : ''} />
            {errors.teamName && <span className="error-msg">{errors.teamName}</span>}
          </div>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label>Team Size (Max {maxSlots})</label>
            <input type="number" min="1" max={maxSlots} value={attendees.length}
              onChange={e => {
                const size = Math.min(parseInt(e.target.value) || 1, maxSlots);
                setAttendees(p => {
                  const arr = [...p];
                  while (arr.length < size) arr.push({ ...EMPTY_ATTENDEE, college: leaderCollege });
                  return arr.slice(0, size);
                });
              }} className="form-input" />
          </div>
        </div>
      )}

      {/* Individual ticket count */}
      {!isTeamMode && !event?.isTeamEvent && (
        <div className="form-group" style={{ marginBottom: '1rem', maxWidth: '200px' }}>
          <label>Number of Tickets</label>
          <input type="number" min="1" max={maxSlots} value={attendees.length}
            onChange={e => {
              const size = Math.min(parseInt(e.target.value) || 1, maxSlots);
              setAttendees(p => {
                const arr = [...p];
                while (arr.length < size) arr.push({ ...EMPTY_ATTENDEE, college: leaderCollege });
                return arr.slice(0, size);
              });
            }} className="form-input" />
        </div>
      )}

      {/* Attendee Cards */}
      <div className="attendees-list">
        {attendees.map((att, idx) => (
          <AttendeeCard key={idx} idx={idx} att={att} errors={errors}
            isLeader={idx === 0 && (isTeamMode || event?.isTeamEvent)}
            collegeConf={COLLEGE_CONFIG[att.college] || null}
            colleges={COLLEGES}
            onUpdate={updateAttendee}
            onRemove={removeAttendee}
          />
        ))}
      </div>

      {/* Add Attendee */}
      {attendees.length < maxSlots && (
        <button className="add-attendee-btn" onClick={addAttendee}>
          <Plus size={16} /> Add {isTeamMode ? 'Team Member' : 'Attendee'}
        </button>
      )}

      {/* Accommodation */}
      {showAccommodation && (
        <div style={{
          background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: '12px',
          border: '1px solid var(--border-color)', marginTop: '1rem',
          display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>🏨 Accommodation</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {event.accommodationPrice > 0 ? `₹${event.accommodationPrice}/person` : 'Free accommodation available'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${!accommodationRequired ? 'btn-primary' : 'btn-ghost'}`}
              style={!accommodationRequired ? { background: 'linear-gradient(135deg,#800000,#a00000)', border: 'none' } : {}}
              onClick={() => setAccommodationRequired(false)}>Not Required</button>
            <button
              className={`btn ${accommodationRequired ? 'btn-primary' : 'btn-ghost'}`}
              style={accommodationRequired ? { background: 'linear-gradient(135deg,#800000,#a00000)', border: 'none' } : {}}
              onClick={() => setAccommodationRequired(true)}>Opt In</button>
          </div>
        </div>
      )}



      {/* Summary & Submit */}
      <div className="booking-summary-footer">
        <div className="summary-info">
          <span>{attendees.length} {attendees.length === 1 ? 'Ticket' : 'Tickets'}</span>
          <span className="total-price">
            {grandTotal > 0 ? `₹${grandTotal.toFixed(2)}` : 'FREE'}
          </span>
        </div>
        {grandTotal > 0 && accTotal > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
            Tickets ₹{ticketTotal.toFixed(2)} + Accommodation ₹{accTotal.toFixed(2)}
          </div>
        )}
        <button className="btn-confirm-booking" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner-sm" /> : null}
          {submitting ? 'Processing...' : grandTotal > 0 ? 'Proceed to Payment →' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

// ── AttendeeCard ──────────────────────────────────────────────────────────────
function AttendeeCard({ idx, att, errors, isLeader, onUpdate, onRemove, colleges, collegeConf }) {
  const [expanded, setExpanded] = useState(idx === 0);

  return (
    <div className={`attendee-card ${isLeader ? 'leader-card' : ''}`}>
      <div className="attendee-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="attendee-avatar">{att.name ? att.name[0].toUpperCase() : (idx + 1)}</div>
        <div className="attendee-card-title">
          <strong>{att.name || `Attendee ${idx + 1}`}</strong>
          {isLeader && <span className="leader-badge">Team Leader</span>}
          {att.email && <small>{att.email}</small>}
        </div>
        <div className="attendee-card-actions">
          {idx > 0 && (
            <button className="remove-btn" onClick={e => { e.stopPropagation(); onRemove(idx); }}>
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronDown size={16} /> : <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="attendee-card-body">
          {/* Name + Email */}
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={att.name} onChange={e => onUpdate(idx, 'name', e.target.value)}
                placeholder="John Doe" className={errors[`${idx}_name`] ? 'input-error' : ''} />
              {errors[`${idx}_name`] && <span className="error-msg">{errors[`${idx}_name`]}</span>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={att.email} onChange={e => onUpdate(idx, 'email', e.target.value)}
                placeholder="john@example.com" className={errors[`${idx}_email`] ? 'input-error' : ''} />
              {errors[`${idx}_email`] && <span className="error-msg">{errors[`${idx}_email`]}</span>}
            </div>
          </div>

          {/* Phone + College */}
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={att.phone} onChange={e => onUpdate(idx, 'phone', e.target.value)}
                placeholder="10-digit number" maxLength={10}
                className={errors[`${idx}_phone`] ? 'input-error' : ''} />
              {errors[`${idx}_phone`] && <span className="error-msg">{errors[`${idx}_phone`]}</span>}
            </div>
            <div className="form-group">
              <label>College / University *</label>
              <select value={att.college} onChange={e => onUpdate(idx, 'college', e.target.value)}
                className={`form-select ${errors[`${idx}_college`] ? 'input-error' : ''}`}>
                <option value="">Select college...</option>
                {colleges.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors[`${idx}_college`] && <span className="error-msg">{errors[`${idx}_college`]}</span>}
            </div>
          </div>

          {/* ID Number (dynamic based on college) */}
          {att.college && collegeConf && (
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>{collegeConf.idLabel} *</label>
                <input type="text" value={att.collegeId}
                  onChange={e => onUpdate(idx, 'collegeId', e.target.value.toUpperCase())}
                  placeholder={collegeConf.idPlaceholder}
                  className={errors[`${idx}_collegeId`] ? 'input-error' : ''}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                {errors[`${idx}_collegeId`] && <span className="error-msg">{errors[`${idx}_collegeId`]}</span>}
              </div>
            </div>
          )}

          {/* Extra fields for Other College */}
          {att.college === 'Other College / University' && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.875rem', marginBottom: '0.5rem', background: 'rgba(245,158,11,0.04)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.6rem' }}>🏫 External Institution Details</div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>College / University Name *</label>
                  <input type="text" value={att.collegeName}
                    onChange={e => onUpdate(idx, 'collegeName', e.target.value)}
                    placeholder="e.g. Anna University"
                    className={errors[`${idx}_collegeName`] ? 'input-error' : ''} />
                  {errors[`${idx}_collegeName`] && <span className="error-msg">{errors[`${idx}_collegeName`]}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>State *</label>
                  <select value={att.collegeState} onChange={e => onUpdate(idx, 'collegeState', e.target.value)}
                    className={`form-select ${errors[`${idx}_collegeState`] ? 'input-error' : ''}`}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors[`${idx}_collegeState`] && <span className="error-msg">{errors[`${idx}_collegeState`]}</span>}
                  {att.collegeState === 'Other' && (
                    <input type="text" value={att.otherCollegeState || ''} onChange={e => onUpdate(idx, 'otherCollegeState', e.target.value)}
                      placeholder="Specify State" className="form-input" style={{ marginTop: '0.5rem' }} required />
                  )}
                </div>
                <div className="form-group">
                  <label>City / Location *</label>
                  <input type="text" value={att.collegeLocation}
                    onChange={e => onUpdate(idx, 'collegeLocation', e.target.value)}
                    placeholder="e.g. Chennai"
                    className={errors[`${idx}_collegeLocation`] ? 'input-error' : ''} />
                  {errors[`${idx}_collegeLocation`] && <span className="error-msg">{errors[`${idx}_collegeLocation`]}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select value={att.department} onChange={e => onUpdate(idx, 'department', e.target.value)} className="form-select">
                    <option value="">Select Dept.</option>
                    {DEPARTMENTS_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {att.department === 'Other' && (
                    <input type="text" value={att.otherDepartment || ''} onChange={e => onUpdate(idx, 'otherDepartment', e.target.value)}
                      placeholder="Specify Department" className="form-input" style={{ marginTop: '0.5rem' }} required />
                  )}
                </div>
                <div className="form-group">
                  <label>Year of Study</label>
                  <select value={att.yearOfStudy} onChange={e => onUpdate(idx, 'yearOfStudy', e.target.value)} className="form-select">
                    <option value="">Select Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
