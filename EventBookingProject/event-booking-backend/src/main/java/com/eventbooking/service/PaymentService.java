package com.eventbooking.service;

import com.eventbooking.dto.PaymentVerifyRequest;
import com.eventbooking.model.Booking;
import com.eventbooking.repository.BookingRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;

@Service
public class PaymentService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PaymentService.class);

    @Value("${razorpay.key.id:YOUR_RAZORPAY_KEY_ID}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:YOUR_RAZORPAY_KEY_SECRET}")
    private String razorpayKeySecret;

    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

    public PaymentService(BookingRepository bookingRepository, BookingService bookingService) {
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
    }

    /**
     * Creates a Razorpay order for the given booking.
     * Returns orderId + amount for the frontend checkout.
     */
    @Transactional
    public Map<String, Object> createOrder(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        if (booking.getPaymentStatus() == Booking.PaymentStatus.PAID) {
            throw new RuntimeException("Booking is already paid.");
        }

        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            // Razorpay amount is in paise (multiply INR by 100)
            long amountInPaise = booking.getTotalAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .longValue();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", booking.getBookingReference());
            orderRequest.put("notes", new JSONObject()
                    .put("bookingId", bookingId)
                    .put("eventName", booking.getEvent().getEventName()));

            Order order = client.orders.create(orderRequest);
            String orderId = order.get("id");

            booking.setRazorpayOrderId(orderId);
            bookingRepository.save(booking);

            log.info("Razorpay order created: {} for booking: {}", orderId, bookingId);

            return Map.of(
                    "orderId", orderId,
                    "amount", amountInPaise,
                    "currency", "INR",
                    "keyId", razorpayKeyId,
                    "bookingId", bookingId,
                    "bookingReference", booking.getBookingReference(),
                    "eventName", booking.getEvent().getEventName()
            );
        } catch (Exception e) {
            log.error("Failed to create Razorpay order for booking {}: {}", bookingId, e.getMessage());
            throw new RuntimeException("Payment gateway error: " + e.getMessage());
        }
    }

    /**
     * Verifies Razorpay payment signature and confirms booking.
     */
    @Transactional
    public Map<String, Object> verifyPayment(PaymentVerifyRequest request) {
        // HMAC-SHA256 verification: signature = HMAC(orderId + "|" + paymentId, secret)
        String generatedSignature = generateSignature(
                request.getRazorpayOrderId() + "|" + request.getRazorpayPaymentId(),
                razorpayKeySecret
        );

        if (!generatedSignature.equals(request.getRazorpaySignature())) {
            log.warn("Payment signature mismatch for orderId: {}", request.getRazorpayOrderId());
            throw new RuntimeException("Payment verification failed: signature mismatch.");
        }

        Booking confirmed = bookingService.confirmPayment(request.getBookingId(), request.getRazorpayPaymentId());

        log.info("Payment verified for booking {} — paymentId: {}",
                request.getBookingId(), request.getRazorpayPaymentId());

        return Map.of(
                "success", true,
                "message", "Payment verified successfully.",
                "bookingReference", confirmed.getBookingReference(),
                "bookingId", confirmed.getId()
        );
    }

    private String generateSignature(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("HMAC generation failed", e);
        }
    }
}
