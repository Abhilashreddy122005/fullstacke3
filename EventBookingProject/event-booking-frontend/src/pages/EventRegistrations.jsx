import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById, getEventBookings, deleteBooking, editBooking, exportEventBookings, openRegistration, pauseRegistration, closeRegistration, publishEvent, updateEvent, checkInAttendee, checkOutAttendee, addMemberToBooking, removeAttendee, editAttendee, toggleCertificates, sendAllCertificates } from '../api/axios';
import { ArrowLeft, Search, Download, RefreshCw, UserCheck, UserX, Trash2, CheckCircle, Play, Pause, Square, Edit2, X, Save, FileText, Image, DollarSign, Plus, UserMinus, Award, UserCog } from 'lucide-react';

export default function EventRegistrations() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState('registrations');
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0], receiptBase64: '' });
  const [photoForm, setPhotoForm] = useState({ photoBase64: '' });
  // Add-member modal state
  const [addMemberTarget, setAddMemberTarget] = useState(null); // booking object
  const [addMemberForm, setAddMemberForm] = useState({ name: '', email: '', phone: '' });
  // Edit attendee modal state
  const [editAttendeeTarget, setEditAttendeeTarget] = useState(null); // attendee object
  const [editAttendeeForm, setEditAttendeeForm] = useState({ name: '', email: '', phone: '' });
  // Certificate state
  const [certBusy, setCertBusy] = useState(false);
  useEffect(() => { load(); }, [eventId]);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, bk] = await Promise.all([getEventById(eventId), getEventBookings(eventId)]);
      setEvent(ev.data);
      setBookings(bk.data || []);
    } catch { notify('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const doCheckInAttendee = async (bId, a) => {
    setBusy(a.id + '_ci');
    try {
      await checkInAttendee(eventId, a.id);
      setBookings(p => p.map(b => b.id === bId ? { ...b, attendees: b.attendees.map(att => att.id === a.id ? { ...att, attendanceStatus: 'CHECKED_IN' } : att) } : b));
      notify(`✅ ${a.name} checked in!`);
    } catch (e) { notify(e.response?.data?.error || 'Check-in failed', 'error'); }
    finally { setBusy(null); }
  };

  const doCheckOutAttendee = async (bId, a) => {
    setBusy(a.id + '_co');
    try {
      await checkOutAttendee(eventId, a.id);
      setBookings(p => p.map(b => b.id === bId ? { ...b, attendees: b.attendees.map(att => att.id === a.id ? { ...att, attendanceStatus: 'CHECKED_OUT' } : att) } : b));
      notify(`↩️ ${a.name} checked out`);
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
    finally { setBusy(null); }
  };

  const doRemoveAttendee = async (bId, a) => {
    if (!window.confirm(`Remove ${a.name} from the team?`)) return;
    setBusy(a.id + '_rm');
    try {
      await removeAttendee(eventId, a.id);
      setBookings(p => p.map(b => b.id === bId ? { ...b, attendees: b.attendees.filter(att => att.id !== a.id) } : b));
      notify(`🗑️ ${a.name} removed from team`);
    } catch (e) { notify(e.response?.data?.error || 'Remove failed', 'error'); }
    finally { setBusy(null); }
  };

  const doEditAttendee = async (e) => {
    e.preventDefault();
    const target = editAttendeeTarget;
    setBusy('edit_attendee');
    try {
      const { data } = await editAttendee(target.id, editAttendeeForm);
      setBookings(p => p.map(b => ({
        ...b,
        attendees: b.attendees?.map(a => a.id === target.id ? { ...a, ...data } : a)
      })));
      notify(`Updated ${data.name}`);
      setEditAttendeeTarget(null);
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update attendee', 'error');
    } finally {
      setBusy(null);
    }
  };

  const openEditAttendee = (a) => {
    setEditAttendeeTarget(a);
    setEditAttendeeForm({ name: a.name, email: a.email, phone: a.phone || '' });
  };

  const doAddMember = async () => {
    if (!addMemberForm.name.trim() || !addMemberForm.email.trim()) { notify('Name and email required', 'error'); return; }
    setBusy('add_member');
    try {
      const res = await addMemberToBooking(eventId, addMemberTarget.id, addMemberForm);
      const newAtt = { id: res.data.attendeeId, name: res.data.name, email: res.data.email, attendanceStatus: 'PENDING', teamLeader: false };
      setBookings(p => p.map(b => b.id === addMemberTarget.id ? { ...b, attendees: [...(b.attendees || []), newAtt] } : b));
      notify(`✅ ${res.data.name} added to team!`);
      setAddMemberTarget(null);
      setAddMemberForm({ name: '', email: '', phone: '' });
    } catch (e) { notify(e.response?.data?.error || 'Failed to add member', 'error'); }
    finally { setBusy(null); }
  };

  const doToggleCertificates = async (enabled) => {
    setCertBusy(true);
    try {
      await toggleCertificates(eventId, enabled);
      setEvent(p => ({ ...p, certificatesEnabled: enabled }));
      notify(enabled ? '🎓 Certificates enabled!' : 'Certificates disabled');
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
    finally { setCertBusy(false); }
  };

  const doSendAllCertificates = async () => {
    if (!window.confirm('Send certificates to ALL attendees? This cannot be undone.')) return;
    setCertBusy(true);
    try {
      const res = await sendAllCertificates(eventId);
      notify(`🎓 ${res.data.message}`);
    } catch (e) { notify(e.response?.data?.error || 'Failed to send certificates', 'error'); }
    finally { setCertBusy(false); }
  };

  const doDelete = async (b) => {
    setBusy(b.id + '_del');
    try {
      await deleteBooking(eventId, b.id);
      setBookings(p => p.filter(x => x.id !== b.id));
      setEvent(p => p ? { ...p, availableTickets: p.availableTickets + b.numberOfTickets } : p);
      setConfirmDelete(null);
      notify(`🗑️ Deleted — ${b.numberOfTickets} ticket(s) restored`);
    } catch (e) { notify(e.response?.data?.error || 'Delete failed', 'error'); }
    finally { setBusy(null); }
  };

  const openEdit = (b) => {
    setEditTarget(b);
    setEditForm({ numberOfTickets: b.numberOfTickets, accommodationRequired: b.accommodationRequired, checkedIn: b.checkedIn });
  };

  const doEdit = async () => {
    setBusy(editTarget.id + '_edit');
    try {
      await editBooking(eventId, editTarget.id, editForm);
      await load();
      setEditTarget(null);
      notify('✅ Booking updated!');
    } catch (e) { notify(e.response?.data?.error || 'Update failed', 'error'); }
    finally { setBusy(null); }
  };

  const doLifecycle = async (fn, label) => {
    setBusy('lc');
    try { await fn(eventId); await load(); notify(`✅ Registration ${label}!`); }
    catch (e) { notify(e.response?.data?.message || e.response?.data?.error || 'Failed', 'error'); }
    finally { setBusy(null); }
  };

  const doExport = () => {
    const token = JSON.parse(localStorage.getItem('eventUser') || '{}').token;
    fetch(exportEventBookings(eventId), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${event?.eventName || 'event'}_registrations.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        notify('📥 CSV downloaded!');
      })
      .catch(() => notify('Export failed', 'error'));
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.description) return;
    try {
      setBusy('expense');
      const updatedExpenses = [...(event.expenses || []), { ...expenseForm, amount: parseFloat(expenseForm.amount) }];
      await updateEvent(eventId, { ...event, expenses: updatedExpenses });
      notify('Expense added!');
      setExpenseForm({ description: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0], receiptBase64: '' });
      load();
    } catch (err) { notify('Failed to add expense', 'error'); }
    finally { setBusy(''); }
  };

  const handleAddPhoto = async (e) => {
    e.preventDefault();
    if (!photoForm.photoBase64) return;
    try {
      setBusy('photo');
      const updatedPhotos = [...(event.reportPhotos || []), photoForm.photoBase64];
      await updateEvent(eventId, { ...event, reportPhotos: updatedPhotos });
      notify('Photo added!');
      setPhotoForm({ photoBase64: '' });
      load();
    } catch (err) { notify('Failed to add photo', 'error'); }
    finally { setBusy(''); }
  };

  const handleDeleteExpense = async (index) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      const updatedExpenses = (event.expenses || []).filter((_, i) => i !== index);
      await updateEvent(eventId, { ...event, expenses: updatedExpenses });
      notify('Expense deleted');
      load();
    } catch (err) { notify('Failed to delete expense', 'error'); }
  };

  const handleDeletePhoto = async (index) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      const updatedPhotos = (event.reportPhotos || []).filter((_, i) => i !== index);
      await updateEvent(eventId, { ...event, reportPhotos: updatedPhotos });
      notify('Photo deleted');
      load();
    } catch (err) { notify('Failed to delete photo', 'error'); }
  };


  const stats = useMemo(() => ({
    total: bookings.length,
    checkedIn: bookings.reduce((sum, b) => sum + (b.attendees ? b.attendees.filter(a => a.attendanceStatus === 'CHECKED_IN').length : 0), 0),
    pending: bookings.reduce((sum, b) => sum + (b.attendees ? b.attendees.filter(a => a.attendanceStatus !== 'CHECKED_IN').length : 0), 0),
    revenue: bookings.reduce((s, b) => s + parseFloat(b.totalAmount || 0), 0),
  }), [bookings]);

  const filtered = useMemo(() => bookings.filter(b => {
    const q = search.toLowerCase();
    const ms = !q || b.user?.name?.toLowerCase().includes(q) || b.user?.email?.toLowerCase().includes(q) || b.bookingReference?.toLowerCase().includes(q);
    const mf = filterStatus === 'all' || (filterStatus === 'in' && b.checkedIn) || (filterStatus === 'out' && !b.checkedIn);
    return ms && mf;
  }), [bookings, search, filterStatus]);

  const SC = { PUBLISHED: '#22c55e', REGISTRATION_OPEN: '#22c55e', PAUSED: '#f59e0b', REGISTRATION_PAUSED: '#f59e0b', CANCELLED: '#ef4444', DRAFT: '#6366f1' };
  const sc = event?.status ? (SC[event.status] || '#6366f1') : '#6366f1';

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}><div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 1rem' }} /><p style={{ color: 'var(--text-secondary)' }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, padding: '0.875rem 1.25rem', background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(34,197,94,0.95)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-lg)', color: 'white', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>🎟️ {event?.eventName} — Registrations</h1>
            <span style={{ padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', background: `${sc}20`, border: `1px solid ${sc}40`, color: sc, fontSize: '0.72rem', fontWeight: 700 }}>{event?.status}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {event?.department} · {event?.venue || 'TBD'} · {event?.startDate ? new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={load} className="btn btn-ghost" title="Refresh"><RefreshCw size={16} /></button>
          <button onClick={doExport} className="btn btn-ghost" style={{ color: '#22c55e' }}><Download size={16} /> Export CSV</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {[
          { id: 'registrations', icon: <UserCheck size={15} />, label: 'Registrations' },
          { id: 'expenses', icon: <DollarSign size={15} />, label: 'Expenses' },
          { id: 'report', icon: <FileText size={15} />, label: 'Final Report' },
          { id: 'certificates', icon: <Award size={15} />, label: 'Certificates' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'registrations' && (
        <>
          {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: event?.isTeamEvent ? 'Teams' : 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Checked In', value: stats.checkedIn, color: '#22c55e' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, color: '#a855f7' },
          event?.isTeamEvent
            ? { label: 'Teams Left', value: event?.maxTeams != null ? (event.maxTeams - stats.total) : '∞', color: '#38bdf8' }
            : { label: 'Seats Left', value: event?.availableTickets ?? '—', color: '#38bdf8' },
          ...(event?.isTeamEvent && event?.maxTeamSize ? [{ label: 'Max Team Size', value: event.maxTeamSize, color: '#f472b6' }] : []),
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderColor: `${s.color}30` }}>
            <div className="stat-info">
              <div className="stat-value" style={{ fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Check-in Progress */}
      {stats.total > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
            <span>Check-in Progress</span>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>{Math.round((stats.checkedIn / stats.total) * 100)}%</span>
          </div>
          <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(stats.checkedIn / stats.total) * 100}%`, background: 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* Registration Controls */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status Controls:</span>
        <button className="btn btn-ghost" style={{ color: '#6366f1' }} disabled={busy === 'lc' || (event?.status !== 'DRAFT' && event?.status !== 'APPROVED')} onClick={() => doLifecycle(publishEvent, 'published')} title="Make event visible to students without opening registration"><CheckCircle size={13} /> Publish</button>
        <button className="btn btn-ghost" style={{ color: '#22c55e' }} disabled={busy === 'lc' || event?.status === 'REGISTRATION_OPEN'} onClick={() => doLifecycle(openRegistration, 'opened')}><Play size={13} /> Open Reg.</button>
        <button className="btn btn-ghost" style={{ color: '#f59e0b' }} disabled={busy === 'lc' || event?.status === 'REGISTRATION_PAUSED' || event?.status === 'DRAFT'} onClick={() => doLifecycle(pauseRegistration, 'paused')}><Pause size={13} /> Pause Reg.</button>
        <button className="btn btn-ghost" style={{ color: '#ef4444' }} disabled={busy === 'lc' || event?.status === 'REGISTRATION_CLOSED' || event?.status === 'DRAFT'} onClick={() => doLifecycle(closeRegistration, 'closed')}><Square size={13} /> Close Reg.</button>
      </div>


      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search name, email, reference..." value={search} onChange={e => setSearch(e.target.value)} className="form-input" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select" style={{ width: 'auto' }}>
          <option value="all">All ({bookings.length})</option>
          <option value="in">Checked In ({stats.checkedIn})</option>
          <option value="out">Pending ({stats.pending})</option>
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filtered.length} shown</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3 className="empty-title">{bookings.length === 0 ? 'No Registrations Yet' : 'No Results'}</h3>
          <p className="empty-desc">{bookings.length === 0 ? 'No one has registered for this event.' : 'Try a different search or filter.'}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Attendee</th><th>Reference</th><th>Dept / Year</th>
                <th>Tickets</th><th>Amount</th><th>Payment</th><th>Accom.</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} style={{ background: b.checkedIn ? 'rgba(34,197,94,0.04)' : 'transparent', borderLeft: `3px solid ${b.checkedIn ? 'rgba(34,197,94,0.5)' : 'transparent'}` }}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.user?.email}</div>
                    {b.attendees && b.attendees.length > 0 && (
                      <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Attendees ({b.attendees.length}):</div>
                        {b.attendees.map(a => (
                          <div key={a.id} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: a.attendanceStatus === 'CHECKED_IN' ? '#22c55e' : '#f59e0b' }} />
                              <span>{a.name}{a.teamLeader ? <span style={{ color: '#818cf8', fontSize: '0.62rem', marginLeft: 2 }}>(Leader)</span> : ''} <span style={{ color: 'var(--text-muted)' }}>({a.email})</span></span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                              {a.attendanceStatus !== 'CHECKED_IN' ? (
                                <button className="btn" style={{ padding: '1px 6px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={() => doCheckInAttendee(b.id, a)} disabled={busy === a.id + '_ci'}>
                                  {busy === a.id + '_ci' ? <div className="spinner spinner-sm" style={{width:8,height:8}}/> : <><UserCheck size={10}/> In</>}
                                </button>
                              ) : (
                                <button className="btn btn-ghost" style={{ padding: '1px 6px', color: '#f59e0b', fontSize: '0.68rem', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={() => doCheckOutAttendee(b.id, a)} disabled={busy === a.id + '_co'}>
                                  {busy === a.id + '_co' ? <div className="spinner spinner-sm" style={{width:8,height:8}}/> : <><UserX size={10}/> Out</>}
                                </button>
                              )}
                              {!a.teamLeader && (
                                <button className="btn btn-ghost" style={{ padding: '1px 5px', color: '#ef4444', fontSize: '0.68rem', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center' }} onClick={() => doRemoveAttendee(b.id, a)} disabled={busy === a.id + '_rm'} title="Withdraw member">
                                  {busy === a.id + '_rm' ? <div className="spinner spinner-sm" style={{width:8,height:8}}/> : <UserMinus size={10}/>}
                                </button>
                              )}
                              <button className="btn btn-icon btn-ghost" style={{ width: '18px', height: '18px', minWidth: '18px', padding: 0, color: 'var(--text-muted)' }} onClick={() => openEditAttendee(a)} title="Edit Details">
                                <UserCog size={10}/>
                              </button>
                            </div>
                          </div>
                        ))}
                        {/* Add member button — works for team events */}
                        {(b.teamBooking || b.isTeamBooking || b.teamName) && (!event?.maxTeamSize || (b.attendees?.length || 0) < event.maxTeamSize) && (
                          <button className="btn" style={{ marginTop: '0.5rem', padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem', borderRadius: '6px' }} onClick={() => { setAddMemberTarget(b); setAddMemberForm({ name: '', email: '', phone: '' }); }}>
                            <Plus size={12}/> Add Member ({(b.attendees?.length || 0)}/{event?.maxTeamSize || '∞'})
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#818cf8' }}>{b.bookingReference}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('en-IN') : '—'}</div>
                  </td>
                  <td>
                    <div>{b.user?.department || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.user?.yearOfStudy ? `Year ${b.user.yearOfStudy}` : ''}</div>
                  </td>
                  <td><span className="badge badge-primary">{b.numberOfTickets}</span></td>
                  <td style={{ fontWeight: 700, color: '#22c55e' }}>{Number(b.totalAmount) === 0 ? 'FREE' : `₹${Number(b.totalAmount).toLocaleString('en-IN')}`}</td>
                  <td>
                    {b.paymentStatus === 'PAID' ? <span className="badge badge-success">💳 Paid</span>
                     : b.paymentStatus === 'FREE' ? <span className="badge" style={{background:'rgba(34,197,94,0.15)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.3)'}}>Free</span>
                     : b.paymentStatus === 'REFUNDED' ? <span className="badge" style={{background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)'}}>↩ Refunded</span>
                     : b.paymentStatus === 'FAILED' ? <span className="badge badge-danger">❌ Failed</span>
                     : <span className="badge badge-warning">⏳ Pending</span>}
                    {b.razorpayPaymentId && <div style={{fontSize:'0.62rem',color:'var(--text-muted)',marginTop:'2px',fontFamily:'monospace'}}>{b.razorpayPaymentId}</div>}
                  </td>
                  <td>{b.accommodationRequired ? <span className="badge badge-primary">Yes</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No</span>}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {b.attendees && b.attendees.filter(a => a.attendanceStatus === 'CHECKED_IN').length === b.attendees.length ? (
                        <span className="badge badge-success"><CheckCircle size={11} /> Verified</span>
                      ) : (
                        <span className="badge badge-warning">⏳ {b.attendees ? b.attendees.filter(a => a.attendanceStatus === 'CHECKED_IN').length : 0}/{b.attendees ? b.attendees.length : 0} In</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button className="btn btn-icon btn-ghost" onClick={() => openEdit(b)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-icon btn-danger" onClick={() => setConfirmDelete(b)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAddMemberTarget(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title"><Plus size={16}/> Add Team Member</h2>
              <button className="modal-close" onClick={() => setAddMemberTarget(null)}><X size={20}/></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Team: <strong>{addMemberTarget.teamName || addMemberTarget.bookingReference}</strong> &nbsp;·&nbsp;
              {addMemberTarget.attendees?.length || 0}/{event?.maxTeamSize || '∞'} members
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="form-input" placeholder="Full Name *" value={addMemberForm.name} onChange={e => setAddMemberForm(p => ({...p, name: e.target.value}))} />
              <input className="form-input" type="email" placeholder="Email Address *" value={addMemberForm.email} onChange={e => setAddMemberForm(p => ({...p, email: e.target.value}))} />
              <input className="form-input" placeholder="Phone (optional)" value={addMemberForm.phone} onChange={e => setAddMemberForm(p => ({...p, phone: e.target.value}))} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setAddMemberTarget(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={doAddMember} disabled={busy === 'add_member'}>
                  {busy === 'add_member' ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendee Modal */}
      {editAttendeeTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditAttendeeTarget(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title"><UserCog size={16}/> Edit Attendee Details</h2>
              <button className="modal-close" onClick={() => setEditAttendeeTarget(null)}><X size={20}/></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Updating details for <strong>{editAttendeeTarget.name}</strong>
            </p>
            <form onSubmit={doEditAttendee} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="form-input" placeholder="Full Name *" value={editAttendeeForm.name} onChange={e => setEditAttendeeForm(p => ({...p, name: e.target.value}))} required />
              <input className="form-input" type="email" placeholder="Email Address *" value={editAttendeeForm.email} onChange={e => setEditAttendeeForm(p => ({...p, email: e.target.value}))} required />
              <input className="form-input" placeholder="Phone Number" value={editAttendeeForm.phone} onChange={e => setEditAttendeeForm(p => ({...p, phone: e.target.value}))} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditAttendeeTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy === 'edit_attendee'}>
                  {busy === 'edit_attendee' ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Edit Booking</h2>
              <button className="modal-close" onClick={() => setEditTarget(null)}><X size={20} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              <strong>{editTarget.user?.name}</strong> — {editTarget.bookingReference}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Number of Tickets</label>
                <input type="number" className="form-input" min="1" value={editForm.numberOfTickets} onChange={e => setEditForm(p => ({ ...p, numberOfTickets: parseInt(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editForm.accommodationRequired} onChange={e => setEditForm(p => ({ ...p, accommodationRequired: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  Accommodation Required
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={doEdit} disabled={busy === editTarget.id + '_edit'}>
                  {busy === editTarget.id + '_edit' ? <><div className="spinner spinner-sm" /> Saving...</> : <><Save size={14} /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
              <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Delete Registration?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Remove <strong>{confirmDelete.user?.name}</strong>'s booking?</p>
              <p style={{ color: '#22c55e', fontSize: '0.875rem', marginBottom: '1.5rem' }}>✅ {confirmDelete.numberOfTickets} ticket(s) will be restored.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => doDelete(confirmDelete)} disabled={busy === confirmDelete.id + '_del'}>
                  {busy === confirmDelete.id + '_del' ? <><div className="spinner spinner-sm" /> Deleting...</> : <><Trash2 size={14} /> Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'certificates' && (
        <div style={{ maxWidth: '640px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={18} style={{ color: '#d4a017' }}/> Participation Certificates</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  Generate and email personalized certificates to all {bookings.reduce((s,b) => s + (b.attendees?.length || 0), 0)} attendees.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{event?.certificatesEnabled ? 'Enabled' : 'Disabled'}</span>
                <div
                  onClick={() => !certBusy && doToggleCertificates(!event?.certificatesEnabled)}
                  style={{ width: 44, height: 24, borderRadius: 12, background: event?.certificatesEnabled ? '#22c55e' : 'var(--border-color)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                >
                  <div style={{ position: 'absolute', top: 3, left: event?.certificatesEnabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                </div>
              </label>
            </div>
          </div>

          {event?.certificatesEnabled ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', color: '#d4a017' }}>🎓 Certificate Preview</h4>
              <div style={{ background: 'rgba(212,160,23,0.06)', border: '2px solid #800000', borderRadius: '8px', padding: '2rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>VelTech Rangarajan Dr. Sagunthala R&amp;D Institute of Science and Technology</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#800000', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Certificate</div>
                <div style={{ fontSize: '0.8rem', color: '#6b2d2d', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>of Participation</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>This is to certify that</div>
                <div style={{ fontSize: '1.5rem', color: '#800000', fontStyle: 'italic', borderBottom: '2px solid #d4a017', display: 'inline-block', padding: '0 1rem 2px', margin: '0.5rem 0' }}>Attendee Name</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>has successfully participated in</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#800000', marginTop: '0.25rem' }}>{event?.eventName}</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>{event?.startDate ? new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} · {event?.venue || 'VelTech University'}</div>
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#aaa' }}>
                  <span>ID: CERT-{event?.id}-XXX</span>
                  <span>Event Coordinator &nbsp;|&nbsp; Department Head</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Will send to <strong>{bookings.reduce((s,b) => s + (b.attendees?.length || 0), 0)}</strong> attendees across <strong>{bookings.length}</strong> registrations.
                </p>
                <button className="btn btn-primary" onClick={doSendAllCertificates} disabled={certBusy} style={{ background: 'linear-gradient(135deg,#800000,#b30000)' }}>
                  {certBusy ? <><div className="spinner spinner-sm"/> Sending...</> : <><Award size={15}/> Generate &amp; Send All</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎓</div>
              <h3 className="empty-title">Certificates Disabled</h3>
              <p className="empty-desc">Enable certificates above to generate and send participation certificates to all attendees.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (

        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 300px', alignItems: 'start' }}>
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Event Expenses</h3>
            {(!event.expenses || event.expenses.length === 0) ? (
              <div className="empty-state"><div className="empty-icon">💸</div><p className="empty-desc">No expenses recorded yet.</p></div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Receipt</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.expenses.map((exp, idx) => (
                      <tr key={idx}>
                        <td>{exp.date}</td>
                        <td><span className="badge badge-purple">{exp.category}</span></td>
                        <td>{exp.description}</td>
                        <td style={{ fontWeight: 700, color: '#f87171' }}>₹{exp.amount}</td>
                        <td>{exp.receiptBase64 ? <a href={exp.receiptBase64} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>View</a> : '—'}</td>
                        <td>
                          <button className="btn btn-icon btn-danger" onClick={() => handleDeleteExpense(idx)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ marginBottom: '1rem' }}>Add Expense</h4>
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="date" required className="form-input" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
              <select className="form-select" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                {['Venue', 'Food', 'Marketing', 'Logistics', 'Prizes', 'General', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" required placeholder="Description" className="form-input" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
              <input type="number" required placeholder="Amount (₹)" className="form-input" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
              <input type="file" accept="image/*" className="form-input" onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setExpenseForm({...expenseForm, receiptBase64: reader.result});
                  reader.readAsDataURL(file);
                }
              }} />
              <button type="submit" className="btn btn-primary" disabled={busy === 'expense'}>
                {busy === 'expense' ? 'Adding...' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div style={{ background: '#ffffff', color: '#1e293b', padding: '3rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
          <button className="btn btn-primary" style={{ position: 'absolute', top: '2rem', right: '2rem' }} onClick={() => window.print()}>
            <FileText size={16} /> Print/Save PDF
          </button>
          
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '2rem', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>Event Post-Report</h1>
            <h2 style={{ fontSize: '1.5rem', color: '#64748b', margin: 0 }}>{event?.eventName}</h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Organized by: {event?.department}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Overview</h3>
              <p><strong>Date:</strong> {event?.startDate}</p>
              <p><strong>Venue:</strong> {event?.venue || 'TBD'}</p>
              <p><strong>Total Tickets:</strong> {event?.totalTickets}</p>
              <p><strong>Status:</strong> {event?.status}</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Statistics</h3>
              <p><strong>Total Registrations:</strong> {stats.total}</p>
              <p><strong>Total Checked In:</strong> {stats.checkedIn} ({stats.total ? Math.round(stats.checkedIn/stats.total*100) : 0}%)</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#16a34a', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Gross Revenue</h4>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d' }}>₹{stats.revenue.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#dc2626', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Total Expenses</h4>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b91c1c' }}>
                ₹{((event?.expenses || []).reduce((s, e) => s + (e.amount || 0), 0)).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '3rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 1rem' }}>Net Profit/Loss</h3>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: (stats.revenue - ((event?.expenses || []).reduce((s, e) => s + (e.amount || 0), 0))) >= 0 ? '#16a34a' : '#dc2626' }}>
              ₹{(stats.revenue - ((event?.expenses || []).reduce((s, e) => s + (e.amount || 0), 0))).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Expense Breakdown</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#334155' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(event?.expenses || []).map((exp, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem' }}><strong>{exp.category}</strong></td>
                    <td style={{ padding: '0.75rem' }}>{exp.description}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>₹{exp.amount}</td>
                  </tr>
                ))}
                {(!event?.expenses || event?.expenses.length === 0) && (
                  <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center' }}>No expenses recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', color: '#0f172a', margin: 0 }}>Event Photos</h3>
              <form onSubmit={handleAddPhoto} style={{ display: 'flex', gap: '0.5rem' }} className="no-print">
                <input type="file" accept="image/*" required style={{ fontSize: '0.8rem' }} onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setPhotoForm({ photoBase64: reader.result });
                    reader.readAsDataURL(file);
                  }
                }} />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }} disabled={busy === 'photo'}>Add Photo</button>
              </form>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {(event?.reportPhotos || []).map((photo, idx) => (
                <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '4/3' }}>
                  <img src={photo} alt={`Event photo ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button className="btn btn-danger no-print" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.25rem' }} onClick={() => handleDeletePhoto(idx)}><Trash2 size={12} /></button>
                </div>
              ))}
              {(!event?.reportPhotos || event?.reportPhotos.length === 0) && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No photos added yet.</div>
              )}
            </div>
          </div>
          
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .page { margin: 0; padding: 0; background: transparent; }
              .no-print { display: none !important; }
              .page > div:last-child, .page > div:last-child * { visibility: visible; }
              .page > div:last-child { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; padding: 0; border: none; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
