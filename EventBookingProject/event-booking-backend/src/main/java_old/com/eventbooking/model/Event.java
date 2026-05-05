package com.eventbooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Core Identity ────────────────────────────────────────────────
    @Column(nullable = false)
    private String eventName;

    @Column(length = 2000)
    private String description;

    private String imageUrl;

    // ── Dates & Times ────────────────────────────────────────────────
    /** Start date of the event */
    private LocalDate startDate;

    /** End date of the event (null = single-day event) */
    private LocalDate endDate;

    /** Start time */
    private LocalTime time;

    // ── Location ─────────────────────────────────────────────────────
    private String venue;

    // ── Organizing Departments ────────────────────────────────────────
    /** Primary/lead organizing department */
    private String department;

    /**
     * All co-organizing departments (multi-select, scalable).
     * Example: ["CSE", "IT", "ECE"] or ["External Club"] for custom entries.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_organizing_depts", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "department")
    private Set<String> organizingDepartments;

    // ── Tickets & Pricing ─────────────────────────────────────────────
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer totalTickets;

    @Column(nullable = false)
    private Integer availableTickets;

    // ── Restrictions ─────────────────────────────────────────────────
    /** If empty → open to all departments */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_target_departments", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "department")
    private Set<String> targetDepartments;

    /** If empty → open to all years */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_target_years", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "year_of_study")
    private Set<Integer> targetYears;

    // ── Logistics ────────────────────────────────────────────────────
    private Integer numberOfDays = 1;
    private Boolean accommodationProvided = false;

    /** JSON array of custom registration fields:
     *  [{"name":"T-Shirt Size","type":"select","options":["S","M","L"],"required":true}] */
    @Column(columnDefinition = "LONGTEXT")
    private String customRegistrationFields;

    // ── Lifecycle Status ──────────────────────────────────────────────
    /**
     * Full event lifecycle (scalable FSM):
     *  DRAFT       → saved but not visible to students
     *  PUBLISHED   → visible, registration not yet open
     *  REGISTRATION_OPEN   → students can book
     *  REGISTRATION_PAUSED → bookings temporarily halted
     *  REGISTRATION_CLOSED → booking window ended
     *  POSTPONED   → event held/deferred (notified)
     *  COMPLETED   → event ran successfully
     *  CANCELLED   → event cancelled (all bookings cancelled)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status = EventStatus.DRAFT;

    public enum EventStatus {
        DRAFT, PUBLISHED, REGISTRATION_OPEN, REGISTRATION_PAUSED,
        REGISTRATION_CLOSED, POSTPONED, COMPLETED, CANCELLED
    }

    // ── Registration Window ───────────────────────────────────────────
    private LocalDate registrationStartDate;
    private LocalDate registrationEndDate;

    @PrePersist
    public void prePersist() {
        if (availableTickets == null && totalTickets != null) {
            availableTickets = totalTickets;
        }
        if (status == null) {
            status = EventStatus.DRAFT;
        }
    }
}
