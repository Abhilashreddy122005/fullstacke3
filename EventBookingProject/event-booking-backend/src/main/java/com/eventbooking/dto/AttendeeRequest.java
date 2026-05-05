package com.eventbooking.dto;

import jakarta.validation.constraints.*;

/**
 * Individual attendee details required during booking.
 * One AttendeeRequest per ticket purchased.
 */
public class AttendeeRequest {

    @NotBlank(message = "Attendee name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @NotBlank(message = "Attendee email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be 10 digits")
    private String phone;

    /** True if this attendee is the team leader */
    private boolean teamLeader = false;

    /** Optional: face descriptor captured during booking (JSON array of floats) */
    private String faceDescriptor;

    /** Optional: JSON with college, collegeId, and other attendee-level custom fields */
    private String customFields;

    // ── Getters & Setters ─────────────────────────────────────────────
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public boolean isTeamLeader() { return teamLeader; }
    public void setTeamLeader(boolean teamLeader) { this.teamLeader = teamLeader; }

    public String getFaceDescriptor() { return faceDescriptor; }
    public void setFaceDescriptor(String faceDescriptor) { this.faceDescriptor = faceDescriptor; }

    public String getCustomFields() { return customFields; }
    public void setCustomFields(String customFields) { this.customFields = customFields; }
}
