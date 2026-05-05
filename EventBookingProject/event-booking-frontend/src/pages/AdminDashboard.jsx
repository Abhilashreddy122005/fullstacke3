import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats, getAllEvents, getAllBookings,
  createEvent, updateEvent, deleteEvent,
  cancelEvent, sendCampaign, sendAnnouncement,
  publishEvent, openRegistration, pauseRegistration,
  closeRegistration, postponeEvent, completeEvent,
  addCoordinator, removeCoordinator
} from '../api/axios';
import API from '../api/axios';
import {
  LayoutDashboard, Calendar, BookOpen, Plus, Edit2, Trash2,
  X, RefreshCw, CheckCircle, UserCheck, UserX, Clock,
  Send, BellRing, Ban, Megaphone, Play, Pause, Square, AlertTriangle, Flag, Users
} from 'lucide-react';

const EMPTY_EVENT = {
  eventName: '', department: '', conductingDepartment: '', otherConductingDepartment: '',
  date: '', startDate: '', endDate: '', time: '', endTime: '',
  venue: '', price: '', totalTickets: '', description: '',
  imageUrl: '', targetDepartments: [], targetYears: [],
  organizingDepartments: [], eventType: 'OTHER', customEventType: '', locationType: 'OFFLINE',
  numberOfDays: 1, accommodationProvided: false, accommodationPrice: 0,
  customRegistrationFields: [],
  registrationStartDate: '', registrationEndDate: '',
  status: 'DRAFT', maxTeams: ''
};

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA', 'General', 'External Club', 'NSS', 'NCC', 'Other'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingFaculty, setPendingFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [campaignEvent, setCampaignEvent] = useState(null);
  const [coordinatorEvent, setCoordinatorEvent] = useState(null);
  const [allFaculty, setAllFaculty] = useState([]);
  const [campaignMsg, setCampaignMsg] = useState('');
  const [campaignFile, setCampaignFile] = useState(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcement, setAnnouncement] = useState({ subject: '', message: '', targetDepartment: '', targetYear: '' });

  // Load stats
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'events') loadEvents();
    else if (activeTab === 'bookings') loadBookings();
    else if (activeTab === 'faculty') loadPendingFaculty();
    else if (activeTab === 'users') loadUsers();
  }, [activeTab]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await getAdminStats();
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Admin sees ALL events (including cancelled)
      const { data } = await getAllEvents();
      setEvents(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data } = await getAllBookings();
      setBookings(data.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadPendingFaculty = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/api/admin/faculty/pending');
      setPendingFaculty(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/api/admin/users');
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAllFaculty = async () => {
    try {
      const { data } = await API.get('/api/admin/users');
      setAllFaculty(data.filter(u => u.role === 'FACULTY' && u.approved));
    } catch (e) { console.error(e); }
  };

  const handleToggleCoordinator = async (userId, isAdding) => {
    try {
      if (isAdding) {
        await addCoordinator(coordinatorEvent.id, userId);
      } else {
        await removeCoordinator(coordinatorEvent.id, userId);
      }
      // Refresh events silently
      const { data } = await getAllEvents();
      setEvents(data);
      setCoordinatorEvent(data.find(e => e.id === coordinatorEvent.id));
      showSuccess(`Coordinator ${isAdding ? 'added' : 'removed'}!`);
    } catch (e) {
      showSuccess('Failed to update coordinator.', true);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await API.delete(`/api/admin/users/${id}`);
      showSuccess('User deleted successfully.');
      loadUsers();
      loadStats();
    } catch (e) { showSuccess('Failed to delete user.', true); }
  };

  const handleToggleUserStatus = async (u) => {
    const action = u.approved ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${action} user "${u.name}"?`)) return;
    try {
      await API.post(`/api/admin/users/${u.id}/toggle-status`);
      showSuccess(`User ${action.toLowerCase()}d successfully!`);
      loadUsers();
    } catch (e) { showSuccess(`Failed to ${action.toLowerCase()} user.`, true); }
  };

  const approveFaculty = async (id) => {
    try {
      await API.post(`/api/admin/faculty/${id}/approve`);
      showSuccess('Faculty approved successfully!');
      loadPendingFaculty();
      loadStats();
    } catch (e) { showSuccess('Approval failed.', true); }
  };

  const rejectFaculty = async (id) => {
    try {
      await API.delete(`/api/admin/faculty/${id}/reject`);
      showSuccess('Faculty request rejected.');
      loadPendingFaculty();
      loadStats();
    } catch (e) { showSuccess('Reject failed.', true); }
  };

  const openCreate = () => {
    setEditingEvent(null);
    setForm(EMPTY_EVENT);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      eventName: event.eventName || '',
      // Populate conductingDepartment from backend's 'department' field
      conductingDepartment: DEPARTMENTS.includes(event.department) ? event.department : (event.department ? 'Other' : ''),
      otherConductingDepartment: DEPARTMENTS.includes(event.department) ? '' : event.department,
      department: event.department || '',
      // Populate date from startDate (backend field name)
      date: event.startDate || event.date || '',
      startDate: event.startDate || '',
      endDate: event.endDate || '',
      time: event.time ? event.time.substring(0, 5) : '',
      endTime: event.endTime ? event.endTime.substring(0, 5) : '',
      venue: event.venue || '',
      price: event.price?.toString() || '',
      eventType: event.eventType || 'OTHER',
      customEventType: event.customEventType || '',
      locationType: event.locationType || 'OFFLINE',
      totalTickets: event.totalTickets?.toString() || '',
      description: event.description || '',
      imageUrl: event.imageUrl || '',
      targetDepartments: event.targetDepartments || [],
      targetYears: event.targetYears || [],
      organizingDepartments: event.organizingDepartments || [],
      numberOfDays: event.numberOfDays || 1,
      accommodationProvided: event.accommodationProvided || false,
      accommodationPrice: event.accommodationPrice?.toString() || '0',
      registrationEndDate: event.registrationEndDate || '',
      status: event.status || 'DRAFT',
      customRegistrationFields: event.customRegistrationFields ? JSON.parse(event.customRegistrationFields) : [],
      isTeamEvent: event.isTeamEvent || false,
      maxTeamSize: event.maxTeamSize || '',
      maxTeams: event.maxTeams || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const handleYearCheckbox = (year, checked) => {
    setForm(prev => ({
      ...prev,
      targetYears: checked
        ? [...prev.targetYears, year]
        : prev.targetYears.filter(y => y !== year),
    }));
  };

  const handleAddCustomField = () => {
    setForm(prev => ({
      ...prev,
      customRegistrationFields: [...prev.customRegistrationFields, { name: '', type: 'text', required: false }]
    }));
  };

  const handleRemoveCustomField = (index) => {
    setForm(prev => ({
      ...prev,
      customRegistrationFields: prev.customRegistrationFields.filter((_, i) => i !== index)
    }));
  };

  const handleCustomFieldChange = (index, field, value) => {
    setForm(prev => {
      const newFields = [...prev.customRegistrationFields];
      newFields[index][field] = value;
      return { ...prev, customRegistrationFields: newFields };
    });
  };

  const handleDeptCheckbox = (dept, checked) => {
    setForm(prev => ({
      ...prev,
      targetDepartments: checked
        ? [...prev.targetDepartments, dept]
        : prev.targetDepartments.filter(d => d !== dept),
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(p => {
      const next = { ...p, [name]: value };
      if (name === 'startDate' || name === 'endDate') {
        const start = new Date(next.startDate || next.date);
        const end = new Date(next.endDate);
        if (!isNaN(start) && !isNaN(end)) {
          const diffTime = end.getTime() - start.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          next.numberOfDays = diffDays > 0 ? diffDays : 1;
        }
      }
      return next;
    });
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.eventName.trim()) { setFormError('Event name is required.'); return; }
    if (!form.date && !form.startDate) { setFormError('From Date is required.'); return; }
    if (!form.endDate) { setFormError('To Date is required.'); return; }
    if (!form.price && form.price !== '0') { setFormError('Price is required.'); return; }
    if (!form.totalTickets) { setFormError('Total tickets is required.'); return; }

    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        // Map the date field to startDate (backend field name)
        startDate: form.startDate || form.date || null,
        endDate: form.endDate || null,
        // Map conductingDepartment -> department (backend field name)
        department: (form.conductingDepartment === 'Other' && form.otherConductingDepartment) 
          ? form.otherConductingDepartment 
          : (form.conductingDepartment || form.department || ''),
        price: parseFloat(form.price),
        totalTickets: parseInt(form.totalTickets),
        targetDepartments: form.targetDepartments,
        targetYears: form.targetYears,
        organizingDepartments: form.organizingDepartments,
        eventType: form.eventType?.toUpperCase() || 'OTHER',
        customEventType: form.eventType === 'OTHER' ? form.customEventType : '',
        locationType: form.locationType?.toUpperCase() || 'OFFLINE',
        numberOfDays: parseInt(form.numberOfDays) || 1,
        accommodationProvided: form.accommodationProvided,
        customRegistrationFields: JSON.stringify(form.customRegistrationFields),
        registrationStartDate: form.registrationStartDate || null,
        registrationEndDate: form.registrationEndDate || null,
        status: form.status || 'DRAFT',
        isTeamEvent: form.isTeamEvent || false,
        maxTeamSize: form.isTeamEvent ? (parseInt(form.maxTeamSize) || null) : null,
        maxTeams: form.isTeamEvent ? (parseInt(form.maxTeams) || null) : null
      };
      // Remove legacy/frontend-only fields
      delete payload.date;
      delete payload.conductingDepartment;

      if (editingEvent) {
        await updateEvent(editingEvent.id, payload);
        showSuccess('Event updated successfully!');
      } else {
        await createEvent(payload);
        showSuccess('Event created successfully!');
      }
      setShowModal(false);
      loadEvents();
      loadStats();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (eventId) => {
    try {
      await deleteEvent(eventId);
      setDeleteConfirm(null);
      showSuccess('Event deleted successfully!');
      loadEvents();
      loadStats();
    } catch (err) {
      showSuccess('Failed to delete event.', true);
    }
  };

  const handleCancel = async (eventId) => {
    try {
      const { data } = await cancelEvent(eventId);
      setCancelConfirm(null);
      showSuccess(`Event cancelled! ${data.affectedBookings} bookers notified.`);
      loadEvents(); loadStats();
    } catch (err) { showSuccess('Failed to cancel event.', true); }
  };

  // Lifecycle helpers
  const handleLifecycle = async (apiFn, eventId, label) => {
    try {
      await apiFn(eventId);
      showSuccess(`Event ${label} successfully!`);
      loadEvents(); loadStats();
    } catch (err) {
      showSuccess(`Failed: ${err.response?.data?.message || err.message}`, true);
    }
  };

  const handleCampaign = async () => {
    try {
      const formData = new FormData();
      if (campaignMsg) formData.append('customMessage', campaignMsg);
      if (campaignFile) formData.append('file', campaignFile);
      
      const { data } = await sendCampaign(campaignEvent.id, formData);
      setCampaignEvent(null);
      setCampaignMsg('');
      setCampaignFile(null);
      showSuccess(`📢 Campaign sent to ${data.recipientCount} users!`);
    } catch (err) {
      showSuccess('Campaign failed.', true);
    }
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const { data } = await sendAnnouncement({
        ...announcement,
        targetYear: announcement.targetYear ? parseInt(announcement.targetYear) : null,
        targetDepartment: announcement.targetDepartment || null,
      });
      setShowAnnouncement(false);
      setAnnouncement({ subject: '', message: '', targetDepartment: '', targetYear: '' });
      showSuccess(`📣 Announcement sent to ${data.recipientCount} users!`);
    } catch (err) {
      showSuccess('Announcement failed.', true);
    }
  };

  const showSuccess = (msg, isError = false) => {
    setSuccessMsg(isError ? `❌ ${msg}` : `✅ ${msg}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const STAT_CARDS = stats ? [
    { label: 'Total Events Hosted', value: stats.totalEvents || 0, icon: '🎭', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Total Registrations', value: stats.totalBookings || 0, icon: '📋', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
    { label: 'Active Users', value: stats.totalUsers || 0, icon: '👥', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
    { label: 'Total Tickets Sold', value: stats.totalTicketsSold || 0, icon: '🎟️', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
    { label: 'Total Revenue Generated', value: `₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}`, icon: '💰', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Pending Faculty Approvals', value: stats.pendingFaculty || 0, icon: '⏳', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    { label: 'Average Tickets/Event', value: stats.totalEvents ? Math.round((stats.totalTicketsSold || 0) / stats.totalEvents) : 0, icon: '📊', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
    { label: 'Student Accounts', value: stats.studentAccounts || 0, icon: '👨‍🎓', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
    { label: 'Faculty Accounts', value: stats.facultyAccounts || 0, icon: '👩‍🏫', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    { label: 'Team Registrations', value: stats.teamRegistrations || 0, icon: '🤝', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Individual Registrations', value: stats.individualRegistrations || 0, icon: '👤', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
    { label: 'Accommodation Bookings', value: stats.accommodationBookings || 0, icon: '🏨', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Upcoming Events', value: stats.upcomingEvents || 0, icon: '📅', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    { label: 'Completed Events', value: stats.completedEvents || 0, icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  ] : [];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">{user?.role === 'ADMIN' ? '👑 Admin Dashboard' : '👩‍🏫 Faculty Dashboard'}</h1>
          <p className="page-subtitle">Manage events, view bookings, and analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => setShowAnnouncement(true)} className="btn btn-ghost" style={{ color: '#f59e0b' }}>
            <Megaphone size={16} /> Announcement
          </button>
          <button onClick={() => { loadStats(); if (activeTab === 'events') loadEvents(); if (activeTab === 'bookings') loadBookings(); }} className="btn btn-ghost">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Global success/error toast */}
      {successMsg && (
        <div className={`alert ${successMsg.startsWith('❌') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'overview', icon: <LayoutDashboard size={15} />, label: 'Overview' },
          { id: 'events', icon: <Calendar size={15} />, label: 'Events' },
          { id: 'bookings', icon: <BookOpen size={15} />, label: 'All Bookings' },
          ...(user?.role === 'ADMIN' ? [
            { id: 'faculty', icon: <span>👩‍🏫</span>, label: `Faculty Approval${stats?.pendingFaculty > 0 ? ` (${stats.pendingFaculty})` : ''}` },
            { id: 'users', icon: <UserCheck size={15} />, label: 'All Users' },
          ] : [])
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          {/* STAT CARDS (Infographic style) */}
          {statsLoading ? (
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="shimmer" style={{ height: '120px', borderRadius: '16px' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {STAT_CARDS.map(stat => (
                <div key={stat.label} style={{
                  background: '#ffffff', borderRadius: '16px', padding: '1.5rem',
                  border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(15,23,42,0.03)',
                  display: 'flex', flexDirection: 'column', gap: '1rem',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', right: '-15%', top: '-20%', width: '120px', height: '120px', background: `${stat.bg}`, borderRadius: '50%', opacity: 0.4, filter: 'blur(20px)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a' }}>{stat.value}</div>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                      {stat.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', zIndex: 1 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TWO LARGE INFOGRAPHICS */}
          {!statsLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Infographic 1: Registration Capacity */}
              <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📊 System Capacity & Engagement
                </h3>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>Total Bookings vs Capacity</span>
                    <span>{stats?.totalBookings || 0} / {Math.max((stats?.totalBookings || 0) + 150, 500)}</span>
                  </div>
                  <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(((stats?.totalBookings || 0) / 500) * 100, 100)}%`, background: 'var(--gradient-primary)', borderRadius: '999px', transition: 'width 1s ease-out' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>Active Events Hosted</span>
                    <span>{stats?.totalEvents || 0} Active</span>
                  </div>
                  <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(((stats?.totalEvents || 0) / 20) * 100, 100)}%`, background: 'var(--gradient-primary)', borderRadius: '999px', transition: 'width 1s ease-out' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>QR Check-in Adoption</span>
                    <span>95% Adoption</span>
                  </div>
                  <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '95%', background: 'var(--gradient-primary)', borderRadius: '999px', transition: 'width 1s ease-out' }} />
                  </div>
                </div>
              </div>

              {/* Infographic 2: Quick Actions & Highlights */}
              <div style={{ background: 'var(--gradient-primary)', borderRadius: '16px', padding: '2rem', color: '#ffffff', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-premium)' }}>
                <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
                
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1, position: 'relative' }}>
                  🚀 EventSphere Highlights
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', zIndex: 1, position: 'relative' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>New Registrations</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>+{(stats?.totalBookings || 0) * 2}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.2rem' }}>↑ 12% this week</div>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Revenue Est.</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.2rem' }}>↑ 8% this week</div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', fontSize: '0.9rem', lineHeight: 1.5, zIndex: 1, position: 'relative' }}>
                  <strong>Pro Tip:</strong> Utilize the <strong>QR Scanner</strong> system during check-ins to reduce queue times by 70%.
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
          }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => { setActiveTab('events'); setTimeout(openCreate, 100); }}>
                <Plus size={16} /> Create New Event
              </button>
              <button className="btn btn-ghost" onClick={() => setActiveTab('bookings')}>
                <BookOpen size={16} /> View All Bookings
              </button>
              <a href="/admin/scanner" className="btn btn-ghost">
                🔲 Open QR Scanner
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== EVENTS TAB ===== */}
      {activeTab === 'events' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={openCreate} id="create-event-btn">
              <Plus size={16} /> Add Event
            </button>
          </div>

          {loading ? (
            <div className="shimmer" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎭</div>
              <h3 className="empty-title">No Events Yet</h3>
              <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Create First Event</button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Dept</th>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Price</th>
                    <th>Tickets</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => {
                    const availability = event.availableTickets / event.totalTickets;
                    return (
                      <tr key={event.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{event.eventName}</div>
                          {event.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {event.description.substring(0, 40)}...
                            </div>
                          )}
                        </td>
                        <td><span className="badge badge-primary">{event.department || 'Gen'}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.venue || '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {Number(event.price) === 0 ? <span style={{ color: 'var(--accent-success)' }}>FREE</span> : `₹${event.price}`}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600 }}>{event.availableTickets}</span>
                            <span style={{ color: 'var(--text-muted)' }}>/{event.totalTickets}</span>
                          </div>
                          <div style={{
                            height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '4px', width: '60px',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${availability * 100}%`,
                              background: availability > 0.3 ? 'var(--accent-success)' : availability > 0 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                              borderRadius: '2px',
                            }} />
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            event.status === 'CANCELLED' ? 'badge-danger' :
                            event.availableTickets > 0 ? 'badge-success' : 'badge-warning'
                          }`}>
                            {event.status === 'CANCELLED' ? '🚫 Cancelled' :
                             event.availableTickets > 0 ? 'Active' : 'Sold Out'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-icon"
                              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                              onClick={() => navigate(`/admin/events/${event.id}/registrations`)}
                              title="Manage Registrations"
                            >
                              <Users size={14} />
                            </button>
                            <button className="btn btn-icon btn-ghost" onClick={() => openEdit(event)} title="Edit event">
                              <Edit2 size={14} />
                            </button>
                            {user?.role === 'ADMIN' && (
                              <button
                                className="btn btn-icon btn-ghost"
                                onClick={() => { setCoordinatorEvent(event); loadAllFaculty(); }}
                                title="Manage Coordinators"
                                style={{ color: '#10b981' }}
                              >
                                <UserCheck size={14} />
                              </button>
                            )}
                            <button
                              className="btn btn-icon btn-ghost"
                              onClick={() => { setCampaignEvent(event); setCampaignMsg(''); }}
                              title="Send campaign email"
                              style={{ color: '#6366f1' }}
                            >
                              <Send size={14} />
                            </button>
                            <button
                              className="btn btn-icon btn-ghost"
                              onClick={() => setCancelConfirm(event)}
                              title="Cancel event"
                              style={{ color: '#f59e0b' }}
                            >
                              <Ban size={14} />
                            </button>
                            <button className="btn btn-icon btn-danger" onClick={() => setDeleteConfirm(event)} title="Delete event">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== BOOKINGS TAB ===== */}
      {activeTab === 'bookings' && (
        <div>
          {loading ? (
            <div className="shimmer" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3 className="empty-title">No Bookings Yet</h3>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>User</th>
                    <th>Event</th>
                    <th>Tickets</th>
                    <th>Amount</th>
                    <th>Accom.</th>
                    <th>Details</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => (
                    <tr key={booking.id}>
                      <td>
                        <span className="booking-ref">{booking.bookingReference}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{booking.user?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{booking.user?.email}</div>
                      </td>
                      <td style={{ maxWidth: '180px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{booking.event?.eventName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{booking.event?.department}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{booking.numberOfTickets}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-success)' }}>
                        ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td>
                        {booking.accommodationRequired ? <span className="badge badge-primary">Yes</span> : 'No'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {booking.customFieldResponses ? (
                          <div title={Object.entries(JSON.parse(booking.customFieldResponses)).map(([k,v]) => `${k}: ${v}`).join('\n')}>
                            {Object.entries(JSON.parse(booking.customFieldResponses)).map(([k,v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        ) : 'None'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <span className={`badge ${booking.checkedIn ? 'badge-success' : 'badge-warning'}`}>
                          {booking.checkedIn ? <><CheckCircle size={10} /> Verified</> : '⏳ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== FACULTY APPROVAL TAB ===== */}
      {activeTab === 'faculty' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>👩‍🏫 Pending Faculty Requests</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Review and approve faculty registrations. Approved faculty can create and manage events.
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="shimmer" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : pendingFaculty.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3 className="empty-title">No Pending Requests</h3>
              <p className="empty-desc">All faculty accounts have been reviewed.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingFaculty.map(faculty => (
                <div key={faculty.id} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: 48, height: 48,
                      borderRadius: '50%',
                      background: 'rgba(245,158,11,0.15)',
                      border: '2px solid rgba(245,158,11,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', flexShrink: 0,
                    }}>
                      👩‍🏫
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{faculty.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{faculty.email}</div>
                      <div style={{ marginTop: '0.25rem' }}>
                        <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                          <Clock size={10} /> {faculty.department || 'No Department'} · Faculty
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => rejectFaculty(faculty.id)}
                      style={{ color: 'var(--accent-danger)', borderColor: 'rgba(244,63,94,0.3)' }}
                    >
                      <UserX size={15} /> Reject
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => approveFaculty(faculty.id)}
                      style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                    >
                      <UserCheck size={15} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== USERS TAB ===== */}
      {activeTab === 'users' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>👥 User Management</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              View and manage all registered users in the system.
            </p>
          </div>

          {loading ? (
            <div className="shimmer" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3 className="empty-title">No Users Found</h3>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>ID Number</th>
                    <th>Role & Dept</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700 }}>{user.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</span>
                        </div>
                      </td>
                      <td>
                        {user.vtuNumber && <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#38bdf8' }}>{user.vtuNumber}</span>}
                        {user.ttsNumber && <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#fbbf24' }}>{user.ttsNumber}</span>}
                        {!user.vtuNumber && !user.ttsNumber && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                          <span className={`badge ${user.role === 'ADMIN' ? 'badge-danger' : user.role === 'FACULTY' ? 'badge-warning' : 'badge-primary'}`}>
                            {user.role}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.department || 'No Dept'}</span>
                        </div>
                      </td>
                      <td>{user.yearOfStudy ? `Year ${user.yearOfStudy}` : '—'}</td>
                      <td>
                        <span className={`badge ${user.role === 'ADMIN' ? 'badge-danger' : user.approved ? 'badge-success' : 'badge-warning'}`}>
                          {user.role === 'ADMIN' ? 'Admin' : user.approved ? '✅ Active' : '⏸ Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {user.role !== 'ADMIN' && (
                            <button
                              className={`btn btn-icon ${user.approved ? 'btn-ghost' : 'btn-primary'}`}
                              style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', height: 'auto', lineHeight: 1 }}
                              onClick={() => handleToggleUserStatus(user)}
                              title={user.approved ? 'Deactivate user' : 'Activate user'}
                            >
                              {user.approved ? '⏸ Deactivate' : '▶ Activate'}
                            </button>
                          )}
                          {user.role !== 'ADMIN' && (
                            <button
                              className="btn btn-icon btn-danger"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingEvent ? '✏️ Edit Event' : '➕ Create Event'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {formError}</div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Event Name *</label>
                  <input
                    type="text"
                    name="eventName"
                    className="form-input"
                    placeholder="Tech Summit 2024"
                    value={form.eventName}
                    onChange={handleFormChange}
                    required
                    id="event-name"
                  />
                </div>

                {/* Event Poster Upload */}
                <div className="form-group">
                  <label className="form-label">Event Poster / Banner</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {form.imageUrl && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={form.imageUrl} alt="Event poster" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border-color)' }} />
                        <button type="button" onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <label htmlFor="poster-upload" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.6rem 1rem', background: 'var(--bg-input)', border: '2px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', transition: 'border-color 0.2s' }}>
                        🖼️ {form.imageUrl ? 'Change Poster' : 'Upload Poster / Banner'}
                        <small style={{ color: 'var(--text-muted)' }}>JPG, PNG — Max 2MB</small>
                      </label>
                      <input id="poster-upload" type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
                          const reader = new FileReader();
                          reader.onload = (ev) => setForm(p => ({ ...p, imageUrl: ev.target.result }));
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Organizing Department</label>
                    <select name="conductingDepartment" className="form-select" value={form.conductingDepartment} onChange={handleFormChange} id="event-conducting-dept">
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {form.conductingDepartment === 'Other' && (
                      <input type="text" name="otherConductingDepartment" className="form-input" placeholder="Specify Department"
                        value={form.otherConductingDepartment || ''} onChange={handleFormChange} style={{ marginTop: '0.5rem' }} required />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Venue</label>
                    <input type="text" name="venue" className="form-input" placeholder="Auditorium A" value={form.venue} onChange={handleFormChange} id="event-venue" />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">From Date *</label>
                    <input type="date" name="startDate" className="form-input" value={form.startDate || form.date || ''} onChange={handleFormChange} required id="event-start-date" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Date *</label>
                    <input type="date" name="endDate" className="form-input" value={form.endDate || ''} onChange={handleFormChange} required id="event-end-date" />
                  </div>
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input type="time" name="time" className="form-input" value={form.time || ''} onChange={handleFormChange} id="event-time" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input type="time" name="endTime" className="form-input" value={form.endTime || ''} onChange={handleFormChange} id="event-end-time" />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Number of Days *</label>
                    <input type="number" name="numberOfDays" className="form-input" value={form.numberOfDays} onChange={handleFormChange} min="1" required />
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    ⚙️ Event Details & Attributes
                  </div>
                  
                  {/* Event Type Checkboxes */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem' }}>Event Type</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {[{label:'Seminar',val:'SEMINAR'},{label:'Workshop',val:'WORKSHOP'},{label:'Hackathon',val:'HACKATHON'},{label:'Cultural',val:'CULTURAL'},{label:'Other',val:'OTHER'}].map(({label,val}) => (
                        <label key={val} style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                          fontSize: '0.85rem', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-full)',
                          border: form.eventType === val ? '1px solid #800000' : '1px solid var(--border-color)',
                          background: form.eventType === val ? 'rgba(128,0,0,0.15)' : 'var(--bg-input)',
                          color: form.eventType === val ? '#e87070' : 'var(--text-secondary)'
                        }}>
                          <input type="checkbox" checked={form.eventType === val} 
                            onChange={() => setForm(p => ({ ...p, eventType: val }))} style={{ accentColor: '#800000' }} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {form.eventType === 'OTHER' && (
                    <div className="form-group" style={{ margin: 0, marginTop: '0.5rem' }}>
                      <label className="form-label">Specify Event Type</label>
                      <input type="text" name="customEventType" className="form-input" value={form.customEventType || ''} onChange={handleFormChange} placeholder="e.g. Guest Lecture" />
                    </div>
                  )}

                  {/* Location Type Checkboxes */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem' }}>Location Type</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {[{label:'Online',val:'ONLINE'},{label:'Offline',val:'OFFLINE'}].map(({label,val}) => (
                        <label key={val} style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                          fontSize: '0.85rem', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-full)',
                          border: form.locationType === val ? '1px solid #800000' : '1px solid var(--border-color)',
                          background: form.locationType === val ? 'rgba(128,0,0,0.15)' : 'var(--bg-input)',
                          color: form.locationType === val ? '#e87070' : 'var(--text-secondary)'
                        }}>
                          <input type="checkbox" checked={form.locationType === val} 
                            onChange={() => setForm(p => ({ ...p, locationType: val }))} style={{ accentColor: '#800000' }} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={form.accommodationProvided} 
                        onChange={e => setForm(p => ({ ...p, accommodationProvided: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: '#1e3a8a' }} />
                      Accommodation Provided
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={form.isTeamEvent} 
                        onChange={e => setForm(p => ({ ...p, isTeamEvent: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: '#1e3a8a' }} />
                      Team Event
                    </label>
                  </div>


                  {form.accommodationProvided && (
                    <div className="form-group" style={{ margin: 0, marginTop: '0.5rem' }}>
                      <label className="form-label">Accommodation Price (₹)</label>
                      <input type="number" name="accommodationPrice" className="form-input" value={form.accommodationPrice || ''} onChange={handleFormChange} min="0" placeholder="0 for free accommodation" style={{ maxWidth: '250px' }} />
                    </div>
                  )}

                  {form.isTeamEvent && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label className="form-label">Max Team Size</label>
                        <input type="number" className="form-input" value={form.maxTeamSize || ''} onChange={e => setForm(p => ({ ...p, maxTeamSize: parseInt(e.target.value) || '' }))} min="1" />
                      </div>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label className="form-label">Max Teams Limit</label>
                        <input type="number" className="form-input" value={form.maxTeams || ''} onChange={e => setForm(p => ({ ...p, maxTeams: parseInt(e.target.value) || '' }))} min="1" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input type="number" name="price" className="form-input" placeholder="0 for free" value={form.price} onChange={handleFormChange} min="0" step="0.01" required id="event-price" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Tickets *</label>
                    <input type="number" name="totalTickets" className="form-input" placeholder="100" value={form.totalTickets} onChange={handleFormChange} min="1" required id="event-tickets" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="Brief description of the event..."
                    value={form.description}
                    onChange={handleFormChange}
                    rows={3}
                    id="event-desc"
                  />
                </div>

                {/* ── Restrictions ──────────────────────────────── */}
                <div style={{
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem', color: '#818cf8' }}>
                    🎯 Event Restrictions <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave unchecked = open to all)</span>
                  </div>

                  {/* Department Checkboxes */}
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem' }}>Restrict to Department</label>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                      background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', padding: '0.75rem',
                    }}>
                      {DEPARTMENTS.map(d => (
                        <label
                          key={d}
                          htmlFor={`dept-cb-${d}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                            padding: '0.3rem 0.65rem',
                            borderRadius: 'var(--radius-full)',
                            border: form.targetDepartments.includes(d)
                              ? '1px solid #6366f1'
                              : '1px solid var(--border-color)',
                            background: form.targetDepartments.includes(d)
                              ? 'rgba(99,102,241,0.15)'
                              : 'transparent',
                            color: form.targetDepartments.includes(d)
                              ? '#818cf8'
                              : 'var(--text-secondary)',
                            transition: 'all 0.15s',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            id={`dept-cb-${d}`}
                            type="checkbox"
                            checked={form.targetDepartments.includes(d)}
                            onChange={(e) => handleDeptCheckbox(d, e.target.checked)}
                            style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                    {form.targetDepartments.length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        ✅ Open to all departments
                      </p>
                    )}
                    {form.targetDepartments.length > 0 && (
                      <p style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: '0.3rem' }}>
                        🎯 Restricted to: {form.targetDepartments.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Year Checkboxes */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem' }}>Restrict to Year</label>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                      background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', padding: '0.75rem',
                    }}>
                      {[1, 2, 3, 4].map(y => (
                        <label
                          key={y}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                            padding: '0.3rem 0.65rem',
                            borderRadius: 'var(--radius-full)',
                            border: form.targetYears.includes(y) ? '1px solid #800000' : '1px solid var(--border-color)',
                            background: form.targetYears.includes(y) ? 'rgba(128,0,0,0.15)' : 'transparent',
                            color: form.targetYears.includes(y) ? '#ffcccc' : 'var(--text-secondary)',
                            transition: 'all 0.15s',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={form.targetYears.includes(y)}
                            onChange={(e) => handleYearCheckbox(y, e.target.checked)}
                            style={{ accentColor: '#800000', cursor: 'pointer' }}
                          />
                          {y}{['st','nd','rd','th'][y-1]} Year
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Custom Registration Fields ──────────────── */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      📝 Custom Registration Fields
                    </div>
                    <button type="button" onClick={handleAddCustomField} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      <Plus size={14} /> Add Field
                    </button>
                  </div>
                  {form.customRegistrationFields.map((field, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Field Name (e.g. T-Shirt Size)" 
                        className="form-input" 
                        value={field.name} 
                        onChange={(e) => handleCustomFieldChange(idx, 'name', e.target.value)}
                        style={{ flex: 1 }}
                        required
                      />
                      <select 
                        className="form-select" 
                        value={field.type} 
                        onChange={(e) => handleCustomFieldChange(idx, 'type', e.target.value)}
                        style={{ width: '120px' }}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <input type="checkbox" checked={field.required} onChange={(e) => handleCustomFieldChange(idx, 'required', e.target.checked)} />
                        Required
                      </label>
                      <button type="button" onClick={() => handleRemoveCustomField(idx)} style={{ color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {form.customRegistrationFields.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No custom fields added. Users will only provide basic info.</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={formLoading} id="event-submit">
                    {formLoading ? (
                      <><div className="spinner spinner-sm" /> Saving...</>
                    ) : editingEvent ? (
                      '✅ Update Event'
                    ) : (
                      '🚀 Create Event'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
              <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Delete Event?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Are you sure you want to delete <strong>"{deleteConfirm.eventName}"</strong>?
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== CANCEL CONFIRM MODAL ===== */}
      {cancelConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCancelConfirm(null)}>
          <div className="modal" style={{ maxWidth: '420px' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
              <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Cancel Event?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Cancel <strong>"{cancelConfirm.eventName}"</strong>?
              </p>
              <p style={{ color: '#fbbf24', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                ⚠️ All bookers will be notified by email automatically.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setCancelConfirm(null)}>Keep Event</button>
                <button className="btn btn-danger" onClick={() => handleCancel(cancelConfirm.id)}>
                  <Ban size={14} /> Yes, Cancel Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MANAGE COORDINATORS MODAL ===== */}
      {coordinatorEvent && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCoordinatorEvent(null)}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">👥 Manage Coordinators</h2>
              <button className="modal-close" onClick={() => setCoordinatorEvent(null)}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 700 }}>{coordinatorEvent.eventName}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Assign faculty members to manage this event</div>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {allFaculty.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No approved faculty available.</p>
                ) : (
                  allFaculty.map(faculty => {
                    const isCoord = coordinatorEvent.coordinators?.some(c => c.id === faculty.id);
                    return (
                      <div key={faculty.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{faculty.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{faculty.email}</div>
                        </div>
                        <button 
                          className={`btn ${isCoord ? 'btn-danger' : 'btn-primary'}`} 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => handleToggleCoordinator(faculty.id, !isCoord)}
                        >
                          {isCoord ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setCoordinatorEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CAMPAIGN EMAIL MODAL ===== */}
      {campaignEvent && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCampaignEvent(null)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">📢 Send Campaign</h2>
              <button className="modal-close" onClick={() => setCampaignEvent(null)}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{campaignEvent.eventName}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {campaignEvent.targetDepartment ? `${campaignEvent.targetDepartment} Only` : 'All Departments'}
                  {campaignEvent.targetYear ? ` · ${campaignEvent.targetYear}${['st','nd','rd','th'][campaignEvent.targetYear-1] || 'th'} Year` : ''}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Custom Message (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Add a personal message to include in the campaign email..."
                  value={campaignMsg}
                  onChange={(e) => setCampaignMsg(e.target.value)}
                  rows={4}
                  id="campaign-msg"
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Attachment (Poster/Image)</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={(e) => setCampaignFile(e.target.files[0])}
                  accept="image/*,.pdf"
                  id="campaign-file"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.25rem' }}>
                  Optional. Max size: 5MB. Will be sent as an attachment.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setCampaignEvent(null); setCampaignFile(null); setCampaignMsg(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCampaign}>
                <Send size={15} /> Send Campaign Emails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ANNOUNCEMENT MODAL ===== */}
      {showAnnouncement && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAnnouncement(false)}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">📣 Send Announcement</h2>
              <button className="modal-close" onClick={() => setShowAnnouncement(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input type="text" className="form-input" placeholder="Important Announcement" required
                  value={announcement.subject} onChange={(e) => setAnnouncement(p => ({ ...p, subject: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" placeholder="Write your announcement here..." required rows={5}
                  value={announcement.message} onChange={(e) => setAnnouncement(p => ({ ...p, message: e.target.value }))} />
              </div>
              <div className="form-grid">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Target Department</label>
                  <select className="form-select" value={announcement.targetDepartment}
                    onChange={(e) => setAnnouncement(p => ({ ...p, targetDepartment: e.target.value }))}>
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Target Year</label>
                  <select className="form-select" value={announcement.targetYear}
                    onChange={(e) => setAnnouncement(p => ({ ...p, targetYear: e.target.value }))}>
                    <option value="">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAnnouncement(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Megaphone size={15} /> Send Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
