package com.eventbooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false)
    private Integer numberOfTickets;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private LocalDateTime bookingDate;

    @Column(unique = true, nullable = false)
    private String bookingReference;

    @Column(columnDefinition = "LONGTEXT")
    private String qrCodeData;

    @Column(columnDefinition = "LONGTEXT")
    private String customFieldResponses;

    @Column(nullable = false)
    private boolean accommodationRequired = false;

    @Column(nullable = false)
    private boolean checkedIn = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status = BookingStatus.CONFIRMED;

    public enum BookingStatus {
        CONFIRMED, CANCELLED
    }

    @PrePersist
    public void prePersist() {
        if (bookingDate == null) {
            bookingDate = LocalDateTime.now();
        }
    }
}
