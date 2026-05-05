package com.eventbooking.service;

import com.eventbooking.model.Notification;
import com.eventbooking.model.User;
import com.eventbooking.repository.NotificationRepository;
import com.eventbooking.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Notification send(Long userId, String title, String message,
                              Notification.NotificationType type, String actionUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setMessage(message);
        n.setType(type);
        n.setActionUrl(actionUrl);
        n.setRead(false);

        Notification saved = notificationRepository.save(n);
        log.debug("Notification sent to user {}: {}", userId, title);
        return saved;
    }

    public List<Notification> getAll(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnread(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markRead(Long notificationId, Long userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        if (!n.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        n.setRead(true);
        notificationRepository.save(n);
    }

    @Transactional
    public void markAllRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    // ── Convenience methods for common notification types ──────────────
    public void notifyBookingConfirmed(Long userId, String eventName, String bookingRef) {
        send(userId,
            "Booking Confirmed! 🎉",
            "Your registration for \"" + eventName + "\" is confirmed. Ref: " + bookingRef,
            Notification.NotificationType.BOOKING_CONFIRMED,
            "/my-bookings");
    }

    public void notifyBookingCancelled(Long userId, String eventName, String bookingRef) {
        send(userId,
            "Booking Cancelled",
            "Your registration for \"" + eventName + "\" (Ref: " + bookingRef + ") has been cancelled.",
            Notification.NotificationType.BOOKING_CANCELLED,
            "/my-bookings");
    }

    public void notifyEventApproved(Long userId, String eventName) {
        send(userId,
            "Event Approved ✅",
            "Your event \"" + eventName + "\" has been approved and is now visible to students.",
            Notification.NotificationType.EVENT_APPROVED,
            "/events");
    }

    public void notifyEventRejected(Long userId, String eventName, String reason) {
        send(userId,
            "Event Rejected ❌",
            "Your event \"" + eventName + "\" was rejected. Reason: " + reason,
            Notification.NotificationType.EVENT_REJECTED,
            "/events");
    }

    public void notifyPaymentConfirmed(Long userId, String eventName, String bookingRef) {
        send(userId,
            "Payment Confirmed 💳",
            "Payment received for \"" + eventName + "\". Booking Ref: " + bookingRef,
            Notification.NotificationType.PAYMENT_CONFIRMED,
            "/my-bookings");
    }
}
