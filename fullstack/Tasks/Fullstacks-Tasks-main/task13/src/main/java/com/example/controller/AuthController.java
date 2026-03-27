package com.example.controller;
import org.springframework.web.bind.annotation.*;
import com.example.security.JwtUtil;

@RestController
public class AuthController {
@PostMapping("/login")
public String login(@RequestParam String username,@RequestParam String password){
if(username.equals("admin") && password.equals("admin")){
return JwtUtil.generateToken(username);
}
return "Invalid";
}
}