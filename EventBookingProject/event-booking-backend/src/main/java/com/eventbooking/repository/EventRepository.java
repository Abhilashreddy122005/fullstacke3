package com.eventbooking.repository;

import com.eventbooking.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    // Events visible to students: PUBLISHED, REGISTRATION_OPEN, REGISTRATION_PAUSED, REGISTRATION_CLOSED
    @Query("SELECT e FROM Event e WHERE e.status IN :statuses")
    List<Event> findByStatusIn(@Param("statuses") Collection<Event.EventStatus> statuses);

    // All events with a given status
    List<Event> findByStatus(Event.EventStatus status);

    // Filter visible events by department
    @Query("SELECT e FROM Event e WHERE e.status IN :statuses AND LOWER(e.department) = LOWER(:department)")
    List<Event> findVisibleByDepartment(@Param("statuses") Collection<Event.EventStatus> statuses,
                                        @Param("department") String department);

    // Search visible events by name or department
    @Query("SELECT e FROM Event e WHERE e.status IN :statuses AND " +
           "(LOWER(e.eventName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(e.department) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Event> findVisibleBySearch(@Param("statuses") Collection<Event.EventStatus> statuses,
                                    @Param("search") String search);

    // Legacy single-status queries (kept for backward compat with admin views)
    List<Event> findByStatusAndDepartmentIgnoreCase(Event.EventStatus status, String department);

    @Query("SELECT e FROM Event e WHERE e.status = :status AND " +
           "(LOWER(e.eventName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(e.department) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Event> findByStatusAndSearch(@Param("status") Event.EventStatus status,
                                      @Param("search") String search);
}
