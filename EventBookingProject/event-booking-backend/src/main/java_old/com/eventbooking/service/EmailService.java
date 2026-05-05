package com.eventbooking.service;

import com.eventbooking.model.Booking;
import com.eventbooking.model.Event;
import com.eventbooking.model.User;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private static final String FROM = "vtu25922@veltech.edu.in";
    private static final String BRAND = "EventSphere";
    private static final String BRAND_COLOR = "#6366f1";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    public void sendSimpleEmail(String to, String subject, String text) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(FROM);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(text);
            mailSender.send(msg);
            log.info("✉️ Simple email sent to: {}", to);
        } catch (Exception e) {
            log.error("❌ Failed to send simple email to {}: {}", to, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  1. BOOKING CONFIRMATION (with QR attachment)
    // ─────────────────────────────────────────────────────────────────
    @Async
    public void sendBookingConfirmation(Booking booking) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(booking.getUser().getEmail());
            helper.setSubject("🎟️ Booking Confirmed — " + booking.getEvent().getEventName());
            helper.setText(buildBookingHtml(booking), true);

            if (booking.getQrCodeData() != null && booking.getQrCodeData().contains("base64,")) {
                String base64Data = booking.getQrCodeData().split(",")[1];
                byte[] qrBytes = Base64.getDecoder().decode(base64Data);
                helper.addAttachment("QR_Ticket_" + booking.getBookingReference() + ".png",
                        () -> new java.io.ByteArrayInputStream(qrBytes), "image/png");
            }

            mailSender.send(message);
            log.info("✉️ Booking confirmation sent to: {}", booking.getUser().getEmail());
        } catch (Exception e) {
            log.error("❌ Failed to send booking confirmation to {}: {}", booking.getUser().getEmail(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  2. WELCOME EMAIL (on account creation)
    // ─────────────────────────────────────────────────────────────────
    @Async
    public void sendWelcomeEmail(User user) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(user.getEmail());
            helper.setSubject("🎉 Welcome to " + BRAND + ", " + user.getName() + "!");
            helper.setText(buildWelcomeHtml(user), true);
            mailSender.send(message);
            log.info("✉️ Welcome email sent to: {}", user.getEmail());
        } catch (Exception e) {
            log.error("❌ Failed to send welcome email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  3. FACULTY PENDING EMAIL
    // ─────────────────────────────────────────────────────────────────
    @Async
    public void sendFacultyPendingEmail(User faculty) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(faculty.getEmail());
            helper.setSubject("⏳ " + BRAND + " — Faculty Registration Received");
            helper.setText(buildFacultyPendingHtml(faculty), true);
            mailSender.send(message);
            log.info("✉️ Faculty pending email sent to: {}", faculty.getEmail());
        } catch (Exception e) {
            log.error("❌ Failed to send faculty pending email: {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  4. FACULTY APPROVED EMAIL
    // ─────────────────────────────────────────────────────────────────
    @Async
    public void sendFacultyApprovedEmail(User faculty) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(faculty.getEmail());
            helper.setSubject("✅ " + BRAND + " — Your Faculty Account is Approved!");
            helper.setText(buildFacultyApprovedHtml(faculty), true);
            mailSender.send(message);
            log.info("✉️ Faculty approved email sent to: {}", faculty.getEmail());
        } catch (Exception e) {
            log.error("❌ Failed to send faculty approved email: {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  5. NEW EVENT NOTIFICATION (to eligible users)
    // ─────────────────────────────────────────────────────────────────
    @Async
    public void sendNewEventNotifications(Event event, List<User> users) {
        users.forEach(user -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(FROM);
                helper.setTo(user.getEmail());
                helper.setSubject("🎭 New Event: " + event.getEventName() + " — Book Now!");
                helper.setText(buildNewEventHtml(event, user, null), true);
                mailSender.send(message);
            } catch (Exception e) {
                log.error("❌ Failed to send new event notification to {}: {}", user.getEmail(), e.getMessage());
            }
        });
        log.info("✉️ New event notifications sent to {} users for: {}", users.size(), event.getEventName());
    }

    // ─────────────────────────────────────────────────────────────────
    //  6. CAMPAIGN EMAIL (manual blast by faculty)
    // ─────────────────────────────────────────────────────────────────
    @Async
    public void sendCampaignEmails(Event event, List<User> users, String customMessage, byte[] fileBytes, String fileName) {
        users.forEach(user -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(FROM);
                helper.setTo(user.getEmail());
                helper.setSubject("📢 " + event.getEventName() + " — Don't Miss Out!");
                helper.setText(buildNewEventHtml(event, user, customMessage), true);

                if (fileBytes != null && fileName != null) {
                    helper.addAttachment(fileName, () -> new java.io.ByteArrayInputStream(fileBytes));
                }

                mailSender.send(message);
            } catch (Exception e) {
                log.error("❌ Campaign email failed for {}: {}", user.getEmail(), e.getMessage());
            }
        });
        log.info("✉️ Campaign emails sent to {} users for: {}", users.size(), event.getEventName());
    }

    // ─────────────────────────────────────────────────────────────────
    //  7. EVENT CANCELLATION (to all bookers)
    // ─────────────────────────────────────────────────────────────────
    @Async
    public void sendEventCancellationEmails(Event event, List<Booking> bookings) {
        bookings.forEach(booking -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(FROM);
                helper.setTo(booking.getUser().getEmail());
                helper.setSubject("🚫 Event Cancelled: " + event.getEventName());
                helper.setText(buildCancellationHtml(event, booking), true);
                mailSender.send(message);
            } catch (Exception e) {
                log.error("❌ Cancellation email failed for {}: {}", booking.getUser().getEmail(), e.getMessage());
            }
        });
        log.info("✉️ Cancellation emails sent to {} bookers for: {}", bookings.size(), event.getEventName());
    }

    // ─────────────────────────────────────────────────────────────────
    //  8. GENERAL ANNOUNCEMENT
    // ─────────────────────────────────────────────────────────────────
    @Async
    public void sendAnnouncementEmails(List<User> users, String subject, String messageBody) {
        users.forEach(user -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(FROM);
                helper.setTo(user.getEmail());
                helper.setSubject("📣 " + subject);
                helper.setText(buildAnnouncementHtml(user, subject, messageBody), true);
                mailSender.send(message);
            } catch (Exception e) {
                log.error("❌ Announcement email failed for {}: {}", user.getEmail(), e.getMessage());
            }
        });
        log.info("✉️ Announcement '{}' sent to {} users", subject, users.size());
    }

    // ═══════════════════════════════════════════════════════════════
    //  HTML TEMPLATE BUILDERS
    // ═══════════════════════════════════════════════════════════════

    private String header(String title, String subtitle) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'><style>" +
               "body{font-family:Inter,Arial,sans-serif;background:#050505;margin:0;padding:20px;}" +
               ".card{max-width:600px;margin:0 auto;background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);}" +
               ".hdr{background:linear-gradient(135deg,#800000,#b30000);padding:40px 30px;text-align:center;}" +
               ".hdr h1{color:white;margin:0 0 8px;font-size:26px;}" +
               ".hdr p{color:rgba(255,255,255,0.85);margin:0;font-size:15px;}" +
               ".body{padding:30px;}" +
               ".row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:14px;}" +
               ".label{color:#a3a3a3;}" +
               ".value{color:#ffffff;font-weight:600;}" +
               ".btn{display:inline-block;background:linear-gradient(135deg,#800000,#cc0000);color:white;padding:14px 32px;" +
               "border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin:20px 0;}" +
               ".ftr{background:#050505;padding:20px 30px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);}" +
               ".ftr p{color:#525252;font-size:12px;margin:4px 0;}" +
               ".badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;}" +
               ".badge-purple{background:rgba(128,0,0,0.2);color:#ff9999;}" +
               ".badge-green{background:rgba(34,197,94,0.2);color:#4ade80;}" +
               ".badge-red{background:rgba(239,68,68,0.2);color:#f87171;}" +
               ".badge-yellow{background:rgba(245,158,11,0.2);color:#fbbf24;}" +
               "</style></head><body><div class='card'>" +
               "<div class='hdr'><h1>" + title + "</h1><p>" + subtitle + "</p></div><div class='body'>";
    }

    private String footer() {
        return "</div><div class='ftr'><p>VelTech University · " + BRAND + "</p>" +
               "<p>Smart Department Event Management System</p>" +
               "<p>Do not reply to this email · © 2024 EventSphere</p></div></div></body></html>";
    }

    private String buildBookingHtml(Booking booking) {
        String eventDate = booking.getEvent().getDate() != null ? booking.getEvent().getDate().format(DATE_FMT) : "TBD";
        String eventTime = booking.getEvent().getTime() != null ? booking.getEvent().getTime().format(TIME_FMT) : "TBD";
        return header("🎟️ Booking Confirmed!", "Your ticket for " + booking.getEvent().getEventName() + " is ready") +
               "<p style='color:#cbd5e1;'>Dear <strong style='color:white;'>" + booking.getUser().getName() + "</strong>,</p>" +
               "<p style='color:#a3a3a3;'>Great news! Your booking is confirmed. Find your details below and your QR code ticket.</p>" +
               
               "<div style='text-align:center; margin:30px 0; padding:20px; background:#ffffff; border-radius:16px; box-shadow:0 0 30px rgba(128,0,0,0.5);'>" +
               "<h3 style='color:#050505; margin:0 0 10px 0;'>SCAN FOR ENTRY</h3>" +
               "<img src='" + booking.getQrCodeData() + "' alt='QR Ticket' style='width:250px; height:250px; display:block; margin:0 auto;' />" +
               "<p style='color:#525252; font-size:12px; margin:10px 0 0 0;'>Reference: " + booking.getBookingReference() + "</p>" +
               "</div>" +

               "<div style='background:rgba(255,255,255,0.03);border-radius:12px;padding:20px;margin:20px 0;border:1px solid rgba(255,255,255,0.1);'>" +
               "<div class='row'><span class='label'>Booking Reference</span><span class='value' style='color:#ff9999;letter-spacing:0.05em;'>" + booking.getBookingReference() + "</span></div>" +
               "<div class='row'><span class='label'>Event</span><span class='value'>" + booking.getEvent().getEventName() + "</span></div>" +
               "<div class='row'><span class='label'>Department</span><span class='value'>" + (booking.getEvent().getDepartment() != null ? booking.getEvent().getDepartment() : "General") + "</span></div>" +
               "<div class='row'><span class='label'>Date</span><span class='value'>" + eventDate + "</span></div>" +
               "<div class='row'><span class='label'>Time</span><span class='value'>" + eventTime + "</span></div>" +
               "<div class='row'><span class='label'>Venue</span><span class='value'>" + (booking.getEvent().getVenue() != null ? booking.getEvent().getVenue() : "TBD") + "</span></div>" +
               "<div class='row'><span class='label'>Tickets</span><span class='value'>" + booking.getNumberOfTickets() + "</span></div>" +
               "<div class='row' style='border:none;'><span class='label' style='font-weight:700;color:#ffffff;font-size:16px;'>Total Paid</span>" +
               "<span class='value' style='color:#ff9999;font-size:20px;'>₹" + booking.getTotalAmount() + "</span></div>" +
               "</div>" +
               "<p style='color:#f87171;font-size:13px;'>⚠️ This ticket is non-transferable. One entry per QR code only.</p>" +
               footer();
    }

    private String buildWelcomeHtml(User user) {
        String roleLabel = user.getRole() == User.Role.FACULTY ? "Faculty Member" : "Student";
        String roleColor = user.getRole() == User.Role.FACULTY ? "badge-purple" : "badge-green";
        return header("🎉 Welcome to " + BRAND + "!", "Your account has been created successfully") +
               "<p style='color:#cbd5e1;'>Hi <strong style='color:white;'>" + user.getName() + "</strong>,</p>" +
               "<p style='color:#94a3b8;'>Welcome to the VelTech University Smart Department Event Booking System! 🎓</p>" +
               "<div style='background:#0f1729;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #2d3a5e;'>" +
               "<div class='row'><span class='label'>Name</span><span class='value'>" + user.getName() + "</span></div>" +
               "<div class='row'><span class='label'>Email</span><span class='value'>" + user.getEmail() + "</span></div>" +
               "<div class='row'><span class='label'>Department</span><span class='value'>" + (user.getDepartment() != null ? user.getDepartment() : "—") + "</span></div>" +
               "<div class='row' style='border:none;'><span class='label'>Role</span><span class='value'><span class='badge " + roleColor + "'>" + roleLabel + "</span></span></div>" +
               "</div>" +
               "<div style='text-align:center;'><a href='http://localhost:5173/events' class='btn'>🎭 Browse Events</a></div>" +
               "<p style='color:#94a3b8;font-size:13px;'>You can now browse upcoming events, book tickets, and download your QR code tickets.</p>" +
               footer();
    }

    private String buildFacultyPendingHtml(User faculty) {
        return header("⏳ Registration Received", "Your faculty account is under review") +
               "<p style='color:#cbd5e1;'>Hi <strong style='color:white;'>" + faculty.getName() + "</strong>,</p>" +
               "<p style='color:#94a3b8;'>Thank you for registering as a Faculty member on " + BRAND + ". Your account is currently <strong style='color:#fbbf24;'>pending admin approval</strong>.</p>" +
               "<div style='background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;margin:20px 0;text-align:center;'>" +
               "<div style='font-size:48px;margin-bottom:12px;'>⏳</div>" +
               "<p style='color:#fbbf24;font-weight:700;margin:0 0 8px;font-size:16px;'>Awaiting Admin Approval</p>" +
               "<p style='color:#94a3b8;margin:0;font-size:14px;'>The admin will review your request shortly. You'll receive an email once approved.</p>" +
               "</div>" +
               "<p style='color:#94a3b8;font-size:13px;'>Email: <strong style='color:white;'>" + faculty.getEmail() + "</strong></p>" +
               footer();
    }

    private String buildFacultyApprovedHtml(User faculty) {
        return header("✅ Faculty Account Approved!", "You can now create and manage events") +
               "<p style='color:#cbd5e1;'>Hi <strong style='color:white;'>" + faculty.getName() + "</strong>,</p>" +
               "<p style='color:#94a3b8;'>Great news! Your faculty account has been <strong style='color:#4ade80;'>approved</strong> by the admin. You can now login and start creating events!</p>" +
               "<div style='background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:20px;margin:20px 0;text-align:center;'>" +
               "<div style='font-size:48px;margin-bottom:12px;'>🎊</div>" +
               "<p style='color:#4ade80;font-weight:700;margin:0 0 8px;font-size:16px;'>Account Approved!</p>" +
               "<p style='color:#94a3b8;margin:0;font-size:14px;'>You can now create events, manage bookings, and send campaigns.</p>" +
               "</div>" +
               "<div style='text-align:center;'><a href='http://localhost:5173/login' class='btn'>🚀 Login Now</a></div>" +
               footer();
    }

    private String buildNewEventHtml(Event event, User user, String customMessage) {
        String eventDate = event.getDate() != null ? event.getDate().format(DATE_FMT) : "TBD";
        String eventTime = event.getTime() != null ? event.getTime().format(TIME_FMT) : "TBD";
        String restriction = buildRestrictionText(event);
        String customBlock = (customMessage != null && !customMessage.isEmpty())
                ? "<div style='background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:16px;margin:16px 0;'>" +
                  "<p style='color:#818cf8;font-weight:700;margin:0 0 8px;'>📢 Message from Organizer</p>" +
                  "<p style='color:#cbd5e1;margin:0;'>" + customMessage + "</p></div>"
                : "";
        return header("🎭 New Event: " + event.getEventName(), "A new event has been added — Book your tickets now!") +
               "<p style='color:#cbd5e1;'>Hi <strong style='color:white;'>" + user.getName() + "</strong>,</p>" +
               "<p style='color:#94a3b8;'>A new event has been created that you might be interested in!</p>" +
               customBlock +
               "<div style='background:#0f1729;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #2d3a5e;'>" +
               "<div class='row'><span class='label'>Event</span><span class='value' style='color:#818cf8;font-size:16px;'>" + event.getEventName() + "</span></div>" +
               "<div class='row'><span class='label'>Department</span><span class='value'>" + (event.getDepartment() != null ? event.getDepartment() : "All") + "</span></div>" +
               "<div class='row'><span class='label'>Date</span><span class='value'>" + eventDate + "</span></div>" +
               "<div class='row'><span class='label'>Time</span><span class='value'>" + eventTime + "</span></div>" +
               "<div class='row'><span class='label'>Venue</span><span class='value'>" + (event.getVenue() != null ? event.getVenue() : "TBD") + "</span></div>" +
               "<div class='row'><span class='label'>Price</span><span class='value' style='color:#4ade80;'>" + (event.getPrice().compareTo(BigDecimal.ZERO) == 0 ? "FREE" : "₹" + event.getPrice()) + "</span></div>" +
               "<div class='row'><span class='label'>Tickets Available</span><span class='value'>" + event.getAvailableTickets() + "</span></div>" +
               (restriction != null ? "<div class='row' style='border:none;'><span class='label'>For</span><span class='value'><span class='badge badge-purple'>" + restriction + "</span></span></div>" : "</div>") +
               (restriction == null ? "" : "</div>") +
               "<div style='text-align:center;'><a href='http://localhost:5173/book/" + event.getId() + "' class='btn'>🎟️ Book Tickets Now</a></div>" +
               "<p style='color:#94a3b8;font-size:13px;'>Hurry! Only " + event.getAvailableTickets() + " tickets available.</p>" +
               footer();
    }

    private String buildCancellationHtml(Event event, Booking booking) {
        return header("🚫 Event Cancelled", event.getEventName() + " has been cancelled") +
               "<p style='color:#cbd5e1;'>Hi <strong style='color:white;'>" + booking.getUser().getName() + "</strong>,</p>" +
               "<p style='color:#94a3b8;'>We regret to inform you that the following event has been <strong style='color:#f87171;'>cancelled</strong>.</p>" +
               "<div style='background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:20px;margin:20px 0;'>" +
               "<div class='row'><span class='label'>Event</span><span class='value' style='color:#f87171;'>" + event.getEventName() + "</span></div>" +
               "<div class='row'><span class='label'>Your Booking Ref</span><span class='value'>" + booking.getBookingReference() + "</span></div>" +
               "<div class='row'><span class='label'>Tickets Booked</span><span class='value'>" + booking.getNumberOfTickets() + "</span></div>" +
               "<div class='row' style='border:none;'><span class='label'>Amount</span><span class='value'>₹" + booking.getTotalAmount() + "</span></div>" +
               "</div>" +
               "<div style='background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:16px;margin:16px 0;text-align:center;'>" +
               "<p style='color:#4ade80;font-weight:700;margin:0 0 4px;'>💰 Refund Information</p>" +
               "<p style='color:#94a3b8;margin:0;font-size:14px;'>Your booking has been cancelled. Please contact the admin for refund processing.</p>" +
               "</div>" +
               "<p style='color:#94a3b8;font-size:13px;'>We apologize for the inconvenience. Please browse other available events.</p>" +
               "<div style='text-align:center;'><a href='http://localhost:5173/events' class='btn'>🎭 Browse Other Events</a></div>" +
               footer();
    }

    private String buildAnnouncementHtml(User user, String subject, String messageBody) {
        return header("📣 " + subject, "Announcement from VelTech EventSphere") +
               "<p style='color:#cbd5e1;'>Hi <strong style='color:white;'>" + user.getName() + "</strong>,</p>" +
               "<div style='background:#0f1729;border-radius:12px;padding:24px;margin:20px 0;border:1px solid #2d3a5e;'>" +
               "<p style='color:#e2e8f0;font-size:15px;line-height:1.7;margin:0;'>" + messageBody.replace("\n", "<br>") + "</p>" +
               "</div>" +
               "<div style='text-align:center;'><a href='http://localhost:5173/events' class='btn'>🎭 Browse Events</a></div>" +
               footer();
    }

    private String buildRestrictionText(Event event) {
        boolean hasDepts = event.getTargetDepartments() != null && !event.getTargetDepartments().isEmpty();
        boolean hasYears = event.getTargetYears() != null && !event.getTargetYears().isEmpty();
        if (!hasDepts && !hasYears) return null;
        
        StringBuilder sb = new StringBuilder();
        if (hasDepts) {
            sb.append(String.join(", ", event.getTargetDepartments()));
        }
        if (hasYears) {
            if (hasDepts) sb.append(" · ");
            sb.append(event.getTargetYears().stream()
                .map(y -> y + getOrdinal(y) + " Year")
                .reduce((a, b) -> a + ", " + b)
                .orElse(""));
        }
        return sb.toString();
    }

    private String getOrdinal(int n) {
        return switch (n) { case 1 -> "st"; case 2 -> "nd"; case 3 -> "rd"; default -> "th"; };
    }
}
