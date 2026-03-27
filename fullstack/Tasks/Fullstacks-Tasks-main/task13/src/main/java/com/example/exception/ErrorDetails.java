package com.example.exception;
import java.time.LocalDateTime;

public class ErrorDetails {
private LocalDateTime timestamp;
private String message;
private String details;

public ErrorDetails(LocalDateTime t,String m,String d){
timestamp=t;message=m;details=d;
}
public LocalDateTime getTimestamp(){return timestamp;}
public String getMessage(){return message;}
public String getDetails(){return details;}
}