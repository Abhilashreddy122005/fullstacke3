package com.eventbooking.repository;

import com.eventbooking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRoleAndApproved(User.Role role, boolean approved);
    List<User> findByRole(User.Role role);

    // Find eligible students for an event based on department and year restrictions
    @Query("SELECT u FROM User u WHERE u.role = 'STUDENT' AND u.approved = true " +
           "AND ((:depts) IS NULL OR u.department IN :depts) " +
           "AND ((:years) IS NULL OR u.yearOfStudy IN :years)")
    List<User> findEligibleStudents(@Param("depts") java.util.Collection<String> depts, @Param("years") java.util.Collection<Integer> years);

    // All active users (approved)
    @Query("SELECT u FROM User u WHERE u.approved = true AND u.role != 'ADMIN'")
    List<User> findAllActiveUsers();
}
