package com.eventbooking.controller;

import com.eventbooking.model.User;
import com.eventbooking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @PutMapping("/{id}/face")
    public ResponseEntity<?> updateFaceDescriptor(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newDescriptor = body.get("faceDescriptor");
        if (newDescriptor == null || newDescriptor.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Face descriptor is required"));
        }

        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setFaceDescriptor(newDescriptor);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Face profile updated successfully"));
    }
}
