package com.example.security;
import io.jsonwebtoken.*;
import java.util.*;

public class JwtUtil {
static String SECRET="secret123";

public static String generateToken(String user){
return Jwts.builder()
.setSubject(user)
.setIssuedAt(new Date())
.setExpiration(new Date(System.currentTimeMillis()+3600000))
.signWith(SignatureAlgorithm.HS256,SECRET)
.compact();
}
}