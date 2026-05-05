package com.eventbooking.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"imageUrl", "reportPhotos"})
    private Event event;

    // ── Ticket Info ───────────────────────────────────────────────────
    @Column(nullable = false)
    private Integer numberOfTickets;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private LocalDateTime bookingDate;

    @Column(unique = true, nullable = false)
    private String bookingReference;

    // ── Team Booking ──────────────────────────────────────────────────
    @Column(nullable = false)
    private boolean isTeamBooking = false;

    /** Team name (only for team events) */
    private String teamName;

    // ── Legacy QR (kept for backward compat) ─────────────────────────
    @Column(columnDefinition = "LONGTEXT")
    private String qrCodeData;

    // ── Custom Fields ─────────────────────────────────────────────────
    @Column(columnDefinition = "LONGTEXT")
    private String customFieldResponses;

    // ── Logistics ─────────────────────────────────────────────────────
    @Column(nullable = false)
    private boolean accommodationRequired = false;

    /** @deprecated use attendees list for per-attendee check-in */
    @Column(nullable = false)
    private boolean checkedIn = false;

    // ── Payment ───────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    public enum PaymentStatus {
        PENDING, PAID, REFUNDED, FAILED, FREE;
    }

    /** Razorpay Order ID */
    private String razorpayOrderId;

    /** Razorpay Payment ID (after successful payment) */
    private String razorpayPaymentId;

    /** Amount actually paid (in INR paise for Razorpay) */
    @Column(precision = 10, scale = 2)
    private BigDecimal paidAmount;

    // ── Booking Status ────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private BookingStatus status = BookingStatus.CONFIRMED;

    public enum BookingStatus {
        PENDING_PAYMENT, CONFIRMED, CANCELLED;
    }

    // ── Attendees (One booking → many attendees) ──────────────────────
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Attendee> attendees = new ArrayList<>();

    // ── Timestamps ────────────────────────────────────────────────────
    @PrePersist
    public void prePersist() {
        if (bookingDate == null) {
            bookingDate = LocalDateTime.now();
        }
        if (paymentStatus == null) {
            paymentStatus = PaymentStatus.PENDING;
        }
        if (status == null) {
            status = BookingStatus.CONFIRMED;
        }
    }

    // ── Getters & Setters ─────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }

    public Integer getNumberOfTickets() { return numberOfTickets; }
    public void setNumberOfTickets(Integer numberOfTickets) { this.numberOfTickets = numberOfTickets; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public LocalDateTime getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDateTime bookingDate) { this.bookingDate = bookingDate; }

    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

    public boolean isTeamBooking() { return isTeamBooking; }
    public void setTeamBooking(boolean teamBooking) { isTeamBooking = teamBooking; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public String getQrCodeData() { return qrCodeData; }
    public void setQrCodeData(String qrCodeData) { this.qrCodeData = qrCodeData; }

    public String getCustomFieldResponses() { return customFieldResponses; }
    public void setCustomFieldResponses(String customFieldResponses) { this.customFieldResponses = customFieldResponses; }

    public boolean isAccommodationRequired() { return accommodationRequired; }
    public void setAccommodationRequired(boolean accommodationRequired) { this.accommodationRequired = accommodationRequired; }

    public boolean isCheckedIn() { return checkedIn; }
    public void setCheckedIn(boolean checkedIn) { this.checkedIn = checkedIn; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }

    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }

    public List<Attendee> getAttendees() { return attendees; }
    public void setAttendees(List<Attendee> attendees) { this.attendees = attendees; }

    public Booking() {}
}
