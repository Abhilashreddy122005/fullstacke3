package com.eventbooking.dto;

/**
 * Clean response DTO for individual attendee — no circular references.
 */
public class AttendeeResponse {

    private Long id;
    private Long bookingId;
    private String bookingReference;
    private String name;
    private String email;
    private String phone;
    private boolean teamLeader;
    private String qrToken;
    private String qrCodeData;
    private String attendanceStatus;
    private String checkInTime;
    private String checkOutTime;
    private boolean faceVerified;
    private boolean forceAllowed;

    // ── Getters & Setters ─────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public boolean isTeamLeader() { return teamLeader; }
    public void setTeamLeader(boolean teamLeader) { this.teamLeader = teamLeader; }

    public String getQrToken() { return qrToken; }
    public void setQrToken(String qrToken) { this.qrToken = qrToken; }

    public String getQrCodeData() { return qrCodeData; }
    public void setQrCodeData(String qrCodeData) { this.qrCodeData = qrCodeData; }

    public String getAttendanceStatus() { return attendanceStatus; }
    public void setAttendanceStatus(String attendanceStatus) { this.attendanceStatus = attendanceStatus; }

    public String getCheckInTime() { return checkInTime; }
    public void setCheckInTime(String checkInTime) { this.checkInTime = checkInTime; }

    public String getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(String checkOutTime) { this.checkOutTime = checkOutTime; }

    public boolean isFaceVerified() { return faceVerified; }
    public void setFaceVerified(boolean faceVerified) { this.faceVerified = faceVerified; }

    public boolean isForceAllowed() { return forceAllowed; }
    public void setForceAllowed(boolean forceAllowed) { this.forceAllowed = forceAllowed; }
}
