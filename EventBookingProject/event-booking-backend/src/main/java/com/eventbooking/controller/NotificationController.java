package com.eventbooking.controller;

import com.eventbooking.model.Notification;
import com.eventbooking.model.User;
import com.eventbooking.repository.UserRepository;
import com.eventbooking.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    private Long resolveUserId(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"))
                .getId();
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getAll(Authentication auth) {
        return ResponseEntity.ok(notificationService.getAll(resolveUserId(auth)));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnread(Authentication auth) {
        return ResponseEntity.ok(notificationService.getUnread(resolveUserId(auth)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication auth) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(resolveUserId(auth))));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id, Authentication auth) {
        notificationService.markRead(id, resolveUserId(auth));
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        notificationService.markAllRead(resolveUserId(auth));
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }
}
