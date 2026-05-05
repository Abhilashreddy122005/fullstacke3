package com.eventbooking.dto;

/**
 * Payload to initiate a Razorpay payment order.
 */
public class PaymentInitRequest {

    private Long bookingId;

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }
}
