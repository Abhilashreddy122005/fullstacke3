package com.eventbooking.service;

import com.eventbooking.dto.AuthResponse;
import com.eventbooking.dto.LoginRequest;
import com.eventbooking.dto.RegisterRequest;
import com.eventbooking.model.User;
import com.eventbooking.repository.UserRepository;
import com.eventbooking.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsServiceImpl userDetailsService;
    private final EmailService emailService;


    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered: " + request.getEmail());
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setDepartment(request.getDepartment());
        user.setYearOfStudy(request.getYearOfStudy());
        user.setFaceDescriptor(request.getFaceDescriptor());

        if ("FACULTY".equalsIgnoreCase(request.getRole())) {
            user.setRole(User.Role.FACULTY);
            user.setApproved(false);
            User saved = userRepository.save(user);
            log.info("Faculty registered (PENDING): {}", saved.getEmail());

            // Send pending email to faculty
            emailService.sendFacultyPendingEmail(saved);

            return AuthResponse.builder()
                    .userId(saved.getId()).name(saved.getName())
                    .email(saved.getEmail()).role(saved.getRole().name())
                    .department(saved.getDepartment()).pending(true)
                    .message("Your faculty account is pending admin approval.")
                    .build();

        } else {
            user.setRole(User.Role.STUDENT);
            user.setApproved(true);
            User saved = userRepository.save(user);
            log.info("Student registered: {}", saved.getEmail());

            // Send welcome email
            emailService.sendWelcomeEmail(saved);

            UserDetails userDetails = userDetailsService.loadUserByUsername(saved.getEmail());
            String token = jwtUtil.generateToken(userDetails, saved.getId(), saved.getRole().name());

            return AuthResponse.builder()
                    .token(token).userId(saved.getId()).name(saved.getName())
                    .email(saved.getEmail()).role(saved.getRole().name())
                    .department(saved.getDepartment()).pending(false)
                    .message("Registration successful! Welcome to EventSphere.")
                    .build();
        }
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found with this email."));

        if (user.getRole() == User.Role.FACULTY && !user.isApproved()) {
            throw new RuntimeException("PENDING_APPROVAL: Your faculty account is awaiting admin approval.");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails, user.getId(), user.getRole().name());

        return AuthResponse.builder()
                .token(token).userId(user.getId()).name(user.getName())
                .email(user.getEmail()).role(user.getRole().name())
                .department(user.getDepartment()).pending(false)
                .message("Login successful!")
                .build();
    }
}
