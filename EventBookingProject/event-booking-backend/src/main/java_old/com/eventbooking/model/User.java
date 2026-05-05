package com.eventbooking.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name is required")
    private String name;

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.STUDENT;

    private String department;

    // Student year (1=1st year, 2=2nd year, 3=3rd year, 4=4th year)
    private Integer yearOfStudy;

    // STUDENT & ADMIN auto-approved; FACULTY needs admin approval
    @Column(nullable = false)
    private boolean approved = true;

    @Column(columnDefinition = "LONGTEXT")
    private String faceDescriptor;

    public enum Role {
        ADMIN, FACULTY, STUDENT
    }
}
