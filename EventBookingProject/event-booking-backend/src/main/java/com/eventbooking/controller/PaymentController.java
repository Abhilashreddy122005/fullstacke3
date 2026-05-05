package com.eventbooking.controller;

import com.eventbooking.dto.PaymentInitRequest;
import com.eventbooking.dto.PaymentVerifyRequest;
import com.eventbooking.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Step 1: Create Razorpay order.
     * Frontend receives orderId, amount, keyId to open checkout modal.
     */
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody PaymentInitRequest request,
                                          Authentication authentication) {
        Map<String, Object> order = paymentService.createOrder(request.getBookingId());
        return ResponseEntity.ok(order);
    }

    /**
     * Step 2: Verify payment signature after checkout completes.
     * Confirms the booking and marks payment as PAID.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@Valid @RequestBody PaymentVerifyRequest request) {
        Map<String, Object> result = paymentService.verifyPayment(request);
        return ResponseEntity.ok(result);
    }
}
