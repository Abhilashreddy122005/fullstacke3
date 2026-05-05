import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Ticket, Calendar, BookOpen, LayoutDashboard,
  QrCode, LogOut, Menu, X, Zap, User, Bell
} from 'lucide-react';
import api from '../api/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // Poll unread notification count every 30 seconds
  useEffect(() => {
    let interval;
    const fetchCount = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.count || 0);
      } catch {}
    };
    if (user) {
      fetchCount();
      interval = setInterval(fetchCount, 30000);
    }
    return () => clearInterval(interval);
  }, [user]);

  const userLinks = [
    { to: '/events', icon: <Calendar size={16} />, label: 'Events' },
    { to: '/my-bookings', icon: <BookOpen size={16} />, label: 'My Bookings' },
    { to: '/profile', icon: <User size={16} />, label: 'Profile' },
  ];

  const facultyLinks = [
    { to: '/events', icon: <Calendar size={16} />, label: 'Events' },
    { to: '/admin', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { to: '/admin/scanner', icon: <QrCode size={16} />, label: 'QR Scanner' },
    { to: '/profile', icon: <User size={16} />, label: 'Profile' },
  ];

  const links = (user?.role === 'FACULTY' || user?.role === 'ADMIN') ? facultyLinks : userLinks;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Brand */}
          <NavLink to="/events" className="navbar-brand">
            <img src="/veltech-logo.png" alt="VelTech" style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'contain' }} />
            <span className="brand-name" style={{ letterSpacing: '1px', fontWeight: 900, fontSize: '1.2rem' }}>
              Event<span style={{ color: 'var(--accent-primary)' }}>Sphere</span>
            </span>
          </NavLink>

          {/* Desktop Links */}
          <div className="navbar-links">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px' }}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="navbar-right">
            {!user ? (
              <>
                <NavLink to="/login" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>Login</NavLink>
                <NavLink to="/register" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>Register</NavLink>
              </>
            ) : (
              <>
                <button
                  className="notif-bell-btn"
                  onClick={() => navigate('/notifications')}
                  title="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="notif-bell-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <div className="user-avatar">{initials}</div>
                <div className="user-info">
                  <span className="user-name">{user?.name?.split(' ')[0]}</span>
                  <span className="user-role">
                    {user?.role === 'ADMIN' ? '🔑 Admin' : user?.role === 'FACULTY' ? '👩‍🏫 Faculty' : '👨‍🎓 Student'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost"
                  title="Logout"
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <LogOut size={16} />
                  <span className="hide-sm">Logout</span>
                </button>
              </>
            )}
            <button
              className="hamburger"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu${mobileOpen ? ' open' : ''}`}>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div className="user-avatar">{initials}</div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{user?.email}</div>
              </div>
            </div>
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.icon}
                {link.label}
              </NavLink>
            ))}
            <NavLink
              to="/notifications"
              className="mobile-nav-link"
              onClick={() => setMobileOpen(false)}
            >
              <Bell size={16} />
              Notifications {unreadCount > 0 && <span className="notif-bell-badge" style={{ position: 'static', display: 'inline-flex' }}>{unreadCount}</span>}
            </NavLink>
            <button
              onClick={handleLogout}
              className="mobile-nav-link"
              style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', color: 'var(--accent-danger)', fontFamily: 'var(--font)', fontWeight: 500 }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Login</NavLink>
            <NavLink to="/register" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Register</NavLink>
          </>
        )}
      </div>
    </>
  );
}
