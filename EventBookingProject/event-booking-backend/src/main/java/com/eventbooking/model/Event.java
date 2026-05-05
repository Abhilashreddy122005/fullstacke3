package com.eventbooking.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "events")
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Core Identity ────────────────────────────────────────────────
    @Column(nullable = false)
    private String eventName;

    @Column(length = 200)
    @Size(max = 200, message = "Short description must not exceed 200 characters")
    private String shortDescription;

    @Column(columnDefinition = "LONGTEXT")
    private String fullDescription;

    /** @deprecated use shortDescription/fullDescription instead */
    @Column(length = 2000)
    private String description;

    @Column(columnDefinition = "LONGTEXT")
    private String imageUrl;

    // ── Event Type ───────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventType eventType = EventType.OTHER;

    public enum EventType {
        SEMINAR, WORKSHOP, HACKATHON, CULTURAL, OTHER;
    }

    // ── Location ─────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LocationType locationType = LocationType.OFFLINE;

    public enum LocationType {
        ONLINE, OFFLINE, HYBRID;
    }

    private String venue;

    // ── Dates & DateTime ─────────────────────────────────────────────
    /**
     * Full start timestamp (preferred over startDate + time)
     */
    private LocalDateTime startDateTime;

    /**
     * Full end timestamp (preferred over endDate)
     */
    private LocalDateTime endDateTime;

    /**
     * Auto-calculated from startDateTime to endDateTime (in days)
     */
    private Long durationInDays;

    /** Legacy date fields kept for backward compatibility */
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalTime time;
    private LocalTime endTime;
    private String customEventType;

    // ── Organizing Departments ────────────────────────────────────────
    private String department;

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

    /** Maximum number of participants allowed */
    private Integer maxParticipants;

    // ── Team Event Settings ───────────────────────────────────────────
    @Column(nullable = false)
    private Boolean isTeamEvent = false;

    /** Max members per team */
    private Integer maxTeamSize;

    /** Max number of teams allowed to register (null = unlimited) */
    private Integer maxTeams;

    // ── Logistics ────────────────────────────────────────────────────
    private Integer numberOfDays = 1;
    private Boolean accommodationProvided = false;
    private Boolean accommodationAvailable = false;
    @Column(precision = 10, scale = 2)
    private BigDecimal accommodationPrice = BigDecimal.ZERO;

    // ── Certificates ─────────────────────────────────────────────────
    @Column(nullable = false)
    private Boolean certificatesEnabled = false;

    @Column(columnDefinition = "LONGTEXT")
    private String customRegistrationFields;

    // ── Restrictions ─────────────────────────────────────────────────
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_target_departments", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "department")
    private Set<String> targetDepartments;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_target_years", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "year_of_study")
    private Set<Integer> targetYears;

    // ── Lifecycle Status ──────────────────────────────────────────────
    /**
     * Full event lifecycle (scalable FSM):
     *  DRAFT              → saved but not visible
     *  PENDING_APPROVAL   → faculty submitted, awaiting admin
     *  APPROVED           → admin approved, visible but registration not open
     *  REJECTED           → admin rejected
     *  PUBLISHED          → visible, registration not yet open
     *  REGISTRATION_OPEN  → students can book
     *  REGISTRATION_PAUSED → bookings temporarily halted
     *  REGISTRATION_CLOSED → booking window ended
     *  POSTPONED          → event deferred
     *  COMPLETED          → ran successfully
     *  CANCELLED          → cancelled (all bookings cancelled)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status = EventStatus.DRAFT;

    public enum EventStatus {
        DRAFT, PENDING_APPROVAL, APPROVED, REJECTED,
        PUBLISHED, REGISTRATION_OPEN, REGISTRATION_PAUSED,
        REGISTRATION_CLOSED, POSTPONED, COMPLETED, CANCELLED;
    }

    // ── Registration Window ───────────────────────────────────────────
    private LocalDate registrationStartDate;
    private LocalDate registrationEndDate;

    // ── Coordinators ──────────────────────────────────────────────────
    @ManyToOne
    @JoinColumn(name = "created_by_id")
    @JsonIgnoreProperties({"password", "bookings", "faceDescriptor"})
    private User createdBy;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "event_coordinators",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    @JsonIgnoreProperties({"password", "bookings", "faceDescriptor"})
    private Set<User> coordinators = new java.util.HashSet<>();

    // ── Expenses & Reporting ───────────────────────────────────────────
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_expenses", joinColumns = @JoinColumn(name = "event_id"))
    private java.util.List<ExpenseRecord> expenses = new java.util.ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_photos", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "photo_base64", columnDefinition = "LONGTEXT")
    private java.util.List<String> reportPhotos = new java.util.ArrayList<>();

    // ── Lifecycle Hooks ───────────────────────────────────────────────
    @PrePersist
    @PreUpdate
    public void prePersist() {
        if (availableTickets == null && totalTickets != null) {
            availableTickets = totalTickets;
        }
        if (status == null) {
            status = EventStatus.DRAFT;
        }
        if (eventType == null) {
            eventType = EventType.OTHER;
        }
        if (locationType == null) {
            locationType = LocationType.OFFLINE;
        }
        if (isTeamEvent == null) {
            isTeamEvent = false;
        }
        if (accommodationAvailable == null) {
            accommodationAvailable = false;
        }
        // Auto-calculate durationInDays
        if (startDateTime != null && endDateTime != null) {
            durationInDays = ChronoUnit.DAYS.between(startDateTime.toLocalDate(), endDateTime.toLocalDate());
            if (durationInDays < 0) durationInDays = 0L;
        } else if (startDate != null && endDate != null) {
            durationInDays = ChronoUnit.DAYS.between(startDate, endDate);
            if (durationInDays < 0) durationInDays = 0L;
        }
    }

    // ── Getters & Setters ─────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getFullDescription() { return fullDescription; }
    public void setFullDescription(String fullDescription) { this.fullDescription = fullDescription; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }

    public LocationType getLocationType() { return locationType; }
    public void setLocationType(LocationType locationType) { this.locationType = locationType; }

    public String getVenue() { return venue; }
    public void setVenue(String venue) { this.venue = venue; }

    public LocalDateTime getStartDateTime() { return startDateTime; }
    public void setStartDateTime(LocalDateTime startDateTime) { this.startDateTime = startDateTime; }

    public LocalDateTime getEndDateTime() { return endDateTime; }
    public void setEndDateTime(LocalDateTime endDateTime) { this.endDateTime = endDateTime; }

    public Long getDurationInDays() { return durationInDays; }
    public void setDurationInDays(Long durationInDays) { this.durationInDays = durationInDays; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public LocalTime getTime() { return time; }
    public void setTime(LocalTime time) { this.time = time; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getCustomEventType() { return customEventType; }
    public void setCustomEventType(String customEventType) { this.customEventType = customEventType; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Set<String> getOrganizingDepartments() { return organizingDepartments; }
    public void setOrganizingDepartments(Set<String> organizingDepartments) { this.organizingDepartments = organizingDepartments; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getTotalTickets() { return totalTickets; }
    public void setTotalTickets(Integer totalTickets) { this.totalTickets = totalTickets; }

    public Integer getAvailableTickets() { return availableTickets; }
    public void setAvailableTickets(Integer availableTickets) { this.availableTickets = availableTickets; }

    public Integer getMaxParticipants() { return maxParticipants; }
    public void setMaxParticipants(Integer maxParticipants) { this.maxParticipants = maxParticipants; }

    public Boolean getIsTeamEvent() { return isTeamEvent; }
    public void setIsTeamEvent(Boolean isTeamEvent) { this.isTeamEvent = isTeamEvent; }

    public Integer getMaxTeamSize() { return maxTeamSize; }
    public void setMaxTeamSize(Integer maxTeamSize) { this.maxTeamSize = maxTeamSize; }

    public Integer getMaxTeams() { return maxTeams; }
    public void setMaxTeams(Integer maxTeams) { this.maxTeams = maxTeams; }

    public Integer getNumberOfDays() { return numberOfDays; }
    public void setNumberOfDays(Integer numberOfDays) { this.numberOfDays = numberOfDays; }

    public Boolean getAccommodationProvided() { return accommodationProvided; }
    public void setAccommodationProvided(Boolean accommodationProvided) { this.accommodationProvided = accommodationProvided; }

    public Boolean getAccommodationAvailable() { return accommodationAvailable; }
    public void setAccommodationAvailable(Boolean accommodationAvailable) { this.accommodationAvailable = accommodationAvailable; }

    public BigDecimal getAccommodationPrice() { return accommodationPrice; }
    public void setAccommodationPrice(BigDecimal accommodationPrice) { this.accommodationPrice = accommodationPrice; }

    public String getCustomRegistrationFields() { return customRegistrationFields; }
    public void setCustomRegistrationFields(String customRegistrationFields) { this.customRegistrationFields = customRegistrationFields; }

    public Set<String> getTargetDepartments() { return targetDepartments; }
    public void setTargetDepartments(Set<String> targetDepartments) { this.targetDepartments = targetDepartments; }

    public Set<Integer> getTargetYears() { return targetYears; }
    public void setTargetYears(Set<Integer> targetYears) { this.targetYears = targetYears; }

    public EventStatus getStatus() { return status; }
    public void setStatus(EventStatus status) { this.status = status; }

    public LocalDate getRegistrationStartDate() { return registrationStartDate; }
    public void setRegistrationStartDate(LocalDate registrationStartDate) { this.registrationStartDate = registrationStartDate; }

    public LocalDate getRegistrationEndDate() { return registrationEndDate; }
    public void setRegistrationEndDate(LocalDate registrationEndDate) { this.registrationEndDate = registrationEndDate; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public Set<User> getCoordinators() { return coordinators; }
    public void setCoordinators(Set<User> coordinators) { this.coordinators = coordinators; }

    public java.util.List<ExpenseRecord> getExpenses() { return expenses; }
    public void setExpenses(java.util.List<ExpenseRecord> expenses) { this.expenses = expenses; }

    public java.util.List<String> getReportPhotos() { return reportPhotos; }
    public void setReportPhotos(java.util.List<String> reportPhotos) { this.reportPhotos = reportPhotos; }

    public Boolean getCertificatesEnabled() { return certificatesEnabled != null && certificatesEnabled; }
    public void setCertificatesEnabled(Boolean certificatesEnabled) { this.certificatesEnabled = certificatesEnabled; }

    public Event() {}
}
