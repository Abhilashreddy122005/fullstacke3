import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { validateQR } from '../api/axios';
import { QrCode, Search, CheckCircle, XCircle, AlertCircle, Camera, CameraOff } from 'lucide-react';

export default function QRScanner() {
  const [mode, setMode] = useState('manual');       // 'manual' | 'camera'
  const [manualRef, setManualRef] = useState('');
  const [result, setResult] = useState(null);       // validation result object
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  const html5QrcodeRef = useRef(null);
  const scannerDivId = 'html5-qrcode-scanner';

  // ── Stop camera ──────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        const state = html5QrcodeRef.current.getState();
        if (state === 2 || state === 3) await html5QrcodeRef.current.stop();
      } catch (_) {}
      try { html5QrcodeRef.current.clear(); } catch (_) {}
      html5QrcodeRef.current = null;
    }
    setScanning(false);
  }, []);

  // ── Start camera ─────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    setCameraError('');
    setResult(null);
    await new Promise(r => setTimeout(r, 200));

    const el = document.getElementById(scannerDivId);
    if (!el) { setCameraError('Scanner element not found.'); return; }

    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras?.length) { setCameraError('No camera found on this device.'); return; }

      const scanner = new Html5Qrcode(scannerDivId);
      html5QrcodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          await stopScanner();
          await handleValidate(decoded.trim());
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      if (err?.toString().includes('permission')) {
        setCameraError('Camera permission denied. Allow camera access in browser settings.');
      } else {
        setCameraError('Camera error: ' + err?.toString());
      }
    }
  }, [stopScanner]);

  // Manage camera lifecycle on mode change
  useEffect(() => {
    if (mode === 'camera') startScanner();
    else stopScanner();
    return () => { stopScanner(); };
  }, [mode]);

  // ── Validate QR reference ────────────────────────────────────────
  const handleValidate = async (ref) => {
    if (!ref?.trim()) { setError('Please enter a booking reference.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await validateQR(ref.trim());
      setResult(data);
    } catch (err) {
      setResult(err.response?.data || { valid: false, message: 'Validation failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => { e.preventDefault(); handleValidate(manualRef); };

  const resetScan = async () => {
    setResult(null); setError(''); setCameraError(''); setManualRef('');
    if (mode === 'camera') await startScanner();
  };

  const switchMode = async (m) => {
    await stopScanner();
    setResult(null); setError(''); setCameraError(''); setManualRef('');
    setMode(m);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🔲 QR Code Scanner</h1>
        <p className="page-subtitle">Validate and check-in event attendees instantly</p>
      </div>

      <div style={{ maxWidth: '580px', margin: '0 auto' }}>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg-input)',
          borderRadius: 'var(--radius-md)', padding: '4px',
          marginBottom: '1.5rem', gap: '4px',
        }}>
          {[
            { id: 'manual', label: '✏️ Manual Entry' },
            { id: 'camera', label: '📷 Camera Scan' },
          ].map(m => (
            <button key={m.id} onClick={() => switchMode(m.id)} style={{
              flex: 1, padding: '0.65rem 1rem',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              transition: 'var(--transition)',
              background: mode === m.id ? 'var(--gradient-primary)' : 'transparent',
              color: mode === m.id ? 'white' : 'var(--text-secondary)',
            }}>{m.label}</button>
          ))}
        </div>

        {/* ── MANUAL MODE ────────────────────────────────────────── */}
        {mode === 'manual' && !result && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)', padding: '2rem',
          }}>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Booking Reference</label>
                <div className="input-icon-wrapper">
                  <QrCode size={16} className="input-icon" />
                  <input
                    type="text" className="form-input"
                    placeholder="e.g. BK-A1B2C3D4"
                    value={manualRef}
                    onChange={e => setManualRef(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
                    id="qr-manual-input" autoFocus
                  />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Format: BK-XXXXXXXX — found on the attendee's confirmation email
                </p>
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full"
                disabled={loading || !manualRef.trim()} id="qr-validate-btn">
                {loading ? <><div className="spinner spinner-sm" /> Validating...</> : <><Search size={18} /> Validate & Check In</>}
              </button>
            </form>
          </div>
        )}

        {/* ── CAMERA MODE ────────────────────────────────────────── */}
        {mode === 'camera' && !result && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <Camera size={18} color="var(--accent-primary)" />
              <div>
                <h3 style={{ fontWeight: 600, margin: 0 }}>Camera QR Scanner</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {scanning ? 'Point camera at the QR code on the ticket' : 'Starting camera...'}
                </p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 600, color: scanning ? '#22c55e' : '#f59e0b' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: scanning ? '#22c55e' : '#f59e0b', animation: scanning ? 'pulse 1.5s infinite' : 'none' }} />
                  {scanning ? 'Live' : 'Starting'}
                </span>
              </div>
            </div>

            {cameraError ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <CameraOff size={48} color="var(--accent-danger)" style={{ margin: '0 auto 1rem', display: 'block' }} />
                <p style={{ color: 'var(--accent-danger)', fontWeight: 600, marginBottom: '0.5rem' }}>Camera Not Available</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{cameraError}</p>
                <button className="btn btn-ghost" onClick={startScanner}>🔄 Retry</button>
                <button className="btn btn-primary" onClick={() => switchMode('manual')} style={{ marginLeft: '0.75rem' }}>Use Manual Entry</button>
              </div>
            ) : (
              <div style={{ padding: '1rem', minHeight: '300px' }}>
                <div id={scannerDivId} style={{ width: '100%' }} />
                {!scanning && !cameraError && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '0.75rem' }}>
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Requesting camera access...</p>
                  </div>
                )}
              </div>
            )}

            {scanning && (
              <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                📱 Hold the QR code steady in front of the camera
              </div>
            )}
          </div>
        )}

        {/* ── RESULT ─────────────────────────────────────────────── */}
        {result && (
          <div style={{ marginTop: mode === 'manual' ? '1.5rem' : 0 }}>
            {result.valid ? (
              <div style={{
                background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.4)',
                borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              }}>
                {/* Success Header */}
                <div style={{
                  padding: '1.5rem', background: 'rgba(34,197,94,0.12)',
                  borderBottom: '1px solid rgba(34,197,94,0.2)',
                  display: 'flex', alignItems: 'center', gap: '1rem',
                }}>
                  <CheckCircle size={44} color="#22c55e" />
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ade80', margin: 0 }}>✅ Check-in Successful!</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>Attendee verified and admitted</p>
                  </div>
                </div>
                {/* Details */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { label: 'Booking Ref', value: result.bookingReference, mono: true },
                    { label: 'Attendee', value: result.userName },
                    { label: 'Email', value: result.userEmail },
                    { label: 'Event', value: result.eventName },
                    { label: 'Date', value: result.eventDate ? new Date(result.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD' },
                    { label: 'Venue', value: result.venue },
                    { label: 'Tickets', value: result.numberOfTickets },
                    { label: 'Amount', value: `₹${Number(result.totalAmount || 0).toLocaleString('en-IN')}` },
                  ].map(({ label, value, mono }) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: '0.88rem', paddingBottom: '0.5rem',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit', color: mono ? '#818cf8' : 'inherit' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                background: result.alreadyCheckedIn ? 'rgba(245,158,11,0.08)' : 'rgba(244,63,94,0.08)',
                border: `2px solid ${result.alreadyCheckedIn ? 'rgba(245,158,11,0.4)' : 'rgba(244,63,94,0.4)'}`,
                borderRadius: 'var(--radius-xl)', padding: '2.5rem', textAlign: 'center',
              }}>
                {result.alreadyCheckedIn
                  ? <AlertCircle size={52} color="#f59e0b" style={{ margin: '0 auto 1rem', display: 'block' }} />
                  : <XCircle size={52} color="#f43f5e" style={{ margin: '0 auto 1rem', display: 'block' }} />
                }
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: result.alreadyCheckedIn ? '#fbbf24' : '#fb7185' }}>
                  {result.alreadyCheckedIn ? '⚠️ Already Checked In' : '❌ Invalid Ticket'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{result.message}</p>
              </div>
            )}

            <button onClick={resetScan} className="btn btn-ghost btn-full btn-lg" style={{ marginTop: '1rem' }}>
              🔄 Scan Another Ticket
            </button>
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>⚠️ {error}</div>}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        #${scannerDivId} video { border-radius: var(--radius-md); width: 100% !important; }
        #${scannerDivId} img { display: none; }
      `}</style>
    </div>
  );
}
