package com.eventbooking.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Centralized exception handling for all REST controllers.
 * Returns a consistent error envelope: { status, error, message, timestamp, path }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Handles bean validation errors (@Valid failures) */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex, WebRequest request) {

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            fieldErrors.put(field, message);
        });

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "status", 400,
                "error", "Validation Failed",
                "fieldErrors", fieldErrors,
                "timestamp", LocalDateTime.now().toString(),
                "path", request.getDescription(false)
        ));
    }

    /** Handles application-level RuntimeExceptions */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(
            RuntimeException ex, WebRequest request) {

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "status", 400,
                "error", "Bad Request",
                "message", ex.getMessage() != null ? ex.getMessage() : "An error occurred",
                "timestamp", LocalDateTime.now().toString(),
                "path", request.getDescription(false)
        ));
    }

    /** Handles security / unauthorized access */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurityException(
            SecurityException ex, WebRequest request) {

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "status", 403,
                "error", "Forbidden",
                "message", ex.getMessage() != null ? ex.getMessage() : "Access denied",
                "timestamp", LocalDateTime.now().toString(),
                "path", request.getDescription(false)
        ));
    }

    /** Catch-all for unexpected exceptions */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(
            Exception ex, WebRequest request) {

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "status", 500,
                "error", "Internal Server Error",
                "message", "An unexpected error occurred. Please try again.",
                "timestamp", LocalDateTime.now().toString(),
                "path", request.getDescription(false)
        ));
    }
}
