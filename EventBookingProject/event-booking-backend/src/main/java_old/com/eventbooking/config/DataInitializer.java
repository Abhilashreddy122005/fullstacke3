package com.eventbooking.config;

import com.eventbooking.model.User;
import com.eventbooking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdmin();
        printStartupInfo();
    }

    private void seedAdmin() {
        String adminEmail = "admin@veltech.edu.in";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = new User();
            admin.setName("Admin");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode("Admin@123"));
            admin.setRole(User.Role.ADMIN);
            admin.setDepartment("Administration");
            admin.setApproved(true);
            userRepository.save(admin);
            log.info("✅ Default ADMIN created → admin@veltech.edu.in / Admin@123");
        } else {
            log.info("✅ Admin account already exists");
        }
    }

    private void printStartupInfo() {
        log.info("============================================================");
        log.info("  ⚡ EventSphere — Started Successfully!");
        log.info("------------------------------------------------------------");
        log.info("  🔑 ADMIN Login   → admin@veltech.edu.in / Admin@123");
        log.info("  👨‍🎓 STUDENT      → Self-register, instant access");
        log.info("  👩‍🏫 FACULTY      → Self-register, needs admin approval");
        log.info("  🌐 Frontend      → http://localhost:5173");
        log.info("  🔧 Backend API   → http://localhost:8080");
        log.info("============================================================");
    }
}
