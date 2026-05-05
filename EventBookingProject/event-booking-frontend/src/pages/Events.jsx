import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Zap } from 'lucide-react';
import EventCard from '../components/EventCard';
import { getEvents } from '../api/axios';

const DEPARTMENTS = ['All', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA'];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeDept, setActiveDept] = useState('All');
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      else if (activeDept !== 'All') params.department = activeDept;
      const { data } = await getEvents(params);
      setEvents(data);
    } catch (err) {
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, activeDept]);

  useEffect(() => {
    const timer = setTimeout(fetchEvents, 300);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  const handleDeptChange = (dept) => {
    setActiveDept(dept);
    setSearch('');
  };

  const availableCount = events.filter(e => e.availableTickets > 0).length;

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* NEW ULTRA-CLEAN HERO SECTION */}
      <div style={{
        padding: '5rem 2rem 4rem',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
            background: 'var(--bg-card)', padding: '0.4rem 1rem', 
            borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)', 
            fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1.5px', marginBottom: '2rem'
          }}>
            VEL TECH UNIVERSITY • OFFICIAL EVENT PORTAL
          </div>
          
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, 
            lineHeight: 1.1, marginBottom: '1.5rem', color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)'
          }}>
            Discover & Experience <br/>
            <span style={{ color: 'var(--accent-primary)' }}>Incredible Events</span>
          </h1>
          
          <p style={{ 
            fontSize: '1.1rem', color: 'var(--text-secondary)', 
            maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.6
          }}>
            Your official platform for academic workshops, symposiums, and cultural events across all departments at Vel Tech University.
          </p>


          
          <button className="btn btn-primary btn-lg" style={{ borderRadius: 'var(--radius-full)', padding: '0.8rem 2.5rem', fontSize: '1.05rem', fontWeight: 600 }} onClick={() => document.getElementById('events-search').focus()}>
            Explore All Events
          </button>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Upcoming Events
          </h2>
          <button
            onClick={fetchEvents}
            className="btn btn-ghost"
            disabled={loading}
            title="Refresh"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="events-controls">
        {/* Search */}
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search events or departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="events-search"
          />
        </div>

        {/* Department Filter */}
        <div className="filter-chips">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              className={`filter-chip${activeDept === dept ? ' active' : ''}`}
              onClick={() => handleDeptChange(dept)}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Events Grid */}
      {loading ? (
        <div className="events-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div className="shimmer" style={{ height: '160px' }} />
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="shimmer" style={{ height: '20px', width: '70%' }} />
                <div className="shimmer" style={{ height: '14px', width: '50%' }} />
                <div className="shimmer" style={{ height: '14px', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎭</div>
          <h3 className="empty-title">No Events Found</h3>
          <p className="empty-desc">
            {search ? `No events match "${search}". Try a different search.` :
             activeDept !== 'All' ? `No events for ${activeDept} department yet.` :
             'No upcoming events. Check back later!'}
          </p>
          {(search || activeDept !== 'All') && (
            <button
              className="btn btn-ghost"
              onClick={() => { setSearch(''); setActiveDept('All'); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="events-grid">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
