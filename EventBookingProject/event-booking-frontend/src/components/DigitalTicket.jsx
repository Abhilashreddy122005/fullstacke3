import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, QrCode, Calendar, MapPin, Users, Award, Building2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────
   DigitalTicket
   Renders a beautiful print/PDF-ready ticket for ONE attendee.
   Props:
     attendee   – AttendeeResponse object
     event      – Event object
     booking    – Booking object
     onClose    – optional close callback
───────────────────────────────────────────────────────────────── */
export default function DigitalTicket({ attendee, event, booking, onClose }) {
  const ticketRef = useRef(null);

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    const toastId = toast.loading('Generating PDF ticket…');
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,           // high-res
        useCORS: true,
        backgroundColor: '#0a0a0a',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 190] });
      pdf.addImage(imgData, 'PNG', 0, 0, 100, 190);
      const fileName = `ticket_${attendee.name?.replace(/\s+/g, '_')}_${event?.eventName?.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
      toast.success('Ticket downloaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Download failed. Please try again.', { id: toastId });
    }
  };

  const handlePrint = () => {
    const printContent = ticketRef.current;
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head>
        <title>Ticket — ${attendee.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: #0a0a0a; display: flex; justify-content: center; padding: 20px; }
        </style>
      </head><body>
        ${printContent.outerHTML}
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  const formatDate = (d) => {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const statusColor = attendee?.attendanceStatus === 'CHECKED_IN' ? '#22c55e'
    : attendee?.attendanceStatus === 'CHECKED_OUT' ? '#94a3b8'
    : '#f59e0b';

  return (
    <div className="dt-wrapper">
      {/* ── Action Bar ─────────────────────────────── */}
      <div className="dt-action-bar">
        <button className="dt-btn-download" onClick={handleDownload}>
          <Download size={16} /> Download PDF
        </button>
        <button className="dt-btn-print" onClick={handlePrint}>
          🖨️ Print
        </button>
        {onClose && (
          <button className="dt-btn-close" onClick={onClose}>✕</button>
        )}
      </div>

      {/* ── The Ticket (rendered to canvas) ────────── */}
      <div ref={ticketRef} className="dt-ticket">

        {/* Header band */}
        <div className="dt-header">
          <div className="dt-institution">
            <Building2 size={13} />
            VelTech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology
          </div>
          <div className="dt-brand">EventSphere</div>
          <div className="dt-event-type-tag">{event?.eventType || 'EVENT'}</div>
        </div>

        {/* Event name */}
        <div className="dt-event-name">{event?.eventName}</div>
        {event?.shortDescription && (
          <div className="dt-event-desc">{event.shortDescription}</div>
        )}

        {/* Separator */}
        <div className="dt-zigzag">
          <div className="dt-circle-left" />
          <div className="dt-dashed" />
          <div className="dt-circle-right" />
        </div>

        {/* Attendee info */}
        <div className="dt-attendee-section">
          <div className="dt-avatar-initials">
            {attendee?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="dt-attendee-info">
            <div className="dt-attendee-name">{attendee?.name}</div>
            <div className="dt-attendee-email">{attendee?.email}</div>
            {attendee?.phone && <div className="dt-attendee-phone">📞 {attendee.phone}</div>}
            {attendee?.teamLeader && (
              <span className="dt-leader-badge">👑 Team Leader</span>
            )}
            {booking?.teamName && (
              <span className="dt-team-badge">👥 {booking.teamName}</span>
            )}
          </div>
        </div>

        {/* Event details grid */}
        <div className="dt-details-grid">
          <div className="dt-detail-item">
            <Calendar size={12} className="dt-detail-icon" />
            <div>
              <div className="dt-detail-label">Date</div>
              <div className="dt-detail-value">{formatDate(event?.startDateTime || event?.startDate)}</div>
            </div>
          </div>
          {(event?.startDateTime || event?.time) && (
            <div className="dt-detail-item">
              <Clock size={12} className="dt-detail-icon" />
              <div>
                <div className="dt-detail-label">Time</div>
                <div className="dt-detail-value">
                  {event?.startDateTime ? formatTime(event.startDateTime) : event?.time?.substring(0, 5)}
                </div>
              </div>
            </div>
          )}
          {event?.venue && (
            <div className="dt-detail-item">
              <MapPin size={12} className="dt-detail-icon" />
              <div>
                <div className="dt-detail-label">Venue</div>
                <div className="dt-detail-value">{event.venue}</div>
              </div>
            </div>
          )}
          {event?.department && (
            <div className="dt-detail-item">
              <Award size={12} className="dt-detail-icon" />
              <div>
                <div className="dt-detail-label">Department</div>
                <div className="dt-detail-value">{event.department}</div>
              </div>
            </div>
          )}
        </div>

        {/* QR Code — INDIVIDUAL per attendee */}
        <div className="dt-qr-section">
          <div className="dt-qr-label">
            <QrCode size={13} />
            Your Personal Entry QR Code
          </div>
          {attendee?.qrCodeData ? (
            <div className="dt-qr-frame">
              <img
                src={attendee.qrCodeData}
                alt={`QR Code for ${attendee.name}`}
                className="dt-qr-img"
              />
            </div>
          ) : (
            <div className="dt-qr-placeholder">
              <QrCode size={60} opacity={0.3} />
              <span>QR not available</span>
            </div>
          )}
          <div className="dt-qr-token">{attendee?.qrToken}</div>
          <p className="dt-qr-hint">Present this QR at the venue entry for scanning</p>
        </div>

        {/* Booking reference footer */}
        <div className="dt-footer">
          <div className="dt-footer-row">
            <span className="dt-footer-label">Booking Ref</span>
            <span className="dt-footer-ref">{booking?.bookingReference || attendee?.bookingReference}</span>
          </div>
          <div className="dt-footer-row">
            <span className="dt-footer-label">Status</span>
            <span className="dt-status" style={{ color: statusColor }}>
              ● {attendee?.attendanceStatus || 'PENDING'}
            </span>
          </div>
          <div className="dt-footer-row">
            <span className="dt-footer-label">Ticket Price</span>
            <span className="dt-footer-price">
              {(event?.price === 0 || event?.price === '0.00') ? 'FREE' : `₹${event?.price}`}
            </span>
          </div>
        </div>

        {/* Bottom brand strip */}
        <div className="dt-bottom-strip">
          <span>EventSphere · VelTech University</span>
          <span>Non-transferable · Issued {new Date().toLocaleDateString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}
