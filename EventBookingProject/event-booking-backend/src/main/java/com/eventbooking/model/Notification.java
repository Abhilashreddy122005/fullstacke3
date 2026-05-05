package com.eventbooking.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * In-app notification for users.
 * Replaces email-only notifications with persistent, readable alerts.
 */
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type = NotificationType.SYSTEM;

    public enum NotificationType {
        BOOKING_CONFIRMED, BOOKING_CANCELLED, EVENT_UPDATE,
        EVENT_APPROVED, EVENT_REJECTED, PAYMENT_CONFIRMED,
        CANCELLATION_ALERT, SYSTEM;
    }

    @Column(nullable = false)
    private boolean isRead = false;

    /** Optional link to related entity (e.g., /events/5 or /bookings/12) */
    private String actionUrl;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        if (type == null) type = NotificationType.SYSTEM;
    }

    // ── Getters & Setters ─────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public Notification() {}
}
