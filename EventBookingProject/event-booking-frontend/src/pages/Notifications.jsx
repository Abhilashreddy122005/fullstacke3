import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Calendar, CreditCard, AlertTriangle, Megaphone, Info } from 'lucide-react';
import api from '../api/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const TYPE_META = {
  BOOKING_CONFIRMED: { icon: <Check size={16} />, color: '#22c55e', label: 'Booking' },
  BOOKING_CANCELLED: { icon: <X size={16} />, color: '#ef4444', label: 'Cancellation' },
  EVENT_UPDATE: { icon: <Megaphone size={16} />, color: '#f59e0b', label: 'Event' },
  EVENT_APPROVED: { icon: <Check size={16} />, color: '#22c55e', label: 'Approved' },
  EVENT_REJECTED: { icon: <X size={16} />, color: '#ef4444', label: 'Rejected' },
  PAYMENT_CONFIRMED: { icon: <CreditCard size={16} />, color: '#7c3aed', label: 'Payment' },
  CANCELLATION_ALERT: { icon: <AlertTriangle size={16} />, color: '#f59e0b', label: 'Alert' },
  SYSTEM: { icon: <Info size={16} />, color: '#6b7280', label: 'System' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch {
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(ns => ns.map(n => ({ ...n, read: true })));
      toast.success('All marked as read.');
    } catch {
      toast.error('Failed to mark all read.');
    }
  };

  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notif-header">
        <div className="notif-title">
          <Bell size={24} />
          <h1>Notifications</h1>
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </div>
        <div className="notif-controls">
          <div className="filter-tabs">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
          {unreadCount > 0 && (
            <button className="btn-mark-all" onClick={markAllRead}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="notif-skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="notif-skeleton-item">
              <div className="sk sk-icon" />
              <div className="sk-lines">
                <div className="sk sk-title" />
                <div className="sk sk-body" />
                <div className="sk sk-time" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="notif-empty">
          <Bell size={48} opacity={0.3} />
          <p>{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
        </div>
      ) : (
        <div className="notif-list">
          {displayed.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.SYSTEM;
            return (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  if (n.actionUrl) navigate(n.actionUrl);
                }}
              >
                <div className="notif-icon-wrap" style={{ '--icon-color': meta.color }}>
                  {meta.icon}
                </div>
                <div className="notif-content">
                  <div className="notif-top-row">
                    <strong className="notif-title-text">{n.title}</strong>
                    <span className="notif-type-badge" style={{ background: meta.color + '22', color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="notif-message">{n.message}</p>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </div>
                {!n.read && (
                  <button className="notif-read-btn" onClick={e => { e.stopPropagation(); markRead(n.id); }} title="Mark as read">
                    <Check size={14} />
                  </button>
                )}
                {!n.read && <div className="unread-dot" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
