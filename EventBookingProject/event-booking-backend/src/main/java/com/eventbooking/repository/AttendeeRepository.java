package com.eventbooking.repository;

import com.eventbooking.model.Attendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendeeRepository extends JpaRepository<Attendee, Long> {

    List<Attendee> findByBookingId(Long bookingId);

    Optional<Attendee> findByQrToken(String qrToken);

    Optional<Attendee> findByEmail(String email);

    @Query("SELECT a FROM Attendee a WHERE a.booking.event.id = :eventId")
    List<Attendee> findByEventId(Long eventId);

    @Query("SELECT COUNT(a) FROM Attendee a WHERE a.booking.event.id = :eventId AND a.attendanceStatus = 'CHECKED_IN'")
    long countCheckedInByEventId(Long eventId);

    @Query("SELECT a FROM Attendee a WHERE a.booking.event.id = :eventId AND a.attendanceStatus = 'CHECKED_IN'")
    List<Attendee> findCheckedInByEventId(Long eventId);

    boolean existsByBookingIdAndEmail(Long bookingId, String email);
}
