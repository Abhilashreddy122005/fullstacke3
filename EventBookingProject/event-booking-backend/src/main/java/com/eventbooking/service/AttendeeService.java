package com.eventbooking.service;

import com.eventbooking.dto.AttendeeResponse;
import com.eventbooking.model.Attendee;
import com.eventbooking.model.Booking;
import com.eventbooking.repository.AttendeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AttendeeService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AttendeeService.class);

    private final AttendeeRepository attendeeRepository;
    private final QRCodeService qrCodeService;

    public AttendeeService(AttendeeRepository attendeeRepository, QRCodeService qrCodeService) {
        this.attendeeRepository = attendeeRepository;
        this.qrCodeService = qrCodeService;
    }

    public List<AttendeeResponse> getAttendeesByBooking(Long bookingId) {
        return attendeeRepository.findByBookingId(bookingId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<AttendeeResponse> getAttendeesByEvent(Long eventId) {
        return attendeeRepository.findByEventId(eventId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AttendeeResponse checkInByQR(String qrToken) {
        Attendee attendee = attendeeRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new RuntimeException("Invalid QR token: " + qrToken));

        Booking booking = attendee.getBooking();
        if (booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking has been cancelled.");
        }
        if (attendee.getAttendanceStatus() == Attendee.AttendanceStatus.CHECKED_IN) {
            throw new RuntimeException("Attendee " + attendee.getName() + " is already checked in.");
        }

        attendee.setAttendanceStatus(Attendee.AttendanceStatus.CHECKED_IN);
        attendee.setCheckInTime(LocalDateTime.now());
        attendeeRepository.save(attendee);

        log.info("Attendee checked in: {} (QR: {}) for event: {}",
                attendee.getName(), qrToken, booking.getEvent().getEventName());

        return toResponse(attendee);
    }

    @Transactional
    public AttendeeResponse checkOutByQR(String qrToken) {
        Attendee attendee = attendeeRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new RuntimeException("Invalid QR token: " + qrToken));

        if (attendee.getAttendanceStatus() != Attendee.AttendanceStatus.CHECKED_IN) {
            throw new RuntimeException("Attendee " + attendee.getName() + " is not currently checked in.");
        }

        attendee.setAttendanceStatus(Attendee.AttendanceStatus.CHECKED_OUT);
        attendee.setCheckOutTime(LocalDateTime.now());
        attendeeRepository.save(attendee);

        log.info("Attendee checked out: {} (QR: {})", attendee.getName(), qrToken);
        return toResponse(attendee);
    }

    @Transactional
    public AttendeeResponse forceAllow(Long attendeeId) {
        Attendee attendee = attendeeRepository.findById(attendeeId)
                .orElseThrow(() -> new RuntimeException("Attendee not found: " + attendeeId));

        attendee.setForceAllowed(true);
        attendee.setAttendanceStatus(Attendee.AttendanceStatus.CHECKED_IN);
        attendee.setCheckInTime(LocalDateTime.now());
        attendeeRepository.save(attendee);

        log.warn("Force-allowed entry for attendee: {} (id: {})", attendee.getName(), attendeeId);
        return toResponse(attendee);
    }

    @Transactional
    public AttendeeResponse updateFaceDescriptor(Long attendeeId, String faceDescriptor) {
        Attendee attendee = attendeeRepository.findById(attendeeId)
                .orElseThrow(() -> new RuntimeException("Attendee not found: " + attendeeId));
        attendee.setFaceDescriptor(faceDescriptor);
        attendeeRepository.save(attendee);
        return toResponse(attendee);
    }

    @Transactional
    public AttendeeResponse updateAttendee(Long attendeeId, java.util.Map<String, String> data) {
        Attendee attendee = attendeeRepository.findById(attendeeId)
                .orElseThrow(() -> new RuntimeException("Attendee not found: " + attendeeId));
        if (data.containsKey("name")) attendee.setName(data.get("name"));
        if (data.containsKey("email")) attendee.setEmail(data.get("email"));
        if (data.containsKey("phone")) attendee.setPhone(data.get("phone"));
        attendeeRepository.save(attendee);
        return toResponse(attendee);
    }

    public long countCheckedIn(Long eventId) {
        return attendeeRepository.countCheckedInByEventId(eventId);
    }

    // ── Mapper ─────────────────────────────────────────────────────────
    public AttendeeResponse toResponse(Attendee a) {
        AttendeeResponse r = new AttendeeResponse();
        r.setId(a.getId());
        r.setBookingId(a.getBooking() != null ? a.getBooking().getId() : null);
        r.setBookingReference(a.getBooking() != null ? a.getBooking().getBookingReference() : null);
        r.setName(a.getName());
        r.setEmail(a.getEmail());
        r.setPhone(a.getPhone());
        r.setTeamLeader(a.isTeamLeader());
        r.setQrToken(a.getQrToken());
        r.setQrCodeData(a.getQrCodeData());
        r.setAttendanceStatus(a.getAttendanceStatus() != null ? a.getAttendanceStatus().name() : null);
        r.setCheckInTime(a.getCheckInTime() != null ? a.getCheckInTime().toString() : null);
        r.setCheckOutTime(a.getCheckOutTime() != null ? a.getCheckOutTime().toString() : null);
        r.setFaceVerified(Boolean.TRUE.equals(a.getFaceVerified()));
        r.setForceAllowed(Boolean.TRUE.equals(a.getForceAllowed()));
        return r;
    }
}
