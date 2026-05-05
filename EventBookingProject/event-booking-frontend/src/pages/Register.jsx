import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtp, verifyOtp } from '../api/axios';
import { Mail, Lock, User, Building, Eye, EyeOff, Zap, Clock, MapPin, CheckCircle } from 'lucide-react';

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA', 'Other'];
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh','Other'
];

const IS_VELTECH = (email) =>
  email.toLowerCase().includes('veltech.edu.in') ||
  email.toLowerCase().includes('@veltech.ac.in');

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    department: '', role: 'STUDENT', yearOfStudy: '',
    vtuNumber: '', ttsNumber: '',
    // External college fields
    collegeName: '', collegeState: '', collegeLocation: '',
    isExternal: false,
    otherDepartment: '', otherCollegeState: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingMsg, setPendingMsg] = useState('');
  
  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const isVelTech = !form.isExternal && (IS_VELTECH(form.email) || !form.isExternal);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm(prev => ({
      ...prev,
      [name]: val,
      ...(name === 'email' ? { isExternal: !IS_VELTECH(value) } : {}),
    }));
    setError('');
    if (name === 'email') {
      setOtpSent(false);
      setOtpVerified(false);
      setOtp('');
    }
  };

  const validate = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Invalid email format.';
    if (!otpVerified) return 'Please verify your email with OTP.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (form.isExternal) {
      if (!form.collegeName.trim()) return 'College name is required.';
      if (!form.collegeState) return 'State is required.';
      if (!form.collegeLocation.trim()) return 'City/Location is required.';
      if (!form.department) return 'Department is required.';
    } else {
      if (form.role === 'STUDENT' && !form.vtuNumber.trim()) return 'VTA/VTP/VTU Number is required.';
      if (form.role === 'FACULTY' && !form.ttsNumber.trim()) return 'TTS Number is required.';
    }
    return null;
  };

  const handleSendOtp = async () => {
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      setError('Please enter a valid email first.');
      return;
    }
    setOtpLoading(true);
    try {
      await sendOtp(form.email);
      setOtpSent(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) { setError('Please enter the OTP.'); return; }
    setOtpLoading(true);
    try {
      await verifyOtp(form.email, otp);
      setOtpVerified(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const { confirmPassword, isExternal, otherDepartment, otherCollegeState, ...basePayload } = form;
      const payload = { ...basePayload };
      if (payload.department === 'Other' && otherDepartment) payload.department = otherDepartment;
      if (payload.collegeState === 'Other' && otherCollegeState) payload.collegeState = otherCollegeState;
      
      const result = await register(payload);
      if (result.pending) {
        setPendingMsg(result.message);
      } else {
        navigate('/events');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (pendingMsg) {
    return (
      <div className="auth-page">
        <div className="auth-bg" />
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Clock size={36} color="#f59e0b" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Awaiting Admin Approval</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Your <strong style={{ color: 'var(--accent-warning)' }}>Faculty</strong> account has been created. Admin will review and approve it — you can login once approved.
          </p>
          <Link to="/login" className="btn btn-primary btn-full btn-lg">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-logo">
          <div className="auth-logo-icon"><Zap size={32} color="white" strokeWidth={2.5} /></div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">VelTech EventSphere</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

        {/* Role Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[
            { role: 'STUDENT', icon: '👨‍🎓', title: 'Student', desc: 'Instant access', color: '#22c55e' },
            { role: 'FACULTY', icon: '👩‍🏫', title: 'Faculty', desc: 'Needs admin approval', color: '#f59e0b' },
          ].map(({ role, icon, title, desc, color }) => (
            <div key={role} onClick={() => setForm(p => ({ ...p, role }))}
              style={{ padding: '0.875rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${form.role === role ? color : 'var(--border-color)'}`, background: form.role === role ? `${color}12` : 'var(--bg-input)', textAlign: 'center', transition: 'var(--transition)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: form.role === role ? color : 'var(--text-primary)' }}>{title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{desc}</div>
            </div>
          ))}
        </div>

        {form.role === 'FACULTY' && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
            <Clock size={14} /> Faculty accounts require admin approval before login.
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-icon-wrapper">
              <User size={16} className="input-icon" />
              <input type="text" name="name" className="form-input" placeholder="John Doe"
                value={form.name} onChange={handleChange} required id="reg-name" />
            </div>
          </div>

          {/* Email & OTP */}
          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label className="form-label">Email Address *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="input-icon-wrapper" style={{ flex: 1 }}>
                <Mail size={16} className="input-icon" />
                <input type="email" name="email" className="form-input" placeholder="you@veltech.edu.in"
                  value={form.email} onChange={handleChange} required id="reg-email" disabled={otpVerified || otpSent} />
              </div>
              {!otpVerified && (
                <button type="button" className="btn btn-secondary" onClick={handleSendOtp} disabled={otpLoading || otpSent || !form.email}>
                  {otpLoading && !otpSent ? 'Sending...' : otpSent ? 'Sent' : 'Send OTP'}
                </button>
              )}
            </div>
            
            {otpSent && !otpVerified && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', animation: 'fadeIn 0.3s' }}>
                <input type="text" className="form-input" placeholder="Enter 6-digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} style={{ flex: 1, letterSpacing: '0.2em', textAlign: 'center', fontWeight: 600 }} />
                <button type="button" className="btn btn-primary" onClick={handleVerifyOtp} disabled={otpLoading || !otp}>
                  {otpLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            )}
            
            {otpVerified && (
              <div style={{ marginTop: '0.4rem', color: '#22c55e', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                <CheckCircle size={14} /> Email Verified
              </div>
            )}
            
            {form.email && !otpVerified && (
              <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: form.isExternal ? '#f59e0b' : '#38bdf8' }}>
                {form.isExternal ? '🏫 External institution detected' : '🏛️ Vel Tech University detected'}
              </div>
            )}
          </div>

          {/* ── VelTech fields ── */}
          {!form.isExternal && form.role === 'STUDENT' && (
            <>
              <div className="form-group">
                <label className="form-label">VTA / VTP / VTU Number *</label>
                <div className="input-icon-wrapper">
                  <User size={16} className="input-icon" />
                  <input type="text" name="vtuNumber" className="form-input"
                    placeholder="e.g. VTU/VTA12345"
                    value={form.vtuNumber} onChange={handleChange} id="reg-vtu"
                    style={{ textTransform: 'uppercase' }} />
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Applicable for VTU (UG), VTA (arts), VTP (polytechnic) enrolments
                </small>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div className="input-icon-wrapper">
                    <Building size={16} className="input-icon" />
                    <select name="department" className="form-select" value={form.department}
                      onChange={handleChange} style={{ paddingLeft: '2.8rem' }} id="reg-dept">
                      <option value="">Select Dept.</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {form.department === 'Other' && (
                    <input type="text" name="otherDepartment" className="form-input" placeholder="Specify Department"
                      value={form.otherDepartment} onChange={handleChange} style={{ marginTop: '0.5rem' }} required />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Year of Study</label>
                  <select name="yearOfStudy" className="form-select" value={form.yearOfStudy}
                    onChange={handleChange} id="reg-year">
                    <option value="">Select Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {!form.isExternal && form.role === 'FACULTY' && (
            <div className="form-group">
              <label className="form-label">TTS Number *</label>
              <div className="input-icon-wrapper">
                <Building size={16} className="input-icon" />
                <input type="text" name="ttsNumber" className="form-input" placeholder="e.g. TTS99001"
                  value={form.ttsNumber} onChange={handleChange} id="reg-tts" />
              </div>
            </div>
          )}

          {/* ── External college fields ── */}
          {form.isExternal && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', marginBottom: '0.5rem', background: 'rgba(245,158,11,0.05)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.75rem' }}>
                🏫 External Institution Details
              </div>

              <div className="form-group">
                <label className="form-label">College / University Name *</label>
                <div className="input-icon-wrapper">
                  <Building size={16} className="input-icon" />
                  <input type="text" name="collegeName" className="form-input"
                    placeholder="e.g. Anna University"
                    value={form.collegeName} onChange={handleChange} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <select name="collegeState" className="form-select" value={form.collegeState} onChange={handleChange}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {form.collegeState === 'Other' && (
                    <input type="text" name="otherCollegeState" className="form-input" placeholder="Specify State"
                      value={form.otherCollegeState} onChange={handleChange} style={{ marginTop: '0.5rem' }} required />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">City / Location *</label>
                  <div className="input-icon-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input type="text" name="collegeLocation" className="form-input"
                      placeholder="e.g. Chennai"
                      value={form.collegeLocation} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">College ID / Enrollment Number *</label>
                <input type="text" name="vtuNumber" className="form-input"
                  placeholder="Your college roll number / ID"
                  value={form.vtuNumber} onChange={handleChange}
                  style={{ textTransform: 'uppercase' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <div className="input-icon-wrapper">
                    <Building size={16} className="input-icon" />
                    <select name="department" className="form-select" value={form.department}
                      onChange={handleChange} style={{ paddingLeft: '2.8rem' }}>
                      <option value="">Select Dept.</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Year of Study</label>
                  <select name="yearOfStudy" className="form-select" value={form.yearOfStudy} onChange={handleChange}>
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

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon-wrapper" style={{ position: 'relative' }}>
              <Lock size={16} className="input-icon" />
              <input type={showPass ? 'text' : 'password'} name="password" className="form-input"
                placeholder="Min. 6 characters" value={form.password} onChange={handleChange}
                required id="reg-password" style={{ paddingRight: '2.8rem' }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-icon-wrapper">
              <Lock size={16} className="input-icon" />
              <input type="password" name="confirmPassword" className="form-input"
                placeholder="Re-enter password" value={form.confirmPassword}
                onChange={handleChange} required id="reg-confirm-password" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full"
            disabled={loading || !otpVerified} id="reg-submit" style={{ marginTop: '1.25rem' }}>
            {loading ? <><div className="spinner spinner-sm" /> Creating account...</> :
              form.role === 'FACULTY' ? '👩‍🏫 Register as Faculty' : '👨‍🎓 Register as Student'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
