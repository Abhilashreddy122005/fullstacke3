package com.eventbooking.controller;

import com.eventbooking.model.Booking;
import com.eventbooking.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QRController {

    private final BookingService bookingService;

    @PostMapping("/validate")
    public ResponseEntity<?> validateQR(@RequestBody Map<String, String> request) {
        String bookingReference = request.get("bookingReference");

        if (bookingReference == null || bookingReference.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("valid", false, "message", "Booking reference is required"));
        }

        bookingReference = bookingReference.replaceAll("[^A-Za-z0-9]", "").trim();

        try {
            Booking booking = bookingService.validateAndCheckIn(bookingReference);
            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "message", "✅ Check-in successful!",
                    "bookingReference", booking.getBookingReference(),
                    "userName", booking.getUser().getName(),
                    "userEmail", booking.getUser().getEmail(),
                    "eventName", booking.getEvent().getEventName(),
                    "eventDate", booking.getEvent().getStartDate() != null ? booking.getEvent().getStartDate().toString() : "TBD",
                    "venue", booking.getEvent().getVenue() != null ? booking.getEvent().getVenue() : "TBD",
                    "numberOfTickets", booking.getNumberOfTickets(),
                    "totalAmount", booking.getTotalAmount(),
                    "checkedIn", booking.isCheckedIn()
            ));
        } catch (RuntimeException e) {
            String message = e.getMessage();
            boolean isAlreadyCheckedIn = message != null && message.contains("already been checked in");
            return ResponseEntity.badRequest().body(Map.of(
                    "valid", false,
                    "message", isAlreadyCheckedIn ? "⚠️ " + message : "❌ " + message,
                    "alreadyCheckedIn", isAlreadyCheckedIn
            ));
        }
    }

    @PostMapping("/validate-face")
    public ResponseEntity<?> validateFace(@RequestBody Map<String, Object> request) {
        String faceDescriptor = (String) request.get("faceDescriptor");
        Object eventIdObj = request.get("eventId");

        if (faceDescriptor == null || eventIdObj == null) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "Biometric data and Event ID are required"));
        }

        Long eventId = Long.valueOf(eventIdObj.toString());

        try {
            Booking booking = bookingService.validateFaceAndCheckIn(faceDescriptor, eventId);
            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "message", "✅ Biometric validation successful!",
                    "bookingReference", booking.getBookingReference(),
                    "userName", booking.getUser().getName(),
                    "userEmail", booking.getUser().getEmail(),
                    "eventName", booking.getEvent().getEventName(),
                    "checkedIn", true
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "valid", false,
                    "message", "❌ " + e.getMessage()
            ));
        }
    }
}
