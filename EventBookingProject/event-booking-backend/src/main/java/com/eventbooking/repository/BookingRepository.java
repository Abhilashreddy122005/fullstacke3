package com.eventbooking.repository;

import com.eventbooking.model.Booking;
import com.eventbooking.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserId(Long userId);
    List<Booking> findByEvent(Event event);
    List<Booking> findByEventId(Long eventId);
    Optional<Booking> findByBookingReference(String bookingReference);

    // Duplicate registration check — returns true if user already has a non-cancelled booking for this event
    boolean existsByUserIdAndEventIdAndStatusNot(Long userId, Long eventId, Booking.BookingStatus status);

    // Count non-cancelled bookings for an event (useful for team limits)
    long countByEventIdAndStatusNot(Long eventId, Booking.BookingStatus status);

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) FROM Booking b WHERE b.status = 'CONFIRMED'")
    BigDecimal getTotalRevenue();

    @Query("SELECT COALESCE(SUM(b.numberOfTickets), 0) FROM Booking b WHERE b.status = 'CONFIRMED'")
    Long getTotalTicketsSold();

}
