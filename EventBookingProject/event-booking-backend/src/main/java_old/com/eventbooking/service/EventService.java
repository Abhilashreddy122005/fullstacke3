package com.eventbooking.service;

import com.eventbooking.model.Booking;
import com.eventbooking.model.Event;
import com.eventbooking.model.Event.EventStatus;
import com.eventbooking.model.User;
import com.eventbooking.repository.BookingRepository;
import com.eventbooking.repository.EventRepository;
import com.eventbooking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    // ── Create Event (saves as DRAFT unless explicitly set) ──────────
    @Transactional
    public Event createEvent(Event event) {
        if (event.getAvailableTickets() == null) {
            event.setAvailableTickets(event.getTotalTickets());
        }
        // Default to DRAFT if not specified
        if (event.getStatus() == null) {
            event.setStatus(EventStatus.DRAFT);
        }
        Event saved = eventRepository.save(event);
        log.info("Event saved [{}] status={}", saved.getEventName(), saved.getStatus());

        // Only notify users when event is published
        if (saved.getStatus() == EventStatus.PUBLISHED || saved.getStatus() == EventStatus.REGISTRATION_OPEN) {
            notifyEligibleUsers(saved);
        }
        return saved;
    }

    // ── Update Event ──────────────────────────────────────────────────
    @Transactional
    public Event updateEvent(Long id, Event updated) {
        Event existing = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        EventStatus oldStatus = existing.getStatus();

        existing.setEventName(updated.getEventName());
        existing.setDepartment(updated.getDepartment());
        existing.setOrganizingDepartments(updated.getOrganizingDepartments());
        existing.setStartDate(updated.getStartDate());
        existing.setEndDate(updated.getEndDate());
        existing.setTime(updated.getTime());
        existing.setVenue(updated.getVenue());
        existing.setPrice(updated.getPrice());
        existing.setDescription(updated.getDescription());
        existing.setImageUrl(updated.getImageUrl());
        existing.setTargetDepartments(updated.getTargetDepartments());
        existing.setTargetYears(updated.getTargetYears());
        existing.setNumberOfDays(updated.getNumberOfDays());
        existing.setAccommodationProvided(updated.getAccommodationProvided());
        existing.setCustomRegistrationFields(updated.getCustomRegistrationFields());
        existing.setRegistrationStartDate(updated.getRegistrationStartDate());
        existing.setRegistrationEndDate(updated.getRegistrationEndDate());

        // Handle status transitions
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }

        // Update ticket counts
        if (updated.getTotalTickets() != null) {
            int diff = updated.getTotalTickets() - existing.getTotalTickets();
            existing.setTotalTickets(updated.getTotalTickets());
            existing.setAvailableTickets(Math.max(0, existing.getAvailableTickets() + diff));
        }

        Event saved = eventRepository.save(existing);

        // Send notification email when transitioning to PUBLISHED
        if (oldStatus == EventStatus.DRAFT && saved.getStatus() == EventStatus.PUBLISHED) {
            notifyEligibleUsers(saved);
            log.info("Event published — notifications sent for '{}'", saved.getEventName());
        }
        // Send notification when registration opens
        if (oldStatus != EventStatus.REGISTRATION_OPEN && saved.getStatus() == EventStatus.REGISTRATION_OPEN) {
            notifyEligibleUsers(saved);
            log.info("Registration opened — notifications sent for '{}'", saved.getEventName());
        }

        return saved;
    }

    // ── Lifecycle Transitions ─────────────────────────────────────────

    @Transactional
    public Event publishEvent(Long id) {
        return changeStatus(id, EventStatus.PUBLISHED, true);
    }

    @Transactional
    public Event openRegistration(Long id) {
        return changeStatus(id, EventStatus.REGISTRATION_OPEN, true);
    }

    @Transactional
    public Event pauseRegistration(Long id) {
        return changeStatus(id, EventStatus.REGISTRATION_PAUSED, false);
    }

    @Transactional
    public Event closeRegistration(Long id) {
        return changeStatus(id, EventStatus.REGISTRATION_CLOSED, false);
    }

    @Transactional
    public Event postponeEvent(Long id) {
        return changeStatus(id, EventStatus.POSTPONED, false);
    }

    @Transactional
    public Event completeEvent(Long id) {
        return changeStatus(id, EventStatus.COMPLETED, false);
    }

    private Event changeStatus(Long id, EventStatus newStatus, boolean notifyUsers) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));
        EventStatus old = event.getStatus();
        event.setStatus(newStatus);
        Event saved = eventRepository.save(event);
        log.info("Event '{}' status: {} → {}", event.getEventName(), old, newStatus);
        if (notifyUsers) {
            notifyEligibleUsers(saved);
        }
        return saved;
    }

    // ── Cancel Event ──────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> cancelEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        event.setStatus(EventStatus.CANCELLED);
        eventRepository.save(event);

        List<Booking> bookings = bookingRepository.findByEventId(id);
        bookings.forEach(b -> b.setStatus(Booking.BookingStatus.CANCELLED));
        bookingRepository.saveAll(bookings);

        if (!bookings.isEmpty()) {
            emailService.sendEventCancellationEmails(event, bookings);
        }

        log.info("Event '{}' cancelled. {} bookings cancelled.", event.getEventName(), bookings.size());
        return Map.of(
                "message", "Event cancelled successfully.",
                "eventName", event.getEventName(),
                "affectedBookings", bookings.size()
        );
    }

    // ── Campaign ──────────────────────────────────────────────────────
    public Map<String, Object> sendCampaign(Long id, String customMessage,
                                             org.springframework.web.multipart.MultipartFile file) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new RuntimeException("Cannot send campaign for a cancelled event.");
        }

        byte[] fileBytes = null;
        String fileName = null;
        if (file != null && !file.isEmpty()) {
            try {
                fileBytes = file.getBytes();
                fileName = file.getOriginalFilename();
            } catch (Exception e) {
                throw new RuntimeException("Failed to read attached file: " + e.getMessage());
            }
        }

        List<User> eligible = getEligibleUsers(event);
        emailService.sendCampaignEmails(event, eligible, customMessage, fileBytes, fileName);
        log.info("Campaign triggered for '{}' → {} recipients", event.getEventName(), eligible.size());
        return Map.of(
                "message", "Campaign emails queued successfully!",
                "eventName", event.getEventName(),
                "recipientCount", eligible.size()
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────
    private void notifyEligibleUsers(Event event) {
        List<User> eligible = getEligibleUsers(event);
        if (!eligible.isEmpty()) {
            emailService.sendNewEventNotifications(event, eligible);
            log.info("Queued notifications for {} users for '{}'", eligible.size(), event.getEventName());
        }
    }

    public List<User> getEligibleUsers(Event event) {
        List<User> faculty = userRepository.findByRoleAndApproved(User.Role.FACULTY, true);
        java.util.Set<String> depts = (event.getTargetDepartments() == null || event.getTargetDepartments().isEmpty())
                ? null : event.getTargetDepartments();
        java.util.Set<Integer> years = (event.getTargetYears() == null || event.getTargetYears().isEmpty())
                ? null : event.getTargetYears();
        List<User> students = userRepository.findEligibleStudents(depts, years);
        faculty.addAll(students);
        return faculty;
    }
}
