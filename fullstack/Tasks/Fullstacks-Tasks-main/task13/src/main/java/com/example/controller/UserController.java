package com.example.controller;
import com.example.model.User;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
public class UserController {
@PostMapping("/register")
public String register(@Valid @RequestBody User user){
return "User registered";
}
}