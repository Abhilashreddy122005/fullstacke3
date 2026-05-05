package com.eventbooking.service;

import com.eventbooking.dto.AttendeeRequest;
import com.eventbooking.model.Attendee;
import com.eventbooking.model.Booking;
import com.eventbooking.model.Event;
import com.eventbooking.model.User;
import com.eventbooking.dto.BookingRequest;
import com.eventbooking.repository.BookingRepository;
import com.eventbooking.repository.EventRepository;
import com.eventbooking.repository.UserRepository;
import com.eventbooking.repository.AttendeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BookingService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final AttendeeRepository attendeeRepository;
    private final QRCodeService qrCodeService;
    private final EmailService emailService;
    private final NotificationService notificationService;

    public BookingService(BookingRepository bookingRepository,
                          EventRepository eventRepository,
                          UserRepository userRepository,
                          AttendeeRepository attendeeRepository,
                          QRCodeService qrCodeService,
                          EmailService emailService,
                          NotificationService notificationService) {
        this.bookingRepository = bookingRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.attendeeRepository = attendeeRepository;
        this.qrCodeService = qrCodeService;
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Booking createBooking(BookingRequest request, String userEmail) {
        // ── Fetch user & event ────────────────────────────────────────
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found: " + request.getEventId()));

        // ── Status checks ─────────────────────────────────────────────
        if (event.getStatus() == Event.EventStatus.CANCELLED) {
            throw new RuntimeException("This event has been cancelled.");
        }
        if (event.getStatus() != Event.EventStatus.REGISTRATION_OPEN) {
            throw new RuntimeException("Registration is not currently open for this event.");
        }

        // ── Duplicate registration ─────────────────────────────────────
        boolean alreadyRegistered = bookingRepository.existsByUserIdAndEventIdAndStatusNot(
                user.getId(), event.getId(), Booking.BookingStatus.CANCELLED);
        if (alreadyRegistered) {
            throw new RuntimeException("You are already registered for this event.");
        }

        // ── Team validation ───────────────────────────────────────────
        if (Boolean.TRUE.equals(event.getIsTeamEvent())) {
            if (!request.isTeamBooking()) {
                throw new RuntimeException("This is a team event. Please enable team booking.");
            }
            if (event.getMaxTeamSize() != null && request.getNumberOfTickets() > event.getMaxTeamSize()) {
                throw new RuntimeException("Team size exceeds the maximum allowed: " + event.getMaxTeamSize());
            }
            if (event.getMaxTeams() != null) {
                long currentTeams = bookingRepository.countByEventIdAndStatusNot(event.getId(), Booking.BookingStatus.CANCELLED);
                if (currentTeams >= event.getMaxTeams()) {
                    throw new RuntimeException("Registration full. Maximum number of teams (" + event.getMaxTeams() + ") has been reached.");
                }
            }
        }

        // ── Ticket availability ───────────────────────────────────────
        int ticketCount = request.getNumberOfTickets();
        if (ticketCount <= 0) {
            throw new RuntimeException("Number of tickets must be at least 1.");
        }
        if (event.getAvailableTickets() < ticketCount) {
            throw new RuntimeException("Not enough tickets available. Only " + event.getAvailableTickets() + " left.");
        }

        // ── Attendee list validation ──────────────────────────────────
        List<AttendeeRequest> attendeeRequests = request.getAttendees();
        if (attendeeRequests != null && !attendeeRequests.isEmpty()) {
            if (attendeeRequests.size() != ticketCount) {
                throw new RuntimeException("Attendee details count (" + attendeeRequests.size()
                        + ") must match number of tickets (" + ticketCount + ").");
            }
        }

        // ── Deduct tickets ────────────────────────────────────────────
        event.setAvailableTickets(event.getAvailableTickets() - ticketCount);
        eventRepository.save(event);

        // ── Build booking ─────────────────────────────────────────────
        String bookingReference = "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        BigDecimal ticketAmount = event.getPrice() != null ? event.getPrice().multiply(BigDecimal.valueOf(ticketCount)) : BigDecimal.ZERO;
        BigDecimal accommodationAmount = BigDecimal.ZERO;
        if (Boolean.TRUE.equals(request.getAccommodationRequired()) && event.getAccommodationPrice() != null) {
            accommodationAmount = event.getAccommodationPrice().multiply(BigDecimal.valueOf(ticketCount));
        }
        BigDecimal totalAmount = ticketAmount.add(accommodationAmount);

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setEvent(event);
        booking.setNumberOfTickets(ticketCount);
        booking.setTotalAmount(totalAmount);
        booking.setBookingDate(LocalDateTime.now());
        booking.setBookingReference(bookingReference);
        booking.setTeamBooking(request.isTeamBooking());
        booking.setTeamName(request.getTeamName());
        booking.setAccommodationRequired(Boolean.TRUE.equals(request.getAccommodationRequired()));
        booking.setCustomFieldResponses(request.getCustomFieldResponses());
        booking.setCheckedIn(false);

        // If total amount is zero, mark as FREE directly; otherwise PENDING_PAYMENT
        if (totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            booking.setPaymentStatus(Booking.PaymentStatus.FREE);
            booking.setStatus(Booking.BookingStatus.CONFIRMED);
        } else {
            booking.setPaymentStatus(Booking.PaymentStatus.PENDING);
            booking.setStatus(Booking.BookingStatus.PENDING_PAYMENT);
        }

        // ── Build attendees with unique QR per person ─────────────────
        List<Attendee> attendees = new ArrayList<>();

        if (attendeeRequests != null && !attendeeRequests.isEmpty()) {
            for (AttendeeRequest ar : attendeeRequests) {
                Attendee attendee = buildAttendee(ar, booking, event, bookingReference);
                attendees.add(attendee);
            }
        } else {
            // Auto-create one attendee from the booking user
            AttendeeRequest autoAr = new AttendeeRequest();
            autoAr.setName(user.getName());
            autoAr.setEmail(user.getEmail());
            autoAr.setTeamLeader(true);
            Attendee autoAttendee = buildAttendee(autoAr, booking, event, bookingReference);
            attendees.add(autoAttendee);
        }
        booking.setAttendees(attendees);

        // Legacy booking-level QR generation removed to prevent duplicate QR codes.

        // ── Persist ───────────────────────────────────────────────────
        Booking saved = bookingRepository.save(booking);
        log.info("Booking created: {} for user: {} ({} attendees)", bookingReference, userEmail, attendees.size());

        // ── Notifications ─────────────────────────────────────────────
        try {
            // Booking-level summary → booker
            emailService.sendBookingConfirmation(saved);
        } catch (Exception e) {
            log.error("Email failed for booking {}: {}", bookingReference, e.getMessage());
        }
        try {
            // Individual QR ticket → each attendee's email
            emailService.sendAttendeeTickets(saved);
        } catch (Exception e) {
            log.error("Attendee ticket emails failed for booking {}: {}", bookingReference, e.getMessage());
        }
        try {
            notificationService.notifyBookingConfirmed(user.getId(), event.getEventName(), bookingReference);
        } catch (Exception e) {
            log.error("Notification failed for booking {}: {}", bookingReference, e.getMessage());
        }

        return saved;
    }

    private Attendee buildAttendee(AttendeeRequest ar, Booking booking, Event event, String bookingReference) {
        String qrToken = "ATT-" + UUID.randomUUID().toString().toUpperCase();
        String qrContent = String.format("{\"token\":\"%s\",\"eventId\":%d,\"ref\":\"%s\"}",
                qrToken, event.getId(), bookingReference);

        Attendee attendee = new Attendee();
        attendee.setBooking(booking);
        attendee.setName(ar.getName());
        attendee.setEmail(ar.getEmail());
        attendee.setPhone(ar.getPhone());
        attendee.setTeamLeader(ar.isTeamLeader());
        attendee.setQrToken(qrToken);
        attendee.setFaceDescriptor(ar.getFaceDescriptor());
        attendee.setCustomFields(ar.getCustomFields());
        attendee.setAttendanceStatus(Attendee.AttendanceStatus.PENDING);

        try {
            String qrBase64 = qrCodeService.generateQRCode(qrContent, 300, 300);
            attendee.setQrCodeData(qrBase64);
        } catch (Exception e) {
            log.error("QR generation failed for attendee {}: {}", ar.getEmail(), e.getMessage());
        }

        return attendee;
    }

    @Transactional(readOnly = true)
    public List<Booking> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + id));
    }

    @Transactional
    public Map<String, Object> validateAndCheckIn(String reference) {
        Map<String, Object> resp = new java.util.HashMap<>();

        // 1. Try to find an Attendee by their unique QR token
        java.util.Optional<Attendee> optAttendee = attendeeRepository.findByQrToken(reference);
        if (optAttendee.isPresent()) {
            Attendee attendee = optAttendee.get();
            if (attendee.getAttendanceStatus() == Attendee.AttendanceStatus.CHECKED_IN) {
                throw new RuntimeException("This ticket has already been checked in.");
            }
            attendee.setAttendanceStatus(Attendee.AttendanceStatus.CHECKED_IN);
            attendee.setCheckInTime(java.time.LocalDateTime.now());
            attendeeRepository.save(attendee);

            Booking booking = attendee.getBooking();
            
            // Check if all attendees are checked in to mark booking as checked in
            boolean allCheckedIn = attendeeRepository.findByBookingId(booking.getId()).stream()
                    .allMatch(a -> a.getAttendanceStatus() == Attendee.AttendanceStatus.CHECKED_IN);
            if (allCheckedIn && !booking.isCheckedIn()) {
                booking.setCheckedIn(true);
                bookingRepository.save(booking);
            }

            resp.put("bookingReference", booking.getBookingReference());
            resp.put("userName", attendee.getName() + (attendee.isTeamLeader() ? " (Leader)" : ""));
            resp.put("userEmail", attendee.getEmail());
            resp.put("eventName", booking.getEvent().getEventName());
            resp.put("eventDate", booking.getEvent().getStartDate() != null ? booking.getEvent().getStartDate().toString() : "TBD");
            resp.put("venue", booking.getEvent().getVenue() != null ? booking.getEvent().getVenue() : "TBD");
            resp.put("numberOfTickets", "1 (Individual Ticket)");
            resp.put("totalAmount", booking.getTotalAmount());
            resp.put("checkedIn", true);

            log.info("Attendee checked in: {} — Event: {}, Attendee: {}",
                    attendee.getQrToken(), booking.getEvent().getEventName(), attendee.getName());
            return resp;
        }

        // 2. Fallback: try finding Booking by reference
        Booking booking = bookingRepository.findByBookingReference(reference)
                .orElseThrow(() -> new RuntimeException("Invalid ticket reference: " + reference));
        
        if (booking.isCheckedIn()) {
            throw new RuntimeException("This ticket has already been checked in.");
        }
        
        // Mark the booking itself as checked in
        booking.setCheckedIn(true);
        bookingRepository.save(booking);

        // Also check in all its attendees
        java.util.List<Attendee> attendees = attendeeRepository.findByBookingId(booking.getId());
        for (Attendee a : attendees) {
            if (a.getAttendanceStatus() != Attendee.AttendanceStatus.CHECKED_IN) {
                a.setAttendanceStatus(Attendee.AttendanceStatus.CHECKED_IN);
                a.setCheckInTime(java.time.LocalDateTime.now());
                attendeeRepository.save(a);
            }
        }

        resp.put("bookingReference", booking.getBookingReference());
        resp.put("userName", booking.getUser().getName() + " (Full Booking)");
        resp.put("userEmail", booking.getUser().getEmail());
        resp.put("eventName", booking.getEvent().getEventName());
        resp.put("eventDate", booking.getEvent().getStartDate() != null ? booking.getEvent().getStartDate().toString() : "TBD");
        resp.put("venue", booking.getEvent().getVenue() != null ? booking.getEvent().getVenue() : "TBD");
        resp.put("numberOfTickets", booking.getNumberOfTickets());
        resp.put("totalAmount", booking.getTotalAmount());
        resp.put("checkedIn", true);

        log.info("Booking checked in: {} — Event: {}, User: {}",
                reference, booking.getEvent().getEventName(), booking.getUser().getName());
        return resp;
    }

    @Transactional
    public Booking cancelBooking(Long bookingId, String requestingEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        if (!booking.getUser().getEmail().equals(requestingEmail)) {
            throw new RuntimeException("You are not authorized to cancel this booking.");
        }
        if (booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            throw new RuntimeException("This booking is already cancelled.");
        }
        if (booking.isCheckedIn()) {
            throw new RuntimeException("Cannot cancel a booking that has already been checked in.");
        }

        // Restore tickets
        Event event = booking.getEvent();
        event.setAvailableTickets(event.getAvailableTickets() + booking.getNumberOfTickets());
        eventRepository.save(event);

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        Booking saved = bookingRepository.save(booking);
        log.info("Booking {} cancelled by: {}", booking.getBookingReference(), requestingEmail);

        // Notify
        try {
            notificationService.notifyBookingCancelled(
                    booking.getUser().getId(), event.getEventName(), booking.getBookingReference());
        } catch (Exception e) {
            log.error("Cancellation notification failed: {}", e.getMessage());
        }
        try {
            emailService.sendSimpleEmail(
                    booking.getUser().getEmail(),
                    "Registration Cancelled — " + event.getEventName(),
                    "Hi " + booking.getUser().getName() + ",\n\nYour registration for \""
                            + event.getEventName() + "\" (Ref: " + booking.getBookingReference()
                            + ") has been cancelled.\n\nEventSphere Team"
            );
        } catch (Exception e) {
            log.error("Cancellation email failed: {}", e.getMessage());
        }

        return saved;
    }

    @Transactional
    public Booking confirmPayment(Long bookingId, String razorpayPaymentId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));
        booking.setPaymentStatus(Booking.PaymentStatus.PAID);
        booking.setStatus(Booking.BookingStatus.CONFIRMED);
        booking.setRazorpayPaymentId(razorpayPaymentId);
        booking.setPaidAmount(booking.getTotalAmount());
        Booking saved = bookingRepository.save(booking);

        try {
            notificationService.notifyPaymentConfirmed(
                    booking.getUser().getId(), booking.getEvent().getEventName(), booking.getBookingReference());
        } catch (Exception e) {
            log.error("Payment notification failed: {}", e.getMessage());
        }
        return saved;
    }
}
