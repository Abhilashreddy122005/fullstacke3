package com.example.model;
import jakarta.validation.constraints.*;

public class User {
@NotBlank(message="Name is required")
private String name;

@Email(message="Invalid email")
private String email;

@Min(value=18, message="Age must be >=18")
private int age;

public String getName(){return name;}
public String getEmail(){return email;}
public int getAge(){return age;}
}