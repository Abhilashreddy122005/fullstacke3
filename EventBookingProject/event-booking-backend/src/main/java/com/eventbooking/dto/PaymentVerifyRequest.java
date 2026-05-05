package com.eventbooking.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to verify a Razorpay payment signature after the frontend completes checkout.
 */
public class PaymentVerifyRequest {

    @NotBlank(message = "Razorpay Order ID is required")
    private String razorpayOrderId;

    @NotBlank(message = "Razorpay Payment ID is required")
    private String razorpayPaymentId;

    @NotBlank(message = "Razorpay Signature is required")
    private String razorpaySignature;

    private Long bookingId;

    // ── Getters & Setters ─────────────────────────────────────────────
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }

    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }

    public String getRazorpaySignature() { return razorpaySignature; }
    public void setRazorpaySignature(String razorpaySignature) { this.razorpaySignature = razorpaySignature; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }
}
