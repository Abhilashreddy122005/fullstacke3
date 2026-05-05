package com.eventbooking.controller;

import com.eventbooking.dto.AttendeeResponse;
import com.eventbooking.service.AttendeeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendees")
public class AttendeeController {

    private final AttendeeService attendeeService;

    public AttendeeController(AttendeeService attendeeService) {
        this.attendeeService = attendeeService;
    }

    /** Get all attendees for a booking */
    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<List<AttendeeResponse>> getByBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(attendeeService.getAttendeesByBooking(bookingId));
    }

    /** Get all attendees for an event (admin/coordinator) */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<AttendeeResponse>> getByEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(attendeeService.getAttendeesByEvent(eventId));
    }

    /** QR scan → check-in an attendee */
    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(@RequestBody Map<String, String> body) {
        String qrToken = body.get("qrToken");
        if (qrToken == null || qrToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "qrToken is required"));
        }
        AttendeeResponse response = attendeeService.checkInByQR(qrToken);
        return ResponseEntity.ok(response);
    }

    /** QR scan → check-out an attendee */
    @PostMapping("/checkout")
    public ResponseEntity<?> checkOut(@RequestBody Map<String, String> body) {
        String qrToken = body.get("qrToken");
        if (qrToken == null || qrToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "qrToken is required"));
        }
        AttendeeResponse response = attendeeService.checkOutByQR(qrToken);
        return ResponseEntity.ok(response);
    }

    /** Admin force-allow (bypass face mismatch) */
    @PostMapping("/{attendeeId}/force-allow")
    public ResponseEntity<?> forceAllow(@PathVariable Long attendeeId) {
        return ResponseEntity.ok(attendeeService.forceAllow(attendeeId));
    }

    /** Update basic attendee details */
    @PutMapping("/{attendeeId}")
    public ResponseEntity<?> updateAttendee(@PathVariable Long attendeeId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(attendeeService.updateAttendee(attendeeId, body));
    }

    /** Update face descriptor for an attendee */
    @PatchMapping("/{attendeeId}/face")
    public ResponseEntity<?> updateFace(@PathVariable Long attendeeId,
                                         @RequestBody Map<String, String> body) {
        String descriptor = body.get("faceDescriptor");
        return ResponseEntity.ok(attendeeService.updateFaceDescriptor(attendeeId, descriptor));
    }

    /** Count checked-in attendees for an event */
    @GetMapping("/event/{eventId}/checkin-count")
    public ResponseEntity<Map<String, Long>> checkinCount(@PathVariable Long eventId) {
        return ResponseEntity.ok(Map.of("checkedIn", attendeeService.countCheckedIn(eventId)));
    }
}
