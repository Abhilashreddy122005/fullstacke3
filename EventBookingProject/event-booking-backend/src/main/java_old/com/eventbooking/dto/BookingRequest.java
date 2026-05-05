package com.eventbooking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookingRequest {

    @NotNull(message = "Event ID is required")
    private Long eventId;

    @NotNull(message = "Number of tickets is required")
    @Min(value = 1, message = "At least 1 ticket must be booked")
    private Integer numberOfTickets;

    private Boolean accommodationRequired = false;

    // JSON string containing answers to custom fields
    private String customFieldResponses;
}
