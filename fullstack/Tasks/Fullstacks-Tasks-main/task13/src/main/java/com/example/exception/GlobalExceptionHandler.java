package com.example.exception;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.time.LocalDateTime;

@ControllerAdvice
public class GlobalExceptionHandler {

@ExceptionHandler(ResourceNotFoundException.class)
public ResponseEntity<ErrorDetails> handle(ResourceNotFoundException ex){
return new ResponseEntity<>(
new ErrorDetails(LocalDateTime.now(),ex.getMessage(),"Not Found"),
HttpStatus.NOT_FOUND);
}

@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ErrorDetails> handleValidation(MethodArgumentNotValidException ex){
String msg = ex.getBindingResult().getFieldError().getDefaultMessage();
return new ResponseEntity<>(
new ErrorDetails(LocalDateTime.now(),"Validation Failed",msg),
HttpStatus.BAD_REQUEST);
}
}