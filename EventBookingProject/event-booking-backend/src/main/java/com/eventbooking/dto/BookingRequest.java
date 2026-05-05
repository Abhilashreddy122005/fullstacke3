package com.eventbooking.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/**
 * Updated BookingRequest to support multi-attendee and team registration.
 */
public class BookingRequest {

    @NotNull(message = "Event ID is required")
    private Long eventId;

    @Min(value = 1, message = "At least 1 ticket is required")
    private int numberOfTickets;

    private Boolean accommodationRequired = false;

    private String customFieldResponses;

    // ── Team Booking ──────────────────────────────────────────────────
    private boolean teamBooking = false;

    @Size(max = 100, message = "Team name must not exceed 100 characters")
    private String teamName;

    // ── Attendees ─────────────────────────────────────────────────────
    /** Must match numberOfTickets in size */
    @Valid
    private List<AttendeeRequest> attendees;

    // ── Getters & Setters ─────────────────────────────────────────────
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public int getNumberOfTickets() { return numberOfTickets; }
    public void setNumberOfTickets(int numberOfTickets) { this.numberOfTickets = numberOfTickets; }

    public Boolean getAccommodationRequired() { return accommodationRequired; }
    public void setAccommodationRequired(Boolean accommodationRequired) { this.accommodationRequired = accommodationRequired; }

    public String getCustomFieldResponses() { return customFieldResponses; }
    public void setCustomFieldResponses(String customFieldResponses) { this.customFieldResponses = customFieldResponses; }

    public boolean isTeamBooking() { return teamBooking; }
    public void setTeamBooking(boolean teamBooking) { this.teamBooking = teamBooking; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public List<AttendeeRequest> getAttendees() { return attendees; }
    public void setAttendees(List<AttendeeRequest> attendees) { this.attendees = attendees; }
}
