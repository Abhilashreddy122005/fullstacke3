package com.eventbooking.controller;

import com.eventbooking.dto.CampaignRequest;
import com.eventbooking.model.Event;
import com.eventbooking.repository.EventRepository;
import com.eventbooking.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventRepository eventRepository;
    private final EventService eventService;

    /**
     * GET /api/events
     * Public endpoint — returns student-visible events.
     * Visible statuses: PUBLISHED, REGISTRATION_OPEN, REGISTRATION_PAUSED, REGISTRATION_CLOSED
     */
    @GetMapping
    public ResponseEntity<List<Event>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department) {

        var visibleStatuses = java.util.List.of(
            Event.EventStatus.PUBLISHED,
            Event.EventStatus.REGISTRATION_OPEN,
            Event.EventStatus.REGISTRATION_PAUSED,
            Event.EventStatus.REGISTRATION_CLOSED
        );

        List<Event> events;
        if (search != null && !search.isBlank()) {
            events = eventRepository.findVisibleBySearch(visibleStatuses, search.trim());
        } else if (department != null && !department.isBlank() && !department.equalsIgnoreCase("All")) {
            events = eventRepository.findVisibleByDepartment(visibleStatuses, department.trim());
        } else {
            events = eventRepository.findByStatusIn(visibleStatuses);
        }

        return ResponseEntity.ok(events);
    }

    /**
     * GET /api/events/all
     * Admin/Faculty endpoint — returns ALL events including CANCELLED.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Event>> getAllIncludingCancelled() {
        return ResponseEntity.ok(eventRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getById(@PathVariable Long id) {
        return eventRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Event> create(@RequestBody Event event) {
        return ResponseEntity.ok(eventService.createEvent(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Event> update(@PathVariable Long id, @RequestBody Event event) {
        return ResponseEntity.ok(eventService.updateEvent(id, event));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        eventRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Cancel event and notify all bookers ──────────────────────────────────
    @PostMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.cancelEvent(id));
    }

    // ── Lifecycle management endpoints ────────────────────────────────────────
    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publish(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.publishEvent(id));
    }

    @PostMapping("/{id}/open-registration")
    public ResponseEntity<?> openRegistration(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.openRegistration(id));
    }

    @PostMapping("/{id}/pause-registration")
    public ResponseEntity<?> pauseRegistration(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.pauseRegistration(id));
    }

    @PostMapping("/{id}/close-registration")
    public ResponseEntity<?> closeRegistration(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.closeRegistration(id));
    }

    @PostMapping("/{id}/postpone")
    public ResponseEntity<?> postpone(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.postponeEvent(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> complete(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.completeEvent(id));
    }

    // ── Send campaign emails to eligible users ────────────────────────────────
    @PostMapping(value = "/{id}/campaign", consumes = {"multipart/form-data"})
    public ResponseEntity<Map<String, Object>> campaign(
            @PathVariable Long id,
            @RequestParam(required = false) String customMessage,
            @RequestParam(required = false) org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(eventService.sendCampaign(id, customMessage, file));
    }
}
