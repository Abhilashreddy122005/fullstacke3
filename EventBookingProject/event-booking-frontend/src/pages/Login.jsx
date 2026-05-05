import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import API from '../api/axios';

export default function Login() {
  const { login, setUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // OTP login state
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  // Normal password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const data = await login(form);
      if (data.role === 'ADMIN' || data.role === 'FACULTY') navigate('/admin');
      else navigate('/events');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  // OTP login: send OTP
  const sendLoginOtp = async () => {
    if (!form.email) { setError('Enter your email first.'); return; }
    setOtpLoading(true); setError('');
    try {
      await API.post('/api/auth/login-otp', { email: form.email });
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally { setOtpLoading(false); }
  };

  // OTP login: verify
  const verifyLoginOtp = async (e) => {
    e.preventDefault();
    if (!otp) { setError('Enter the OTP.'); return; }
    setOtpLoading(true); setError('');
    try {
      const { data } = await API.post('/api/auth/login-otp-verify', { email: form.email, otp });
      // Set user context
      localStorage.setItem('eventUser', JSON.stringify(data));
      if (setUser) setUser(data);
      else window.location.href = data.role === 'ADMIN' || data.role === 'FACULTY' ? '/admin' : '/events';
      if (data.role === 'ADMIN' || data.role === 'FACULTY') navigate('/admin');
      else navigate('/events');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally { setOtpLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(128,0,0,0.15) 0%, transparent 70%)', top: '-200px', left: '-200px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', bottom: '-100px', right: '-100px', pointerEvents: 'none' }} />

      <div className="auth-card" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        {/* Logo */}
        <div className="auth-logo">
          <img src="/veltech-logo.png" alt="VelTech" style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', margin: '0 auto 0.75rem', display: 'block', objectFit: 'contain' }} />
          <h1 className="auth-title" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
            Event<span style={{ color: 'var(--accent-primary)' }}>Sphere</span>
          </h1>
          <p className="auth-subtitle" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600, marginTop: '0.25rem' }}>
            Smart Event Management Platform
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

        {/* Toggle between password and OTP login */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
          <button
            type="button"
            onClick={() => { setOtpMode(false); setError(''); }}
            style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'var(--font)', background: !otpMode ? 'var(--accent-primary)' : 'transparent', color: !otpMode ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}
          >
            <Lock size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Password
          </button>
          <button
            type="button"
            onClick={() => { setOtpMode(true); setOtpSent(false); setOtp(''); setError(''); }}
            style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'var(--font)', background: otpMode ? 'var(--accent-primary)' : 'transparent', color: otpMode ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}
          >
            <KeyRound size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> OTP Login
          </button>
        </div>

        {!otpMode ? (
          /* Password login */
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input type="email" name="email" className="form-input" placeholder="you@veltech.edu.in" value={form.email} onChange={handleChange} required id="login-email" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                <Lock size={16} className="input-icon" />
                <input type={showPass ? 'text' : 'password'} name="password" className="form-input" placeholder="Enter your password" value={form.password} onChange={handleChange} required id="login-password" style={{ paddingRight: '2.8rem' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} id="login-submit" style={{ marginTop: '0.5rem' }}>
              {loading ? <><div className="spinner spinner-sm" /> Signing in...</> : '🚀 Sign In'}
            </button>
          </form>
        ) : (
          /* OTP login */
          <div className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input type="email" name="email" className="form-input" placeholder="you@veltech.edu.in" value={form.email} onChange={handleChange} required />
              </div>
            </div>

            {!otpSent ? (
              <button type="button" className="btn btn-primary btn-lg btn-full" onClick={sendLoginOtp} disabled={otpLoading} style={{ marginTop: '0.5rem' }}>
                {otpLoading ? <><div className="spinner spinner-sm" /> Sending OTP...</> : <><KeyRound size={16} /> Send Login OTP</>}
              </button>
            ) : (
              <form onSubmit={verifyLoginOtp}>
                <div style={{ marginBottom: '0.75rem', padding: '0.6rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: '#22c55e', textAlign: 'center' }}>
                  ✅ OTP sent to {form.email}
                </div>
                <div className="form-group">
                  <label className="form-label">Enter OTP</label>
                  <input type="text" className="form-input" placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontWeight: 700 }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={sendLoginOtp} disabled={otpLoading}>Resend OTP</button>
                  <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 2 }} disabled={otpLoading}>
                    {otpLoading ? <><div className="spinner spinner-sm" /> Verifying...</> : '🚀 Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create account</Link>
        </div>

        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(128,0,0,0.06)', border: '1px solid rgba(128,0,0,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          💡 Register as <strong>Faculty</strong> to create &amp; manage events
        </div>
      </div>
    </div>
  );
}
