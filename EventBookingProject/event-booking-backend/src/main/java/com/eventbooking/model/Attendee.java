package com.eventbooking.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Represents a single individual attending an event under a booking.
 * Each attendee gets a unique QR code for check-in.
 * For team bookings, the team leader is identified by isTeamLeader = true.
 */
@Entity
@Table(name = "attendees")
public class Attendee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Booking booking;

    // ── Personal Details ──────────────────────────────────────────────
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    private String phone;

    // ── Team Role ────────────────────────────────────────────────────
    @Column(nullable = false)
    private boolean isTeamLeader = false;

    // ── QR Code ──────────────────────────────────────────────────────
    /** Unique token encoded in the QR — format: ATT-{UUID} */
    @Column(unique = true, nullable = false)
    private String qrToken;

    /** Base64-encoded QR code image */
    @Column(columnDefinition = "LONGTEXT")
    private String qrCodeData;

    // ── Attendance ────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus attendanceStatus = AttendanceStatus.PENDING;

    public enum AttendanceStatus {
        PENDING, CHECKED_IN, CHECKED_OUT, ABSENT;
    }

    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;

    // ── Face Recognition ─────────────────────────────────────────────
    /** Stored face descriptor (float[] serialized as JSON string) */
    @Column(columnDefinition = "LONGTEXT")
    private String faceDescriptor;

    /** Whether face was verified at check-in */
    private Boolean faceVerified = false;

    /** Admin override: force-allowed despite face mismatch */
    private Boolean forceAllowed = false;

    /** JSON string: { college, collegeId, ... } — attendee-level custom fields */
    @Column(columnDefinition = "LONGTEXT")
    private String customFields;

    // ── Timestamps ────────────────────────────────────────────────────
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        if (attendanceStatus == null) {
            attendanceStatus = AttendanceStatus.PENDING;
        }
    }

    // ── Getters & Setters ─────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public boolean isTeamLeader() { return isTeamLeader; }
    public void setTeamLeader(boolean teamLeader) { isTeamLeader = teamLeader; }

    public String getQrToken() { return qrToken; }
    public void setQrToken(String qrToken) { this.qrToken = qrToken; }

    public String getQrCodeData() { return qrCodeData; }
    public void setQrCodeData(String qrCodeData) { this.qrCodeData = qrCodeData; }

    public AttendanceStatus getAttendanceStatus() { return attendanceStatus; }
    public void setAttendanceStatus(AttendanceStatus attendanceStatus) { this.attendanceStatus = attendanceStatus; }

    public LocalDateTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalDateTime checkInTime) { this.checkInTime = checkInTime; }

    public LocalDateTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(LocalDateTime checkOutTime) { this.checkOutTime = checkOutTime; }

    public String getFaceDescriptor() { return faceDescriptor; }
    public void setFaceDescriptor(String faceDescriptor) { this.faceDescriptor = faceDescriptor; }

    public Boolean getFaceVerified() { return faceVerified; }
    public void setFaceVerified(Boolean faceVerified) { this.faceVerified = faceVerified; }

    public Boolean getForceAllowed() { return forceAllowed; }
    public void setForceAllowed(Boolean forceAllowed) { this.forceAllowed = forceAllowed; }

    public String getCustomFields() { return customFields; }
    public void setCustomFields(String customFields) { this.customFields = customFields; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public Attendee() {}
}
