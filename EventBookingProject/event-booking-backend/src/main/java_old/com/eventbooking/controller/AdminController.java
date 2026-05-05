package com.eventbooking.controller;

import com.eventbooking.dto.AnnouncementRequest;
import com.eventbooking.model.User;
import com.eventbooking.repository.BookingRepository;
import com.eventbooking.repository.EventRepository;
import com.eventbooking.repository.UserRepository;
import com.eventbooking.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final EventRepository eventRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    // ── Stats ──────────────────────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEvents", eventRepository.count());
        stats.put("totalBookings", bookingRepository.count());
        stats.put("totalUsers", userRepository.count());
        stats.put("totalRevenue", bookingRepository.getTotalRevenue() != null ? bookingRepository.getTotalRevenue() : BigDecimal.ZERO);
        stats.put("totalTicketsSold", bookingRepository.getTotalTicketsSold() != null ? bookingRepository.getTotalTicketsSold() : 0L);
        stats.put("pendingFaculty", userRepository.findByRoleAndApproved(User.Role.FACULTY, false).size());
        return ResponseEntity.ok(stats);
    }

    // ── Pending Faculty ────────────────────────────────────────────────
    @GetMapping("/faculty/pending")
    public ResponseEntity<List<User>> getPendingFaculty() {
        List<User> pending = userRepository.findByRoleAndApproved(User.Role.FACULTY, false);
        pending.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(pending);
    }

    // ── Approve Faculty ────────────────────────────────────────────────
    @PostMapping("/faculty/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveFaculty(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        user.setApproved(true);
        userRepository.save(user);

        // Notify faculty they've been approved
        emailService.sendFacultyApprovedEmail(user);

        return ResponseEntity.ok(Map.of(
                "message", "Faculty approved and notified by email.",
                "name", user.getName(), "email", user.getEmail()
        ));
    }

    // ── Reject Faculty ─────────────────────────────────────────────────
    @DeleteMapping("/faculty/{id}/reject")
    public ResponseEntity<Map<String, String>> rejectFaculty(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        userRepository.delete(user);
        return ResponseEntity.ok(Map.of("message", "Faculty request rejected and removed."));
    }

    // ── All Faculty (approved) ─────────────────────────────────────────
    @GetMapping("/faculty")
    public ResponseEntity<List<User>> getAllFaculty() {
        List<User> faculty = userRepository.findByRoleAndApproved(User.Role.FACULTY, true);
        faculty.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(faculty);
    }

    // ── All Bookings ───────────────────────────────────────────────────
    @GetMapping("/bookings")
    public ResponseEntity<?> getAllBookings() {
        return ResponseEntity.ok(bookingRepository.findAll());
    }

    // ── Send Announcement ────────────────────────────────────────────
    @PostMapping("/announcements")
    public ResponseEntity<Map<String, Object>> sendAnnouncement(@RequestBody AnnouncementRequest req) {
        // Get eligible users based on optional filters
        List<User> users = userRepository.findEligibleStudents(req.getTargetDepartment(), req.getTargetYear());

        // Also include approved faculty
        List<User> faculty = userRepository.findByRoleAndApproved(User.Role.FACULTY, true);
        users.addAll(faculty);

        // Remove duplicates by email
        List<User> unique = users.stream()
                .filter(u -> u.getEmail() != null)
                .distinct().toList();

        emailService.sendAnnouncementEmails(unique, req.getSubject(), req.getMessage());

        return ResponseEntity.ok(Map.of(
                "message", "Announcement queued for " + unique.size() + " recipients.",
                "recipientCount", unique.size()
        ));
    }
}
