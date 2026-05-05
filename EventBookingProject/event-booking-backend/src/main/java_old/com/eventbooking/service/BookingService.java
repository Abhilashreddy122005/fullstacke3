package com.eventbooking.service;

import com.eventbooking.dto.BookingRequest;
import com.eventbooking.model.Booking;
import com.eventbooking.model.Event;
import com.eventbooking.model.User;
import com.eventbooking.repository.BookingRepository;
import com.eventbooking.repository.EventRepository;
import com.eventbooking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final BookingRepository bookingRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final QRCodeService qrCodeService;
    private final EmailService emailService;

    @Transactional
    public Booking createBooking(BookingRequest request, String userEmail) {
        // Fetch user
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Fetch event
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + request.getEventId()));

        // Reject if event is cancelled
        if (event.getStatus() == Event.EventStatus.CANCELLED) {
            throw new RuntimeException("This event has been cancelled and is no longer accepting bookings.");
        }

        // Validate ticket availability
        if (request.getNumberOfTickets() <= 0) {
            throw new RuntimeException("Number of tickets must be at least 1");
        }

        if (event.getAvailableTickets() < request.getNumberOfTickets()) {
            throw new RuntimeException("Not enough tickets available. Only "
                    + event.getAvailableTickets() + " ticket(s) left.");
        }

        // Reduce available tickets
        event.setAvailableTickets(event.getAvailableTickets() - request.getNumberOfTickets());
        eventRepository.save(event);

        // Generate unique booking reference
        String bookingReference = "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Calculate total amount
        BigDecimal totalAmount = event.getPrice().multiply(BigDecimal.valueOf(request.getNumberOfTickets()));

        // Create booking
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setEvent(event);
        booking.setNumberOfTickets(request.getNumberOfTickets());
        booking.setTotalAmount(totalAmount);
        booking.setBookingDate(LocalDateTime.now());
        booking.setBookingReference(bookingReference);
        booking.setAccommodationRequired(Boolean.TRUE.equals(request.getAccommodationRequired()));
        booking.setCustomFieldResponses(request.getCustomFieldResponses());
        booking.setCheckedIn(false);

        // Generate QR Code content
        String qrContent = String.format("%s", bookingReference);
        try {
            String qrBase64 = qrCodeService.generateQRCode(qrContent, 300, 300);
            booking.setQrCodeData(qrBase64);
            log.info("QR Code generated for booking: {}", bookingReference);
        } catch (Exception e) {
            log.error("Failed to generate QR code for booking {}: {}", bookingReference, e.getMessage());
        }

        // Save booking
        Booking savedBooking = bookingRepository.save(booking);
        log.info("Booking created: {} for user: {}", bookingReference, userEmail);

        // Send confirmation email (non-blocking, failure doesn't affect booking)
        try {
            emailService.sendBookingConfirmation(savedBooking);
        } catch (Exception e) {
            log.error("Email notification failed for booking {}: {}", bookingReference, e.getMessage());
        }

        return savedBooking;
    }

    public List<Booking> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + id));
    }

    @Transactional
    public Booking validateAndCheckIn(String bookingReference) {
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new RuntimeException("Invalid booking reference: " + bookingReference));

        if (booking.isCheckedIn()) {
            throw new RuntimeException("This ticket has already been checked in.");
        }

        booking.setCheckedIn(true);
        Booking updated = bookingRepository.save(booking);
        log.info("Booking checked in: {} — Event: {}, User: {}",
                bookingReference, booking.getEvent().getEventName(), booking.getUser().getName());
        return updated;
    }

    @Transactional
    public Booking validateFaceAndCheckIn(String faceDescriptor, Long eventId) {
        // Find the user with this exact descriptor (in real app, use cosine similarity)
        // For the demo, we assume the exact descriptor is sent back
        User user = userRepository.findAll().stream()
                .filter(u -> faceDescriptor.equals(u.getFaceDescriptor()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Biometric profile not recognized."));

        // Find the booking for this user and this event
        Booking booking = bookingRepository.findAll().stream()
                .filter(b -> b.getUser().getId().equals(user.getId()) && b.getEvent().getId().equals(eventId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No booking found for this user for this event."));

        if (booking.isCheckedIn()) {
            throw new RuntimeException("This user has already been checked in for this event.");
        }

        booking.setCheckedIn(true);
        return bookingRepository.save(booking);
    }
}
